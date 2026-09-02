import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeasibilityStudio from "../FeasibilityStudio";
import { AuthProvider } from "@/lib/auth-context";
import { clearInitialParcel } from "@/lib/parcel-handoff";
import { JOURNEY_STEP_STATE_KEY } from "@/lib/use-journey-history";
import type { ReactNode } from "react";

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
    const MockParcelScene = (props: {
      parcel?: { lotWidth: number; lotLength: number };
    }) => (
      <div
        data-testid="parcel-scene"
        data-lot-width={props.parcel?.lotWidth}
        data-lot-length={props.parcel?.lotLength}
      >
        parcel scene placeholder
      </div>
    );
    MockParcelScene.displayName = "MockParcelScene";
    return MockParcelScene;
  },
}));

// Mock Firebase auth for tests
vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
  app: {},
}));

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
    window.history.replaceState(null, "", "/");
    window.localStorage.clear();
    clearInitialParcel();
    authMocks.user = null;
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

  it("presents a single spine navigation with the Rules & Fit step active", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Exactly one navigation model — the spine. The old tab strip is gone.
    expect(stepRail()).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    expect(stepButton(/Rules & Fit/)).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("heading", { name: "What this lot allows" })).toBeInTheDocument();
    expect(screen.getByText("Feasibility verdict")).toBeInTheDocument();
    expect(screen.getByText("Readiness")).toBeInTheDocument();
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
  });

  it("keeps the parcel view switch inside the scene and changes views explicitly", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    const viewport = screen.getByTestId("scene-viewport");
    const viewControl = within(viewport).getByRole("group", { name: "Parcel view" });
    const modelButton = within(viewControl).getByRole("button", { name: "3D model" });
    const aerialButton = within(viewControl).getByRole("button", { name: "Aerial" });

    expect(viewControl).toHaveClass("absolute", "left-4", "top-4");
    expect(viewControl).toHaveClass("pointer-events-auto", "z-(--z-index-header)");
    expect(viewport.firstElementChild).toBe(viewControl);
    expect(modelButton).toHaveAttribute("aria-pressed", "true");
    expect(aerialButton).toHaveAttribute("aria-pressed", "false");

    await user.click(aerialButton);

    expect(modelButton).toHaveAttribute("aria-pressed", "false");
    expect(aerialButton).toHaveAttribute("aria-pressed", "true");
    expect(
      within(viewport).getByText(/Aerial view requires a real address/i),
    ).toBeInTheDocument();
  });

  it("marks certificate and builders as the revenue steps", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    // The rail flags the two revenue destinations with a "$" signifier.
    expect(within(stepRail()).getAllByText("$")).toHaveLength(2);
  });

  it("folds the local permit guide into the Rules & Fit step", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: /Seattle ADU Starter Guide/i }),
    ).toBeInTheDocument();
  });

  it("offers one AI action for the parcel interpretation and approval timeline", () => {
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
    fireEvent.click(screen.getByRole("button", { name: /Reveal my backyard/i }));

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
    expect(await screen.findByText(/Verify before permit/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /See your certificate/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /Reveal my backyard/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Fine-tune dimensions & assumptions/i }),
    );

    const drawer = await screen.findByTestId("fine-tune-drawer");
    // The advanced inspector is progressive disclosure, never the default path.
    expect(
      within(drawer).getByRole("heading", { name: "Feasibility Studio", hidden: true }),
    ).toBeInTheDocument();
  });

  it("exposes massing controls on the Design step", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Design/));

    expect(screen.getByRole("combobox", { name: "Sample Property" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create my ADU report/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Build Cost Range")).toBeInTheDocument();
  });

  it("flags review needed when selecting a 1,000 sf concept on the compact preset", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Design/));
    await user.selectOptions(screen.getByLabelText("Sample Property"), "compact-lot");

    const sizeGroup = screen.getByRole("group", { name: /ADU footprint size/i });
    await user.click(within(sizeGroup).getByRole("button", { name: "1,000 sf" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Review needed/i);
  });

  it("updates the rental estimate when switching the basis to Market", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Rent basis lives on the Feasibility step as an accessible radiogroup.
    const rentGroup = screen.getByRole("radiogroup", { name: /Rent estimate basis/i });
    await user.click(within(rentGroup).getByRole("radio", { name: "Market" }));

    const monthlyRentSection = screen.getByText("Monthly Rent").parentElement;
    expect(monthlyRentSection).toHaveTextContent("$2,350");
  });

  it("paywalls the complete certificate behind a purchase (guest sees sign-in)", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Certificate/));

    // The free estimate snapshot stays visible...
    expect(
      screen.getByRole("heading", { name: "Estimate Summary", level: 2 }),
    ).toBeInTheDocument();
    // ...but the complete certificate is gated behind a one-time price.
    expect(
      screen.getByRole("heading", {
        name: /unlock the complete record for .* one-time \$29/i,
      }),
    ).toBeInTheDocument();

    // A guest is asked to sign in, and the paid report does not open.
    await user.click(screen.getByRole("button", { name: /Sign in to generate your certificate/i }));
    expect(screen.queryByText(/recorded concept for this lot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Print \/ Save/i })).not.toBeInTheDocument();
  });

  it("navigates among the steps via the rail", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Design/));
    expect(screen.getByRole("combobox", { name: "Sample Property" })).toBeInTheDocument();

    await user.click(stepButton(/Certificate/));
    expect(
      screen.getByRole("heading", { name: "Estimate Summary", level: 2 }),
    ).toBeInTheDocument();

    await user.click(stepButton(/Rules & Fit/));
    expect(screen.getByRole("heading", { name: "What this lot allows" })).toBeInTheDocument();
  });

  it("jumps to the certificate step from the constraints panel without opening the report", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(screen.getByRole("button", { name: "View certificate" }));

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

    fireEvent.click(screen.getByRole("button", { name: /Reveal my backyard/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Check feasibility/i }));
    fireEvent.click(await screen.findByRole("button", { name: /See your certificate/i }));
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

  it("marks the lead money figures with the forest money accent", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    const summary = document.getElementById("summary");
    expect(summary).not.toBeNull();
    const leads = summary!.querySelectorAll('[data-metric-lead="true"]');
    // Exactly the two lead figures: Monthly Rent and Annual NOI.
    expect(leads).toHaveLength(2);
    // Positive financial value renders forest, never amber (amber = risk).
    leads.forEach((el) => expect(el).toHaveAttribute("data-accent", "forest"));
  });

  it("refuses to resurrect a stale history entry left behind by start over", async () => {
    stubMobileMatchMedia();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Walk the full journey to Act, pushing a real history entry per reveal.
    fireEvent.click(screen.getByRole("button", { name: /Reveal my backyard/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Check feasibility/i }));
    fireEvent.click(await screen.findByRole("button", { name: /See your certificate/i }));
    expect(
      await screen.findByRole("heading", { name: /Your feasibility study is ready/i }),
    ).toBeInTheDocument();

    // Start over: resetScenario() sends journeyStep back to "find" and the
    // hook's reset() only stamps the *current* (top) history entry — the
    // "check" entry pushed earlier is still sitting in the stack underneath.
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
    fireEvent.click(screen.getByRole("button", { name: /Reveal my backyard/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Shape your ADU/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Check feasibility/i }));
    expect(await screen.findByText(/Verify before permit/i)).toBeInTheDocument();

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
    fireEvent.click(screen.getByRole("button", { name: /Portland/i }));

    // Capture what that effect actually left on the current (launch)
    // entry's state, right before burying it under a new push below. This
    // is what a real Back press will deliver once the journey advances
    // past it — reading it here (rather than assuming its shape) is what
    // makes the assertion below depend on the real source line under test.
    const launchEntryState = window.history.state as { lfJourneyStep?: string } | null;

    // Advance the journey one step: pushes a new entry for "earn", burying
    // the (possibly now-stateless) launch entry beneath it.
    fireEvent.click(screen.getByRole("button", { name: /Reveal my backyard/i }));
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
