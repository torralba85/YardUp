import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeasibilityStudio from "../FeasibilityStudio";
import { AuthProvider } from "@/lib/auth-context";
import { clearInitialParcel, stashInitialParcel } from "@/lib/parcel-handoff";
import { stashAddressQuery } from "@/lib/address-handoff";
import {
  clearCertificatePurchaseIntent,
  hasCertificatePurchaseIntent,
  rememberCertificatePurchaseIntent,
} from "@/lib/certificate-purchase-intent";
import { JOURNEY_STEP_STATE_KEY } from "@/lib/use-journey-history";
import type { ReactNode } from "react";
import { defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "@/lib/feasibility";
import { getDoc } from "firebase/firestore";
import type { AIProjectBrief } from "@/lib/ai-types";
import { buildStudioUrlForCertificate } from "@/lib/purchased-certificates";
import { certificateKey } from "@/lib/certificate-key";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import * as adsConversion from "@/lib/analytics/adsConversion";
import * as gtag from "@/lib/analytics/gtag";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import { defaultPose } from "@/lib/scenario";
import { serializeScenarioParams } from "@/lib/scenario-url";
import { planScopeForLot } from "@/lib/preapproved-plans";

const briefFixture: AIProjectBrief = {
  headline: "Recorded garden studio study", summary: "Saved planning snapshot", bestFit: "Detached ADU",
  risks: [], permitTrack: { name: "Local review", type: "ministerial", basis: "Verify locally" },
  stages: [], totalEstWeeksLow: 4, totalEstWeeksHigh: 8,
  recommendedNextSteps: ["Verify with the city"], disclaimer: "Planning estimate",
};

const entitlement = vi.hoisted(() => ({ purchased: false }));
vi.mock("@/lib/certificate-recovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/certificate-recovery")>();
  return { ...actual, useCertificateRecovery: (options: Parameters<typeof actual.useCertificateRecovery>[0]) => {
    const recovery = actual.useCertificateRecovery(options);
    return entitlement.purchased ? { ...recovery, access: { ...recovery.access, purchased: true } } : recovery;
  } };
});

const savedMocks = vi.hoisted(() => ({ fetch: vi.fn(), remove: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/scenarios-firestore", () => ({
  fetchSavedScenarios: savedMocks.fetch,
  deleteSavedScenario: savedMocks.remove,
  saveSavedScenario: savedMocks.save,
}));

/** The matchMedia stub the mobile-journey tests use to force the mobile layout. */
function stubMobileMatchMedia() {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList)));
}

/**
 * Simulate a browser back/forward press delivering `step`. A real popstate
 * only ever fires after the browser has already moved to the destination
 * entry, so `history.state` must reflect it by the time the event fires —
 * mirrors the `popTo` helper in lib/use-journey-history.test.ts.
 */
function popToJourneyStep(step: string) {
  const state = { [JOURNEY_STEP_STATE_KEY]: step };
  window.history.replaceState(state, "", window.location.href);
  window.dispatchEvent(new PopStateEvent("popstate", { state }));
}

/**
 * Dispatch a popstate carrying an arbitrary raw history-state object (or
 * null), matching real navigation by also stamping window.history.state
 * first. Distinct from popToJourneyStep above: this replays whatever state a
 * real entry actually holds (captured live from window.history.state),
 * rather than constructing a fresh `{ lfJourneyStep: step }` object — needed
 * to test that a third-party history writer preserves (or clobbers) that
 * key, since the point of that test is to observe the entry's real,
 * possibly-null shape rather than assume it.
 */
function popToRawState(state: Record<string, unknown> | null) {
  window.history.replaceState(state, "", window.location.href);
  window.dispatchEvent(new PopStateEvent("popstate", { state }));
}

vi.mock("next/dynamic", () => ({
  default: () => {
    // Expose the dims the scene receives so tests can assert the 3D lot
    // tracks the active parcel (preset, estimated, or live).
    const MockDynamic = (props: {
      parcel?: { address?: string; city?: string; lotWidth: number; lotLength: number };
      scanMode?: boolean;
      splatOnly?: boolean;
      pose?: unknown;
      onScanStatus?: (status: { state: "error"; message: string }) => void;
      onReturnToModel?: () => void;
    }) => {
      if (props.onReturnToModel) {
        return (
          <div
            data-testid="cesium-neighborhood-view"
            data-address={props.parcel?.address}
            data-city={props.parcel?.city}
          >
            cesium neighborhood view
            <button onClick={props.onReturnToModel}>Return to model</button>
          </div>
        );
      }
      return (
        <div
          data-testid="parcel-scene"
          data-lot-width={props.parcel?.lotWidth}
          data-lot-length={props.parcel?.lotLength}
          data-pose={JSON.stringify(props.pose)}
          data-splat-only={props.splatOnly}
        >
          parcel scene placeholder
          {props.scanMode && <button onClick={() => props.onScanStatus?.({ state: "error", message: "Decode failed" })}>Fail scan load</button>}
        </div>
      );
    };
    MockDynamic.displayName = "MockDynamic";
    return MockDynamic;
  },
}));

// Mock Firebase auth for tests
vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
  app: {},
}));
// The email card asks for an App Check token before posting; no reCAPTCHA in jsdom.
vi.mock("@/lib/app-check-token", () => ({ limitedUseAppCheckToken: async () => null }));

// Resolved auth user for the mocked onAuthStateChanged below. Null = guest
// (the default); live-lookup tests sign in, since address searches are gated
// to signed-in users.
const authMocks = vi.hoisted(() => ({
  user: null as null | {
    uid: string;
    email: string;
    displayName: string | null;
    getIdToken: () => Promise<string>;
  },
}));

vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
    Promise.resolve().then(() => cb(authMocks.user));
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: class {},
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

function TestWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

/** The single spine navigation landmark. */
function stepRail() {
  return screen.getByRole("navigation", { name: "Studio steps" });
}

/** A step button in the rail, matched by its label (ignores the sr-only state). */
function stepButton(label: RegExp) {
  return within(stepRail()).getByRole("button", { name: label });
}

