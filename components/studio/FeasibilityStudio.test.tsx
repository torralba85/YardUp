import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeasibilityStudio from "../FeasibilityStudio";
import { AuthProvider } from "@/lib/auth-context";
import type { ReactNode } from "react";

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockParcelScene = () => (
      <div data-testid="parcel-scene">parcel scene placeholder</div>
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

vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  onAuthStateChanged: (_auth: unknown, cb: (u: null) => void) => {
    Promise.resolve().then(() => cb(null));
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

  it("presents a single spine navigation with the Feasibility & Rules step active", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    // Exactly one navigation model — the spine. The old tab strip is gone.
    expect(stepRail()).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    expect(stepButton(/Feasibility & Rules/)).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("heading", { name: "What this lot allows" })).toBeInTheDocument();
    expect(screen.getByText("Feasibility verdict")).toBeInTheDocument();
    expect(screen.getByText("Readiness")).toBeInTheDocument();
  });

  it("marks certificate and builders as the revenue steps", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    // The rail flags the two revenue destinations with a "$" signifier.
    expect(within(stepRail()).getAllByText("$")).toHaveLength(2);
  });

  it("folds the local permit guide into the Feasibility & Rules step", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: /Seattle ADU Starter Guide/i }),
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

  it("reaches the certificate step and generates the report", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(stepButton(/Certificate/));
    expect(
      screen.getByRole("heading", { name: "Estimate Summary", level: 2 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Create report/i }));
    expect(screen.getByText(/recorded concept for this lot/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print \/ Save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
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

    await user.click(stepButton(/Feasibility & Rules/));
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

  it("marks the lead money figures with the investment-grade accent", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    const summary = document.getElementById("summary");
    expect(summary).not.toBeNull();
    const leads = summary!.querySelectorAll('[data-metric-lead="true"]');
    // Exactly the two lead figures: Monthly Rent and Annual NOI.
    expect(leads).toHaveLength(2);
    leads.forEach((el) => expect(el).toHaveAttribute("data-accent", "amber"));
  });
});