describe("FeasibilityStudio (guided spine)", () => {
  beforeEach(() => {
    vi.mocked(getDoc).mockReset();
    savedMocks.fetch.mockReset().mockResolvedValue([]);
    savedMocks.remove.mockReset().mockResolvedValue(undefined);
    savedMocks.save.mockReset();
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearInitialParcel();
    clearCertificatePurchaseIntent();
    authMocks.user = null;
    entitlement.purchased = false;
    // Simulate reduced motion so useCountUp snaps synchronously to its final
    // value, keeping assertions on count-up figures deterministic.
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("offers free capture only after a real parcel is active and restores the saved pose/assumptions", async () => {
    stashInitialParcel(EMAIL_SCENARIO.liveParcel!);
    const initialScenario = { ...EMAIL_SCENARIO, assumptions: { ...EMAIL_SCENARIO.assumptions, softCostMultiplier: 1.4 } };
    window.history.replaceState(null, "", `/studio?layout=${"a".repeat(48)}&utm_source=studio_email`);
    render(<AuthProvider><FeasibilityStudio initialScenario={initialScenario} /></AuthProvider>);
    await screen.findByTestId("parcel-scene");
    expect(screen.getByTestId("parcel-scene")).toHaveAttribute("data-pose", JSON.stringify(initialScenario.pose));
    expect(screen.queryByText("Email this layout for later")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Certificate.*upcoming/i }));
    const disclosure = await screen.findByText("Email this layout for later");
    expect(disclosure.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(disclosure);
    expect(new URLSearchParams(window.location.search).get("layout")).toHaveLength(48);
    fireEvent.change(screen.getByRole("textbox", { name: "Email address for your 3D lot link" }), { target: { value: "owner@example.com" } });
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "Test only" }), { status: 503 }));
    fireEvent.click(screen.getByRole("button", { name: "Email My 3D Link" }));
    // These suites render the whole Studio, which is slow under parallel CI load.
    await waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 5000 });
    const body = JSON.parse(String(fetch.mock.calls.find(([url]) => String(url).includes("email-scenario-link"))![1]!.body));
    expect(body.scenario.assumptions.softCostMultiplier).toBe(1.4);
  });

  it("prefers URL assumptions over initialScenario when explicit URL parameters are present", async () => {
    stashInitialParcel(EMAIL_SCENARIO.liveParcel!);
    const initialScenario = { ...EMAIL_SCENARIO, assumptions: { ...EMAIL_SCENARIO.assumptions, softCostMultiplier: 1.4 } };
    window.history.replaceState(
      null,
      "",
      `/studio?v=2&layout=${"a".repeat(48)}&cost_cedar=350&cost_lap=300&cost_stucco=320&cost_board=310&soft=1.2&opex=0.25&rent=conservative`,
    );
    render(<AuthProvider><FeasibilityStudio initialScenario={initialScenario} /></AuthProvider>);
    await screen.findByTestId("parcel-scene");
    fireEvent.click(screen.getByRole("button", { name: /Certificate.*upcoming/i }));
    fireEvent.click(await screen.findByText("Email this layout for later"));
    fireEvent.change(screen.getByRole("textbox", { name: "Email address for your 3D lot link" }), { target: { value: "owner@example.com" } });
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "Test only" }), { status: 503 }));
    fireEvent.click(screen.getByRole("button", { name: "Email My 3D Link" }));
    // These suites render the whole Studio, which is slow under parallel CI load.
    await waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 5000 });
    const body = JSON.parse(String(fetch.mock.calls.find(([url]) => String(url).includes("email-scenario-link"))![1]!.body));
    expect(body.scenario.assumptions.softCostMultiplier).toBe(1.2);
    expect(body.scenario.assumptions.operatingExpenseRatio).toBe(0.25);
    expect(body.scenario.assumptions.costPerSqft.cedar).toBe(350);
  });

  it("calculates default pose from the live parcel rather than demo parcel when URL pose is absent", async () => {
    stashInitialParcel(EMAIL_SCENARIO.liveParcel!);
    window.history.replaceState(null, "", "/studio");
    render(<AuthProvider><FeasibilityStudio /></AuthProvider>);
    const scene = await screen.findByTestId("parcel-scene");
    const pose = JSON.parse(scene.getAttribute("data-pose")!);
    expect(pose).toBeDefined();
    expect(pose).toEqual(defaultPose(EMAIL_SCENARIO.liveParcel!, defaultAduConfig));
  });

  it("offers free capture on desktop Rules & Fit and mobile Check while withholding it on Design and demo parcels", async () => {
    stashInitialParcel(EMAIL_SCENARIO.liveParcel!);
    window.history.replaceState(null, "", "/studio");
    render(<AuthProvider><FeasibilityStudio /></AuthProvider>);
    await screen.findByTestId("parcel-scene");
    expect(await screen.findByRole("region", { name: "Save your layout link" })).toBeInTheDocument();
    expect(screen.queryByText("Email this layout for later")).toBeNull();

    fireEvent.click(stepButton(/Design/));
    expect(screen.queryByRole("region", { name: "Save your layout link" })).toBeNull();
  });

  it("offers free capture on mobile CheckStep for live parcels", async () => {
    stubMobileMatchMedia();
    stashInitialParcel(EMAIL_SCENARIO.liveParcel!);
    window.history.replaceState(null, "", "/studio");
    render(<AuthProvider><FeasibilityStudio /></AuthProvider>);
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Check feasibility/i }));
    expect(await screen.findByRole("region", { name: "Save your layout link" })).toBeInTheDocument();
  });

  it("does not offer email capture for a demo parcel", async () => {
    render(<AuthProvider><FeasibilityStudio /></AuthProvider>);
    await screen.findByTestId("parcel-scene");
    expect(screen.queryByRole("region", { name: "Save your layout link" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Certificate.*upcoming/i }));
    await screen.findByRole("heading", { name: "Your Certificate of Feasibility." });
    expect(screen.queryByText("Email this layout for later")).toBeNull();
    expect(screen.queryByRole("button", { name: "Email My 3D Link" })).toBeNull();
  });

  it("uses a plan's real footprint, keeps placement and style, shares, saves and clears it on lot change", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    savedMocks.save.mockImplementation(async (_uid, entry) => ({ ...entry, id: "new", createdAt: "2026-11-06T00:00:00Z" }));
    window.history.replaceState(null, "", "/studio?parcel=coyote-brush");
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    fireEvent.click(screen.getByText("Pre-approved plans", { exact: true }));
    const before = new URLSearchParams(window.location.search);
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm San Diego, CA/ }));
    const trackEventSpy = vi.spyOn(gtag, "trackEvent");
    fireEvent.click(within(screen.getByRole("article", { name: "County Standard Plan F" })).getByRole("button", { name: "Use this plan" }));
    expect(screen.getByRole("region", { name: "Selected plan reference" })).toHaveTextContent("County Standard Plan F");
    // Funnel step "official-plan selection": once per explicit use, demo lots labelled as such, no address.
    const planEvents = trackEventSpy.mock.calls.filter(([name]) => name === "preapproved_plan_selected");
    expect(planEvents).toEqual([["preapproved_plan_selected", {
      jurisdiction_id: "ca-san-diego",
      plan_id: "san-diego-city-plan-f",
      parcel_mode: "preset",
      placement_outcome: expect.stringMatching(/^(kept|moved|none)$/),
      auth_state: "signed_in",
    }]]);
    trackEventSpy.mockRestore();
    const after = new URLSearchParams(window.location.search);
    for (const key of ["h", "x", "z", "rotation", "roof", "finish"]) expect(after.get(key)).toBe(before.get(key));
    expect([after.get("w"), after.get("l"), after.get("plan")]).toEqual(["21", "28.58", "san-diego-city-plan-f"]);
    fireEvent.click(screen.getByRole("button", { name: "Save this design" }));
    await waitFor(() => expect(savedMocks.save).toHaveBeenCalled());
    expect(savedMocks.save.mock.calls[0][1].preapprovedPlan).toEqual({ planId: "san-diego-city-plan-f", jurisdictionId: "ca-san-diego" });
    fireEvent.click(stepButton(/Your Lot/));
    fireEvent.change(screen.getByLabelText("Sample Property"), { target: { value: "corner-lot" } });
    fireEvent.click(stepButton(/Design/));
    expect(screen.queryByRole("region", { name: "Selected plan reference" })).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has("plan")).toBe(false);
  });

  it.each(["same", "different"])("restores a checkout return to the %s lot with the correct plan scope", async (destination) => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    savedMocks.save.mockImplementation(async (_uid, entry) => ({ ...entry, id: "new", createdAt: "2026-11-06T00:00:00Z" }));
    const originalLot = getParcelById("coyote-brush");
    const targetLot = destination === "same" ? originalLot : getParcelById("oak-street");
    const plan = { planId: "san-diego-city-plan-f", jurisdictionId: "ca-san-diego" };
    const query = new URLSearchParams(serializeScenarioParams({
      parcelId: originalLot.id, config: defaultAduConfig, assumptions: defaultFinancialAssumptions,
      preapprovedPlan: plan, preapprovedPlanScope: planScopeForLot(originalLot, "preset"),
    }));
    query.set("cert", certificateKey(targetLot));
    window.history.replaceState(null, "", `/studio?${query}`);
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByRole("heading", { name: "Your Certificate of Feasibility." });
    fireEvent.click(stepButton(/Design/));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("parcel")).toBe(targetLot.id);
    if (destination === "same") {
      expect(screen.getByRole("region", { name: "Selected plan reference" })).toHaveTextContent("County Standard Plan F");
      expect(params.get("plan")).toBe(plan.planId);
      expect(params.get("planScope")).toBe(planScopeForLot(targetLot, "preset"));
    } else {
      expect(screen.queryByRole("region", { name: "Selected plan reference" })).not.toBeInTheDocument();
      expect(params.has("plan")).toBe(false);
    }
    fireEvent.click(screen.getByRole("button", { name: "Save this design" }));
    await waitFor(() => expect(savedMocks.save).toHaveBeenCalled());
    expect(savedMocks.save.mock.calls[0][1].preapprovedPlan).toEqual(destination === "same" ? plan : undefined);
  });

  it("gives the model a rectangular plan's footprint, reports the fit and undoes only the size", async () => {
    window.history.replaceState(null, "", "/studio?parcel=coyote-brush");
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    fireEvent.click(screen.getByText("Pre-approved plans", { exact: true }));
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm San Diego, CA/ }));
    fireEvent.click(within(screen.getByRole("article", { name: "County Standard Plan A" })).getByRole("button", { name: "Use this plan" }));
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(summary).toHaveTextContent("3D model uses this plan's footprint: 30′-0″ × 40′-0″ (1,200 sq ft).");
    expect(within(summary).getByText(/at this placement|closer look|estimated model/)).toBeInTheDocument();
    let params = new URLSearchParams(window.location.search);
    expect([params.get("w"), params.get("l"), params.get("size"), params.get("plan")]).toEqual(["30", "40", "1200", "san-diego-city-plan-a"]);
    fireEvent.click(within(summary).getByRole("button", { name: "Undo plan change" }));
    params = new URLSearchParams(window.location.search);
    expect([params.get("w"), params.get("l"), params.get("plan")]).toEqual(["20", "30", "san-diego-city-plan-a"]);
    expect(summary).toHaveTextContent("Your 3D model is 20 × 30 ft, 600 sq ft; this plan is 30′-0″ × 40′-0″.");
    fireEvent.click(within(summary).getByRole("button", { name: "Use the plan's footprint" }));
    expect(new URLSearchParams(window.location.search).get("size")).toBe("1200");
  });

  it("moves a plan that no longer fits its old spot to one where it fits, and undo puts the old model back", async () => {
    window.history.replaceState(null, "", "/studio?parcel=coyote-brush");
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    const before = new URLSearchParams(window.location.search);
    fireEvent.click(screen.getByText("Pre-approved plans", { exact: true }));
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm San Diego, CA/ }));
    fireEvent.click(within(screen.getByRole("article", { name: "County Standard Plan A" })).getByRole("button", { name: "Use this plan" }));
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(within(summary).getByRole("status")).toHaveTextContent("Moved to a spot on this lot where it fits the modeled setbacks.");
    expect(summary).toHaveTextContent("Fits at this placement");
    expect(within(summary).queryByRole("button", { name: "Snap to fit" })).not.toBeInTheDocument();
    const moved = new URLSearchParams(window.location.search);
    expect([moved.get("x"), moved.get("z"), moved.get("rotation")]).not.toEqual([before.get("x"), before.get("z"), before.get("rotation")]);
    fireEvent.click(within(summary).getByRole("button", { name: "Undo plan change" }));
    const undone = new URLSearchParams(window.location.search);
    for (const key of ["w", "l", "x", "z", "rotation"]) expect(undone.get(key)).toBe(before.get(key));
  });

  it("defaults an L-shaped plan to a usable rectangle and checks its full outline", async () => {
    window.history.replaceState(null, "", "/studio?parcel=coyote-brush");
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    fireEvent.click(screen.getByText("Pre-approved plans", { exact: true }));
    fireEvent.click(screen.getByRole("checkbox", { name: /confirm San Diego, CA/ }));
    fireEvent.click(within(screen.getByRole("article", { name: "County Standard Plan E" })).getByRole("button", { name: "Use this plan" }));
    const summary = screen.getByRole("region", { name: "Selected plan reference" });
    expect(summary).toHaveTextContent("3D model uses a usable 25′-0″ × 32′-0″ rectangle with this plan's depth and floor area (800 sq ft).");
    expect(summary).toHaveTextContent("Full outer outline, 25′-0″ × 42′-2″:");
    const params = new URLSearchParams(window.location.search);
    expect([params.get("w"), params.get("l"), params.get("size")]).toEqual(["25", "32", "800"]);
  });

  it("restores plan references from a study and clears them when loading an older study on the same lot", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    const base = { createdAt: "2026-11-06T00:00:00Z", parcelId: "coyote-brush", config: defaultAduConfig, assumptions: defaultFinancialAssumptions };
    savedMocks.fetch.mockResolvedValueOnce([
      { ...base, id: "with-plan", name: "Plan study", preapprovedPlan: { planId: "san-diego-city-plan-f", jurisdictionId: "ca-san-diego" } },
      { ...base, id: "legacy", name: "Legacy study" },
    ]);
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByText("Saved Concepts", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /Saved Concepts/ }));
    fireEvent.click(screen.getByRole("button", { name: "Plan study" }));
    fireEvent.click(stepButton(/Design/));
    expect(screen.getByRole("region", { name: "Selected plan reference" })).toHaveTextContent("County Standard Plan F");
    fireEvent.click(screen.getByRole("button", { name: "Legacy study" }));
    expect(screen.queryByRole("region", { name: "Selected plan reference" })).not.toBeInTheDocument();
  });

  it("does not restore a live-lot plan onto the demo lot encoded in a copied URL", async () => {
    const initial = { ...EMAIL_SCENARIO, preapprovedPlan: { planId: "san-diego-city-plan-f", jurisdictionId: "ca-san-diego" } };
    stashInitialParcel(initial.liveParcel!);
    const first = render(<FeasibilityStudio initialScenario={initial} />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    expect(screen.getByRole("region", { name: "Selected plan reference" })).toBeInTheDocument();
    const query = window.location.search;
    first.unmount();
    clearInitialParcel();
    window.history.replaceState(null, "", `/studio${query}`);
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    expect(screen.queryByRole("region", { name: "Selected plan reference" })).not.toBeInTheDocument();
  });

  it("keeps a removed plan removed when reopening an emailed snapshot with its updated URL", async () => {
    const initial = { id: "shared", name: "Shared study", createdAt: "2026-11-06T00:00:00Z", parcelId: "coyote-brush", config: defaultAduConfig, assumptions: defaultFinancialAssumptions, preapprovedPlan: { planId: "san-diego-city-plan-f", jurisdictionId: "ca-san-diego" } };
    const first = render(<FeasibilityStudio initialScenario={initial} />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    fireEvent.click(screen.getByRole("button", { name: "Remove plan" }));
    const query = window.location.search;
    first.unmount();
    window.history.replaceState(null, "", `/studio${query}`);
    render(<FeasibilityStudio initialScenario={initial} />, { wrapper: TestWrapper });
    await screen.findByTestId("parcel-scene");
    fireEvent.click(stepButton(/Design/));
    expect(screen.queryByRole("region", { name: "Selected plan reference" })).not.toBeInTheDocument();
  });

  it("shows the shared plan reference on mobile Shape", async () => {
    stubMobileMatchMedia();
    window.history.replaceState(null, "", "/studio?parcel=coyote-brush");
    const initial = { id: "shared", name: "Shared study", createdAt: "2026-11-06T00:00:00Z", parcelId: "coyote-brush", config: defaultAduConfig, assumptions: defaultFinancialAssumptions, preapprovedPlan: { planId: "san-diego-city-plan-f", jurisdictionId: "ca-san-diego" } };
    render(<FeasibilityStudio demoChosen initialScenario={initial} />, { wrapper: TestWrapper });
    fireEvent.click(await screen.findByRole("button", { name: "Shape your ADU" }));
    expect(screen.getByRole("region", { name: "Selected plan reference" })).toHaveTextContent("County Standard Plan F");
  });

  it("preserves saved concepts on cancel and deletes only after confirmation", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    savedMocks.fetch.mockResolvedValueOnce([{
      id: "saved-1", name: "Garden home", createdAt: "2026-09-13T00:00:00Z",
      parcelId: "oak-street", config: defaultAduConfig, assumptions: defaultFinancialAssumptions,
    }]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    // Wait for the async auth/scenario state before scanning the large Studio DOM by role.
    await waitFor(() => expect(savedMocks.fetch).toHaveBeenCalledWith("owner-1"), { timeout: 10000 });
    await screen.findByText("Saved Concepts", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /Saved Concepts/ }));
    const remove = screen.getByRole("button", { name: "Delete saved concept Garden home" });
    fireEvent.click(remove);
    expect(savedMocks.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Garden home" })).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(remove);
    await waitFor(() => expect(savedMocks.remove).toHaveBeenCalledWith("owner-1", "saved-1"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Garden home" })).not.toBeInTheDocument());
  });

  it("shows the saved Brief when its Scenario is reopened without generating a new one", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "owner-1", role: "homeowner" }),
    } as never);
    savedMocks.fetch.mockResolvedValueOnce([{
      id: "saved-brief", name: "Saved study", createdAt: "2026-09-13T00:00:00Z",
      parcelId: "oak-street", config: defaultAduConfig, assumptions: defaultFinancialAssumptions,
      projectBrief: briefFixture,
    }]);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByText("Saved Concepts", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /Saved Concepts/ }));
    fireEvent.click(screen.getByRole("button", { name: "Saved study" }));
    fireEvent.click(stepButton(/Certificate/));

    expect(await screen.findByText("Recorded garden studio study")).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes("/api/ai/project-brief"))).toBe(false);
  });

  it("does not attach a previous Scenario's matched image when saving a Scenario without one", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner-1", role: "homeowner" }) } as never);
    const base = { createdAt: "2026-09-13T00:00:00Z", parcelId: "oak-street", config: defaultAduConfig, assumptions: defaultFinancialAssumptions };
    savedMocks.fetch.mockResolvedValueOnce([
      { ...base, id: "a", name: "Matched study", projectBrief: briefFixture, styleMatchConcept: { styleName: "Modern", matchPercentage: 90, traits: [], conceptUrl: "https://example.test/old-concept.webp" } },
      { ...base, id: "b", name: "Plain study" },
    ]);
    savedMocks.save.mockImplementation(async (_uid, entry) => ({ ...entry, id: "new", createdAt: base.createdAt }));
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await screen.findByText("Saved Concepts", {}, { timeout: 10000 });
    fireEvent.click(screen.getByRole("button", { name: /Saved Concepts/ }));
    fireEvent.click(screen.getByRole("button", { name: "Matched study" }));
    fireEvent.click(screen.getByRole("button", { name: "Plain study" }));
    fireEvent.click(stepButton(/Design/));
    fireEvent.click(screen.getByRole("button", { name: "Save this design" }));
    await waitFor(() => expect(savedMocks.save).toHaveBeenCalled());
    expect(savedMocks.save.mock.calls[0][1]).not.toHaveProperty("styleMatchConcept");
    expect(savedMocks.save.mock.calls[0][1]).not.toHaveProperty("projectBrief");
  });

  it("finishes a generated Brief instead of leaving its loading state stuck", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner-1", role: "homeowner" }) } as never);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ tier: "full", brief: briefFixture }), { status: 200 }));
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    fireEvent.click(stepButton(/Certificate/));
    fireEvent.click(await screen.findByRole("button", { name: "View complete certificate" }, { timeout: 10000 }));
    expect((await screen.findAllByText(briefFixture.headline)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Adding property notes and timeline")).not.toBeInTheDocument();
  });

  it("finishes a failed Brief request and shows its error with the deterministic Report", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner-1", role: "homeowner" }) } as never);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Brief temporarily unavailable" }), { status: 503 }));
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    fireEvent.click(stepButton(/Certificate/));
    fireEvent.click(await screen.findByRole("button", { name: "View complete certificate" }, { timeout: 10000 }));
    expect((await screen.findAllByText(/Brief temporarily unavailable/)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Adding property notes and timeline")).not.toBeInTheDocument();
  });

  it("keeps a restored Saved Brief when an older generation request resolves afterward", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => ({ uid: "owner-1", role: "homeowner" }) } as never);
    savedMocks.fetch.mockResolvedValueOnce([{
      id: "saved-brief", name: "Saved study", createdAt: "2026-09-13T00:00:00Z",
      parcelId: "oak-street", config: defaultAduConfig, assumptions: defaultFinancialAssumptions,
      projectBrief: briefFixture,
    }]);
    let finish!: (response: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    fireEvent.click(stepButton(/Certificate/));
    fireEvent.click(await screen.findByRole("button", { name: "View complete certificate" }, { timeout: 10000 }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Saved Concepts/ }));
    fireEvent.click(screen.getByRole("button", { name: "Saved study" }));
    await act(async () => {
      finish(new Response(JSON.stringify({ tier: "full", brief: { ...briefFixture, headline: "Late outdated generation" } }), { status: 200 }));
    });
    expect((await screen.findAllByText(briefFixture.headline)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Late outdated generation")).not.toBeInTheDocument();
  });

  it("presents a single spine navigation with the Rules & Fit step active", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Exactly one navigation model — the spine. The old tab strip is gone.
    expect(stepRail()).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    expect(stepButton(/Rules & Fit/)).toHaveAttribute("aria-current", "step");
    expect(screen.getByLabelText("Search property address")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Free property preview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Numbers & readiness" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Readiness:/)).not.toBeInTheDocument();
  });

  it("renders the searched live parcel's dimensions in the 3D scene", async () => {
    // Reproduces the demo-lot bug: after a live address search the 3D lot must
    // re-proportion to the fetched parcel, not keep the oak-street 40 × 125.
    // Live lookups are signed-in only, so resolve an authenticated user.
    authMocks.user = {
      uid: "owner-1",
      email: "owner@example.com",
      displayName: "Owner",
      getIdToken: async () => "token",
    };
    const liveParcel = {
      address: "141 N Almaden Ave",
      city: "San Jose, CA 95110",
      lotArea: 7436,
      lotWidth: 52,
      lotLength: 143,
      existingHouseSqft: 1210,
      maxLotCoveragePercent: 40,
      setbacks: { front: 20, rear: 20, side: 5 },
      zoning: "R-1",
      boundaryGeoJson: null,
      lat: 37.3337,
      lng: -121.8907,
      source: "regrid",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/geocode")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              lat: liveParcel.lat,
              lng: liveParcel.lng,
              formattedAddress: "141 N Almaden Ave, San Jose, CA 95110",
            }),
          };
        }
        if (url.includes("/api/parcel")) {
          return { ok: true, status: 200, json: async () => liveParcel };
        }
        // Debounced address autocomplete may fire mid-test; keep it empty.
        return { ok: true, status: 200, json: async () => ({ suggestions: [] }) };
      }),
    );

    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // The demo preset renders first (oak-street, 40 ft wide).
    expect(screen.getByTestId("parcel-scene")).toHaveAttribute("data-lot-width", "40");

    await user.click(stepButton(/Your Lot/));
    const search = screen.getByRole("search");
    await user.type(
      within(search).getByLabelText("Search property address"),
      "141 N Almaden Ave, San Jose, CA",
    );
    await user.click(within(search).getByRole("button", { name: /Search/ }));

    await waitFor(() => {
      expect(screen.getByTestId("parcel-scene")).toHaveAttribute("data-lot-width", "52");
    });
    expect(screen.getByTestId("parcel-scene")).toHaveAttribute("data-lot-length", "143");
    expect(screen.getByText("If built").parentElement).toHaveTextContent("/mo");
  });

  it("keeps the parcel view switch inside the scene and changes views explicitly", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    const viewport = screen.getByTestId("scene-viewport");
    const viewControl = within(viewport).getByRole("radiogroup", { name: "Parcel view" });
    const modelButton = within(viewControl).getByRole("radio", { name: "3D model" });
    const aerialButton = within(viewControl).getByRole("radio", { name: "Aerial" });

    // The switch is docked above the scene rather than floating over it: the
    // audit measured phone overlays covering 40.4% of the viewport (U3), so
    // this control now takes layout space instead of obscuring the model.
    expect(viewControl).not.toHaveClass("absolute");
    expect(viewControl).toHaveClass("pointer-events-auto", "shrink-0", "border-b");
    expect(viewport.firstElementChild).toBe(viewControl);
    const scanButton = within(viewControl).getByRole("radio", { name: /scan/i });
    const neighborhoodButton = within(viewControl).getByRole("radio", { name: "Neighborhood" });
    expect(modelButton).toHaveAttribute("aria-checked", "true");
    expect(scanButton).toHaveAttribute("aria-checked", "false");
    expect(neighborhoodButton).toHaveAttribute("aria-checked", "false");
    expect(aerialButton).toHaveAttribute("aria-checked", "false");

    await user.click(scanButton);

    expect(modelButton).toHaveAttribute("aria-checked", "false");
    expect(scanButton).toHaveAttribute("aria-checked", "true");
    // Calibration is an internal tool: public visitors (including the landing's
    // "try an example" demo) must never see its trigger.
    expect(screen.queryByRole("button", { name: /calibrate scan/i })).not.toBeInTheDocument();

    await user.click(neighborhoodButton);

    expect(modelButton).toHaveAttribute("aria-checked", "false");
    expect(scanButton).toHaveAttribute("aria-checked", "false");
    expect(neighborhoodButton).toHaveAttribute("aria-checked", "true");
    expect(aerialButton).toHaveAttribute("aria-checked", "false");

    await user.click(aerialButton);

    expect(modelButton).toHaveAttribute("aria-checked", "false");
    expect(scanButton).toHaveAttribute("aria-checked", "false");
    expect(neighborhoodButton).toHaveAttribute("aria-checked", "false");
    expect(aerialButton).toHaveAttribute("aria-checked", "true");
    expect(
      within(viewport).getByText(/Aerial view requires a real address/i),
    ).toBeInTheDocument();
  });

  it("does not render the scan view button for parcels without a registered scan", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Your Lot/));
    await user.click(screen.getByText(/Try a sample property/i));
    const sampleSelect = screen.getByLabelText("Sample Property");
    await user.selectOptions(sampleSelect, "corner-lot");

    const viewport = screen.getByTestId("scene-viewport");
    const viewControl = within(viewport).getByRole("radiogroup", { name: "Parcel view" });
    expect(within(viewControl).queryByRole("radio", { name: /scan/i })).not.toBeInTheDocument();
  });

  describe("with internal scan calibration enabled", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_SCAN_CALIBRATION", "true");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("recovers from a scan failure without losing the ADU pose or hiding the model", async () => {
      const user = userEvent.setup();
      render(<FeasibilityStudio />, { wrapper: TestWrapper });
      const pose = screen.getByTestId("parcel-scene").getAttribute("data-pose");
      await user.click(screen.getByRole("radio", { name: /^Scan/ }));
      expect(screen.getByText(/not a capture of this property/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Calibrate Scan" }));
      await user.click(screen.getByRole("button", { name: "Splat-Only Inspection" }));
      await user.click(screen.getByRole("button", { name: "Close calibration panel" }));
      await user.click(screen.getByRole("button", { name: "Fail scan load" }));
      expect(screen.getByText(/Scan unavailable/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Return to 3D model" }));
      expect(screen.getByTestId("parcel-scene")).toHaveAttribute("data-pose", pose);
      expect(screen.getByTestId("parcel-scene")).toHaveAttribute("data-splat-only", "false");
    });

    it("moves view selection by keyboard and restores focus after calibration", async () => {
      const user = userEvent.setup();
      render(<FeasibilityStudio />, { wrapper: TestWrapper });
      screen.getByRole("radio", { name: "3D model" }).focus();
      await user.keyboard("{ArrowRight}");
      expect(screen.getByRole("radio", { name: /^Scan/ })).toHaveFocus();
      await user.click(screen.getByRole("button", { name: "Calibrate Scan" }));
      expect(screen.getByRole("button", { name: "Close calibration panel" })).toHaveFocus();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.getByRole("button", { name: "Calibrate Scan" })).toHaveFocus());
    });
  });

  describe("real-address flow and neighborhood view fallback prevention", () => {
    it("clears a failed mobile lookup when revealing an already-selected example", async () => {
      stubMobileMatchMedia();
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));
      window.history.replaceState(null, "", "/studio?parcel=oak-street");
      stashAddressQuery("250 Hamilton Avenue, Palo Alto, CA");
      render(<FeasibilityStudio />, { wrapper: TestWrapper });

      await screen.findByText(/We couldn't find that address/);
      await user.click(screen.getByRole("button", { name: "See the Seattle example" }));
      expect(screen.getByTestId("demo-mode-banner")).toHaveTextContent("Demo Mode: Seattle");
      expect(screen.getByRole("region", { name: "What your backyard could earn" })).toBeInTheDocument();
    });

    it("withholds a previous live result when a different address fails", async () => {
      const user = userEvent.setup();
      stashInitialParcel(SAMPLE_LIVE_PARCEL);
      render(<FeasibilityStudio />, { wrapper: TestWrapper });
      expect(screen.getByRole("region", { name: "Free property preview" })).toBeInTheDocument();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 404 }));

      const search = screen.getByRole("search");
      await user.type(within(search).getByLabelText("Search property address"), "250 Hamilton Avenue, Palo Alto, CA");
      await user.click(within(search).getByRole("button", { name: /Search/ }));

      await screen.findByTestId("property-lookup-error");
      expect(screen.getByText("250 Hamilton Avenue")).toBeInTheDocument();
      expect(screen.queryByText(SAMPLE_LIVE_PARCEL.address)).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Free property preview" })).not.toBeInTheDocument();
    });

    it.each(["desktop", "mobile"])("hides demo results after a parcel failure and restores live results on retry (%s)", async (layout) => {
      if (layout === "mobile") stubMobileMatchMedia();
      const user = userEvent.setup();
      let failParcel = true;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        if (String(input).includes("/api/geocode")) {
          return new Response(JSON.stringify({
            lat: SAMPLE_LIVE_PARCEL.lat,
            lng: SAMPLE_LIVE_PARCEL.lng,
            formattedAddress: `${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`,
          }), { status: 200 });
        }
        return failParcel
          ? new Response("{}", { status: 502 })
          : new Response(JSON.stringify(SAMPLE_LIVE_PARCEL), { status: 200 });
      });
      stashAddressQuery(`${SAMPLE_LIVE_PARCEL.address}, ${SAMPLE_LIVE_PARCEL.city}`);
      render(<FeasibilityStudio demoChosen />, { wrapper: TestWrapper });

      await waitFor(() => expect(screen.getAllByText(/Parcel data is unavailable/).length).toBeGreaterThan(0));
      expect(screen.queryByTestId("demo-mode-banner")).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Free property preview" })).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "What your backyard could earn" })).not.toBeInTheDocument();
      expect(screen.queryByText("1234 Oak Street")).not.toBeInTheDocument();
      expect(screen.queryByText(/Demo mode will be used/)).not.toBeInTheDocument();

      failParcel = false;
      await user.click(screen.getByRole("button", { name: "Retry lookup" }));
      await waitFor(() => expect(screen.queryByTestId("property-lookup-error")).not.toBeInTheDocument());
      expect(screen.queryByTestId("demo-mode-banner")).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: layout === "mobile" ? "What your backyard could earn" : "Free property preview" })).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(SAMPLE_LIVE_PARCEL.address)).length).toBeGreaterThan(0);
    });

    it("renders loading state in 3D scene and prevents mounting demo in Neighborhood view while address is pending", async () => {
      const user = userEvent.setup();
      const pendingFetch = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}) as unknown as Promise<Response>);

      stashAddressQuery("250 Hamilton Avenue, Palo Alto, CA 94301");
      render(<FeasibilityStudio />, { wrapper: TestWrapper });

      // Shell / address header should show target address and loading status, not 1234 Oak Street
      expect(screen.getByText("250 Hamilton Avenue")).toBeInTheDocument();
      expect(screen.getByText(/Palo Alto, CA 94301 · Looking up…/)).toBeInTheDocument();
      expect(screen.queryByText("1234 Oak Street")).not.toBeInTheDocument();

      // In 3D model view, property loading is rendered instead of parcel scene with demo
      expect(screen.getByTestId("property-loading")).toBeInTheDocument();
      expect(screen.queryByTestId("parcel-scene")).not.toBeInTheDocument();
      expect(screen.queryByTestId("demo-mode-banner")).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Free property preview" })).not.toBeInTheDocument();

      // Click Neighborhood view
      const viewport = screen.getByTestId("scene-viewport");
      const neighborhoodRadio = within(viewport).getByRole("radio", { name: "Neighborhood" });
      await user.click(neighborhoodRadio);

      // Neighborhood view renders loading placeholder and NOT Cesium with demo
      expect(screen.getByTestId("neighborhood-loading")).toBeInTheDocument();
      expect(screen.getByText(/Loading property for Neighborhood 3D…/)).toBeInTheDocument();
      expect(screen.getByText(/Looking up satellite and 3D imagery for 250 Hamilton Avenue/)).toBeInTheDocument();
      expect(screen.queryByTestId("cesium-neighborhood-view")).not.toBeInTheDocument();

      // Can return to 3D model via button
      await user.click(screen.getByRole("button", { name: "Return to 3D model" }));
      expect(screen.getByTestId("property-loading")).toBeInTheDocument();

      pendingFetch.mockRestore();
    });

    it("renders error state when lookup fails and offers retry or exploring demo", async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ error: "Could not reach the parcel service. Check your connection and try again." }), { status: 502 }),
      );

      stashAddressQuery("250 Hamilton Avenue, Palo Alto, CA 94301");
      render(<FeasibilityStudio />, { wrapper: TestWrapper });

      // Wait for error state to appear
      await screen.findByTestId("property-lookup-error");
      expect(screen.getByText("Could not load property data")).toBeInTheDocument();
      expect(screen.queryByText("1234 Oak Street")).not.toBeInTheDocument();

      // Switch to Neighborhood view
      const viewport = screen.getByTestId("scene-viewport");
      const neighborhoodRadio = within(viewport).getByRole("radio", { name: "Neighborhood" });
      await user.click(neighborhoodRadio);

      // Shows neighborhood lookup error with retry button, never demo
      expect(screen.getByTestId("neighborhood-lookup-error")).toBeInTheDocument();
      expect(screen.getByText("Could not load neighborhood view")).toBeInTheDocument();
      expect(screen.queryByTestId("cesium-neighborhood-view")).not.toBeInTheDocument();

      // Return to 3D model
      await user.click(screen.getByRole("button", { name: "Return to 3D model" }));
      expect(screen.getByTestId("property-lookup-error")).toBeInTheDocument();

      // User can choose to explore demo lot instead
      await user.click(screen.getByRole("button", { name: "Explore demo lot" }));
      expect(screen.getByTestId("parcel-scene")).toBeInTheDocument();
      expect(screen.getByText("1234 Oak Street")).toBeInTheDocument();
      expect(screen.getByTestId("demo-mode-banner")).toHaveTextContent("Demo Mode: Seattle");
      expect(screen.getByRole("region", { name: "Free property preview" })).toBeInTheDocument();

      // Now Neighborhood view works for the demo lot
      await user.click(within(screen.getByTestId("scene-viewport")).getByRole("radio", { name: "Neighborhood" }));
      expect(screen.getByTestId("cesium-neighborhood-view")).toBeInTheDocument();
      expect(screen.getByTestId("cesium-neighborhood-view")).toHaveAttribute("data-address", "1234 Oak Street");

      fetchSpy.mockRestore();
    });

    it("mounts CesiumNeighborhoodView with live parcel coordinates and retains it across view switches", async () => {
      const user = userEvent.setup();
      stashInitialParcel(SAMPLE_LIVE_PARCEL);
      render(<FeasibilityStudio />, { wrapper: TestWrapper });

      // Header shows live address
      expect(screen.getByText(SAMPLE_LIVE_PARCEL.address)).toBeInTheDocument();
      expect(screen.queryByText("1234 Oak Street")).not.toBeInTheDocument();

      // 3D scene renders with live parcel dims
      const scene = screen.getByTestId("parcel-scene");
      expect(scene).toHaveAttribute("data-lot-width", String(SAMPLE_LIVE_PARCEL.lotWidth));

      // Switch to Neighborhood
      const viewport = screen.getByTestId("scene-viewport");
      const neighborhoodRadio = within(viewport).getByRole("radio", { name: "Neighborhood" });
      await user.click(neighborhoodRadio);

      // Renders Cesium with live parcel data
      const cesium = screen.getByTestId("cesium-neighborhood-view");
      expect(cesium).toBeInTheDocument();
      expect(cesium).toHaveAttribute("data-address", SAMPLE_LIVE_PARCEL.address);
      expect(cesium).toHaveAttribute("data-city", SAMPLE_LIVE_PARCEL.city);

      // Return to model via Cesium callback
      await user.click(screen.getByRole("button", { name: "Return to model" }));
      expect(screen.getByTestId("parcel-scene")).toBeInTheDocument();
      expect(screen.getByText(SAMPLE_LIVE_PARCEL.address)).toBeInTheDocument();

      // Switch back to Neighborhood
      await user.click(within(screen.getByTestId("scene-viewport")).getByRole("radio", { name: "Neighborhood" }));
      expect(screen.getByTestId("cesium-neighborhood-view")).toHaveAttribute("data-address", SAMPLE_LIVE_PARCEL.address);
      expect(screen.queryByText("1234 Oak Street")).not.toBeInTheDocument();
    });
  });

  it("marks only the certificate step with the revenue $", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    // Builders is free to the homeowner, so only the certificate carries the "$".
    expect(within(stepRail()).getAllByText("$")).toHaveLength(1);
    expect(within(stepButton(/Certificate/)).getByText("$")).toBeInTheDocument();
  });

  it("folds the local permit guide into the Rules & Fit step", () => {
    entitlement.purchased = true; // The complete workspace requires a property grant.
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: /Seattle ADU Starter Guide/i }),
    ).toBeInTheDocument();
  });

  it("offers one AI action for the parcel interpretation and approval timeline", () => {
    entitlement.purchased = true; // The complete workspace requires a property grant.
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    const brief = screen.getByRole("region", { name: "Property notes and timeline" });
    expect(
      within(brief).getByRole("button", { name: "Generate property notes and timeline" }),
    ).toBeInTheDocument();
    expect(within(brief).getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByText("Translate the parcel data")).not.toBeInTheDocument();
    expect(screen.queryByText("Map the approval timeline")).not.toBeInTheDocument();
  });

  it("walks the mobile five-reveal journey from find to act", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)));
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Reveal 1 · Find — the journey shell replaces the old sheet composition.
    expect(screen.getByTestId("mobile-journey")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Journey progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start with your address." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /See a San Diego example/i }));

    // Reveal 2 · Earn — the money payoff with a confidence teaser.
    expect(
      await screen.findByRole("heading", { name: /Your backyard could earn/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("earn-confidence")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Shape your ADU/i }));

    // Reveal 3 · Shape — broad size/style choices only, one primary CTA.
    const sizeGroup = await screen.findByRole("radiogroup", { name: "ADU size" });
    fireEvent.click(within(sizeGroup).getByRole("radio", { name: /2 Bedroom/i }));
    fireEvent.click(screen.getByRole("button", { name: /Check feasibility/i }));

    // Reveal 4 · Check — plain-language verdict before any permit detail.
    expect(await screen.findByText(/What’s behind your rental potential/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /See what’s behind the numbers/i }));

    // Reveal 5 · Act — the completion artifact plus the two next actions.
    expect(
      await screen.findByRole("heading", { name: /Your feasibility study is ready/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Connect with matched builders/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save scenario/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share link/i })).toBeInTheDocument();
  });

  it("opens the fine-tune drawer from the Shape reveal", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)));
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    fireEvent.click(screen.getByRole("button", { name: /See a San Diego example/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Fine-tune dimensions & assumptions/i }),
    );

    const drawer = await screen.findByTestId("fine-tune-drawer");
    // The advanced inspector is progressive disclosure, never the default path.
    expect(
      within(drawer).getByRole("heading", { name: "Design your ADU", hidden: true }),
    ).toBeInTheDocument();
  });

  it("exposes massing controls on the Design step", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Design/));

    expect(screen.queryByRole("combobox", { name: "Sample Property" })).not.toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "ADU footprint size" })).toBeVisible();
    expect(screen.queryByText("Build Cost Range")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Numbers & readiness" })).not.toBeInTheDocument();
  });

  it("flags review needed when selecting a 1,000 sf concept on the compact preset", async () => {
    entitlement.purchased = true; // The complete workspace requires a property grant.
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Your Lot/));
    await user.click(screen.getByText("Try a sample property"));
    await user.selectOptions(screen.getByLabelText("Sample Property"), "compact-lot");
    await user.click(stepButton(/Design/));

    const sizeGroup = screen.getByRole("radiogroup", { name: /ADU footprint size/i });
    await user.click(within(sizeGroup).getByRole("radio", { name: "1,000 sf" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Review needed/i);
  });

  it("updates the rental estimate when switching the basis to Market", async () => {
    entitlement.purchased = true; // The complete workspace requires a property grant.
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Rent basis lives on the Feasibility step as an accessible radiogroup.
    const rentGroup = screen.getByRole("radiogroup", { name: /Rent estimate basis/i });
    await user.click(within(rentGroup).getByRole("radio", { name: "Market" }));

    const monthlyRentSection = screen.getByText("Monthly Rent").parentElement;
    expect(monthlyRentSection).toHaveTextContent("$2,350");
  });

  it("paywalls the complete certificate behind a purchase (guest sees the checkout CTA)", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Certificate/));

    expect(screen.getByRole("region", { name: "Free property preview" })).toBeInTheDocument();
    expect(screen.getByText("Financed cash flow locked in the certificate")).toBeInTheDocument();

    // A guest sees the price on the purchase CTA (the account step comes
    // after), and the paid report does not open.
    await user.click(
      screen.getByRole("button", { name: /Continue to secure checkout — \$29/i }),
    );
    expect(screen.queryByText(/recorded concept for this lot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Print \/ Save/i })).not.toBeInTheDocument();
  });

  it("opens an existing Certificate from its Address-only handoff without another Purchase", async () => {
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    const key = certificateKey(SAMPLE_LIVE_PARCEL);
    const url = buildStudioUrlForCertificate({
      id: `owner-1_${key}`, certKey: key, uid: "owner-1", stripeSessionId: "old-session",
      amount: 2900, status: "granted", demo: false, createdAt: null, address: SAMPLE_LIVE_PARCEL.address,
    });
    window.history.replaceState(null, "", url);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "owner-1", role: "homeowner", address: SAMPLE_LIVE_PARCEL.address, analyticsOrderId: "old-order" }),
    } as never);
    const purchase = vi.spyOn(adsConversion, "trackPurchase");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const request = String(input);
      const body = request.includes("/api/geocode")
        ? { lat: SAMPLE_LIVE_PARCEL.lat, lng: SAMPLE_LIVE_PARCEL.lng, formattedAddress: SAMPLE_LIVE_PARCEL.address }
        : request.includes("/api/parcel") ? SAMPLE_LIVE_PARCEL : { tier: "full", brief: briefFixture };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    await waitFor(() => expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("/api/parcel"))).toBe(true));
    expect((await screen.findAllByRole("heading", { name: "Certificate of Feasibility" }, { timeout: 5000 })).length).toBeGreaterThan(0);
    expect(fetchSpy.mock.calls.filter(([input]) => String(input).includes("/api/ai/project-brief"))).toHaveLength(1);
    expect(purchase).not.toHaveBeenCalled();
  });

  it("returns a cancelled Stripe checkout to the certificate step without a payment error", async () => {
    window.history.replaceState(
      null,
      "",
      "/studio?v=2&parcel=oak-street&step=certificate&checkout=cancelled",
    );

    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    expect(stepButton(/Certificate/)).toHaveAttribute("aria-current", "step");
    expect(
      await screen.findByText(
        "Checkout cancelled. Your property analysis is still here whenever you're ready.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Payment Issue")).not.toBeInTheDocument();
    // The scenario survives; the one-shot marker and step hint do not.
    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("parcel")).toBe("oak-street");
      expect(params.has("checkout")).toBe(false);
      expect(params.has("step")).toBe(false);
    });
  });

  it("reopens the Certificate step and resumes Checkout after a real-address sign-in remount", async () => {
    // State a guest's purchase click leaves behind before SignedInStudioGate
    // remounts the Studio with their lot.
    authMocks.user = { uid: "owner-1", email: "owner@example.test", displayName: "Owner", getIdToken: async () => "test-token" };
    stashInitialParcel(SAMPLE_LIVE_PARCEL);
    rememberCertificatePurchaseIntent(certificateKey(SAMPLE_LIVE_PARCEL));
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false, data: () => undefined } as never);
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign, search: "", pathname: "/studio", href: "http://localhost/studio" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const request = String(input);
      const body = request.includes("/api/stripe/checkout-certificate")
        ? { url: "https://checkout.stripe.com/c/pay/cs_test_resumed" }
        : request.includes("/api/parcel") ? SAMPLE_LIVE_PARCEL : { tier: "full", brief: briefFixture };
      return new Response(JSON.stringify(body), { status: 200 });
    });

    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    expect(stepButton(/Certificate/)).toHaveAttribute("aria-current", "step");
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_resumed"),
    );
    const checkoutCalls = fetchSpy.mock.calls.filter(([input]) =>
      String(input).includes("/api/stripe/checkout-certificate"),
    );
    expect(checkoutCalls).toHaveLength(1);
    expect(JSON.parse(String(checkoutCalls[0][1]?.body)).certKey).toBe(certificateKey(SAMPLE_LIVE_PARCEL));
    expect(hasCertificatePurchaseIntent()).toBe(false);
  });

  it("navigates among the steps via the rail", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Design/));
    expect(screen.getByRole("heading", { name: "Design your ADU" })).toBeInTheDocument();

    await user.click(stepButton(/Certificate/));
    expect(
      screen.getByRole("region", { name: "Free property preview" }),
    ).toBeInTheDocument();

    await user.click(stepButton(/Rules & Fit/));
    expect(screen.getByRole("region", { name: "Free property preview" })).toBeInTheDocument();
  });

  it("jumps to the certificate step from the constraints panel without opening the report", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(screen.getByRole("button", { name: "See what’s behind the numbers" }));

    expect(stepButton(/Certificate/)).toHaveAttribute("aria-current", "step");
    expect(
      screen.queryByRole("heading", { name: "Certificate of Feasibility" }),
    ).not.toBeInTheDocument();
  });

  it("reaches the builders step and can launch the connect flow", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Builders/));
    expect(
      screen.getByRole("heading", { name: /Connect with local builders/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Connect with builders/i })).toBeInTheDocument();
  });

  it("opens the builder connect form inside the Builders step's scrolling pane on desktop", async () => {
    // Rendered after the step section, the form sat outside every scrolling
    // pane and the locked `main` clipped Submit below the planning guide bar.
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Builders/));
    await user.click(screen.getByRole("button", { name: /Connect with builders/i }));

    const step = screen.getByRole("region", { name: "Builders" });
    // A guest's Submit asks them to sign in rather than failing after they fill it in.
    const submit = screen.getByRole("button", { name: "Sign in to send" });
    expect(step).toContainElement(submit);
    const pane = submit.closest(".overflow-y-auto");
    expect(pane).not.toBeNull();
    expect(step).toContainElement(pane as HTMLElement);
    expect(screen.queryByText(/Step 5 · Builders/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Close builder connection form/i }));
    expect(screen.queryByRole("button", { name: "Sign in to send" })).not.toBeInTheDocument();
    expect(screen.getByText(/Step 5 · Builders/)).toBeInTheDocument();
  });

  it("keeps what was typed in the builder connect form across close, reopen and step changes", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Builders/));
    const connect = screen.getByRole("button", { name: /Connect with builders/i });
    await user.click(connect);
    expect(screen.getByRole("heading", { name: "Connect with local builders" })).toHaveFocus();
    await user.type(screen.getByRole("textbox", { name: "Message (optional)" }), "Corner lot, alley access");
    await user.click(screen.getByRole("checkbox", { name: /18 or older/i }));

    await user.click(screen.getByRole("button", { name: /Close builder connection form/i }));
    // Focus goes back to the button that opened the form.
    expect(screen.getByRole("button", { name: /Connect with builders/i })).toHaveFocus();

    await user.click(stepButton(/Design/));
    await user.click(stepButton(/Builders/));
    await user.click(screen.getByRole("button", { name: /Connect with builders/i }));
    expect(screen.getByRole("textbox", { name: "Message (optional)" })).toHaveValue("Corner lot, alley access");
    // Consent is asked again each time.
    expect(screen.getByRole("checkbox", { name: /18 or older/i })).not.toBeChecked();
  });

  it("opens sign-in over the builder connect form for a guest who sends it", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Builders/));
    await user.click(screen.getByRole("button", { name: /Connect with builders/i }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Jane Owner");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "jane@example.com");
    await user.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await user.click(screen.getByRole("button", { name: "Sign in to send" }));

    expect(
      await screen.findByText(/Create a free account to send your snapshot to local builders/),
    ).toBeInTheDocument();
    // The form stays mounted under the dialog.
    expect(document.getElementById("builder-lead-email")).toHaveValue("jane@example.com");
  });

  it("opens the builder connect form as a focused Act destination on mobile", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)));
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    fireEvent.click(screen.getByRole("button", { name: /See a San Diego example/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Check feasibility/i }));
    fireEvent.click(await screen.findByRole("button", { name: /See what’s behind the numbers/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Connect with matched builders/i }),
    );

    expect(
      await screen.findByRole("button", { name: /Close builder connection form/i }),
    ).toBeInTheDocument();
    // The form replaces the Act content — a focused destination, not an append.
    expect(
      screen.queryByRole("heading", { name: /Your feasibility study is ready/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps lead money figures neutral", () => {
    entitlement.purchased = true; // The complete workspace requires a property grant.
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    const summary = document.getElementById("summary");
    expect(summary).not.toBeNull();
    const leads = summary!.querySelectorAll('[data-metric-lead="true"]');
    // Exactly the two lead figures: Monthly Rent and Annual NOI.
    expect(leads).toHaveLength(2);
    // Financial values use neutral ink; status colors describe verification,
    // so nothing green decorates a money figure either (rules, underlines).
    leads.forEach((el) => {
      expect(el).toHaveAttribute("data-accent", "neutral");
      expect(el.innerHTML).not.toMatch(/forest|eligible/);
    });
  });

  it("refuses to resurrect a stale history entry left behind by start over", async () => {
    stubMobileMatchMedia();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Walk the full journey to Act, pushing a real history entry per reveal.
    fireEvent.click(screen.getByRole("button", { name: /See a San Diego example/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Check feasibility/i }));
    fireEvent.click(await screen.findByRole("button", { name: /See what’s behind the numbers/i }));
    expect(
      await screen.findByRole("heading", { name: /Your feasibility study is ready/i }),
    ).toBeInTheDocument();

    // Start over: resetScenario() sends journeyStep back to "find" and the
    // hook's reset() only stamps the *current* (top) history entry — the
    // "check" entry pushed earlier is still sitting in the stack underneath.
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Reset scenario" }));
    expect(screen.getByRole("heading", { name: /Your feasibility study is ready/i })).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Reset scenario" }));
    expect(
      await screen.findByRole("heading", { name: "Start with your address." }),
    ).toBeInTheDocument();

    // A back gesture pops to that stale entry for real, delivering "check".
    // The reset also zeroed demoCommitted and parcelMode is back to preset,
    // so `found` is now false and "check" derives as locked relative to
    // "find" — the restore guard must refuse it.
    act(() => popToJourneyStep("check"));

    expect(screen.getByRole("heading", { name: "Start with your address." })).toBeInTheDocument();
    expect(screen.queryByText(/Verify before permit/i)).not.toBeInTheDocument();
  });

  it("never lets Back move forward past a rail jump to a done step", async () => {
    stubMobileMatchMedia();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Walk forward to Check, pushing find -> earn -> shape -> check.
    fireEvent.click(screen.getByRole("button", { name: /See a San Diego example/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Check feasibility/i }));
    expect(await screen.findByText(/What’s behind your rental potential/)).toBeInTheDocument();

    // Jump backward via the rail's completed "Earn" chip. JourneyRail only
    // makes done chips clickable and calls onStepSelect (setJourneyStep)
    // directly — an ordinary forward move as far as the history hook is
    // concerned, so it pushes a *new* entry, leaving the "check" entry
    // pushed a moment ago still sitting ahead of it in the stack.
    const rail = screen.getByRole("navigation", { name: "Journey progress" });
    fireEvent.click(within(rail).getByRole("button", { name: /Earn/i }));
    expect(
      await screen.findByRole("heading", { name: /Your backyard could earn/i }),
    ).toBeInTheDocument();

    // A back gesture pops forward into that stale "check" entry. Relative
    // to the new position (Earn), "check" derives as "upcoming" (found is
    // still true, so nothing is locked) rather than "done" - so the guard
    // must refuse it: Back must never move the user forward.
    act(() => popToJourneyStep("check"));

    expect(
      screen.getByRole("heading", { name: /Your backyard could earn/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Verify before permit/i)).not.toBeInTheDocument();
  });

  it("does not let the scenario URL sync effect erase the journey's history-state key", async () => {
    // Regression: the scenario-URL sync effect (below, fires on every
    // parcelId/config/assumptions change) called
    // window.history.replaceState(null, "", next) — the `null` wipes the
    // *entire* state object on the current entry, including the
    // lfJourneyStep key the journey hook wrote there. It is not a rare
    // collision: selecting a preset, resizing the ADU, or changing
    // finish/roof all trigger it.
    //
    // This test triggers the real effect via a real interaction (selecting
    // a different demo preset while still on Find, changing parcelId) so
    // its outcome is actually driven by FeasibilityStudio.tsx's own
    // replaceState(null, ...) line rather than by an assumption baked into
    // the test. A hook-level test cannot reproduce this: the hook's own
    // sync effect has always correctly spread existing state
    // (`{ ...window.history.state, [KEY]: step }`); the bug is a second,
    // unrelated effect in FeasibilityStudio.tsx overwriting that state with
    // `null` entirely, which only exists at the studio level.
    stubMobileMatchMedia();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Select a different demo preset while still on Find — changes
    // parcelId, which is one of the scenario-URL sync effect's deps. This
    // is the exact action from the live-browser repro that found this bug.
    fireEvent.click(screen.getByRole("radio", { name: /Portland/i }));

    // Capture what that effect actually left on the current (launch)
    // entry's state, right before burying it under a new push below. This
    // is what a real Back press will deliver once the journey advances
    // past it — reading it here (rather than assuming its shape) is what
    // makes the assertion below depend on the real source line under test.
    const launchEntryState = window.history.state as { lfJourneyStep?: string } | null;

    // Advance the journey one step: pushes a new entry for "earn", burying
    // the (possibly now-stateless) launch entry beneath it. The CTA names the
    // lot picked above rather than promising San Diego.
    fireEvent.click(screen.getByRole("button", { name: "See the Portland example" }));
    expect(
      await screen.findByRole("heading", { name: /Your backyard could earn/i }),
    ).toBeInTheDocument();

    // Simulate a real Back press landing on the launch entry, carrying
    // whatever state it actually holds.
    act(() => popToRawState(launchEntryState));

    // Back must actually navigate. Against the unfixed
    // replaceState(null, ...), the launch entry has no lfJourneyStep key,
    // so handlePopState's (correct, unchanged) `restored === undefined`
    // guard silently no-ops and the screen stays on Earn — the browser
    // moves, the UI does not.
    expect(
      screen.getByRole("heading", { name: "Start with your address." }),
    ).toBeInTheDocument();
  });
});
