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

describe("FeasibilityStudio", () => {
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

  it("renders the complete feasibility workflow", () => {
    render(<FeasibilityStudio />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("heading", { name: "Feasibility Studio", level: 2 }),
    ).toBeInTheDocument();
    // "Sample Property" is a label (not h3) for the preset select element
    expect(
      screen.getByRole("combobox", { name: "Sample Property" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create my ADU report/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Property")).toBeInTheDocument();
    expect(screen.getByText("ADU fit")).toBeInTheDocument();
    expect(screen.getByText("Money model")).toBeInTheDocument();
    expect(screen.getByText(/Search an address or keep the sample lot/i)).toBeInTheDocument();
    expect(screen.getByText("Build Cost Range")).toBeInTheDocument();
  });

  it("flags review needed when selecting a 1,000 sf concept on the compact preset", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.selectOptions(screen.getByLabelText("Sample Property"), "compact-lot");

    const sizeGroup = screen.getByRole("group", { name: /ADU footprint size/i });
    await user.click(within(sizeGroup).getByRole("button", { name: "1,000 sf" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Review needed/i);
  });

  it("updates the rental estimate when switching to Market", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    const rentGroup = screen.getByRole("group", { name: /Rental estimate/i });
    await user.click(within(rentGroup).getByRole("button", { name: "Market" }));

    const monthlyRentSection = screen.getByText("Monthly Rent").parentElement;
    expect(monthlyRentSection).toHaveTextContent("$2,350");
  });

  it("exposes report print and download controls after generating the report", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(screen.getByRole("button", { name: /Create my ADU report/i }));

    expect(
      screen.getByText(/recorded concept for this lot/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print \/ Save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
  });

  it("opens the estimate summary from the navigation", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(screen.getAllByRole("button", { name: /Estimate Summary/i })[0]);

    expect(
      screen.getByRole("heading", { name: "Estimate Summary", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Current feasibility snapshot for/i)).toBeInTheDocument();
  });

  it("routes every primary navigation item to a visible studio surface", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />, { wrapper: TestWrapper });

    await user.click(screen.getAllByRole("button", { name: /Permit Guide/i })[0]);
    expect(screen.getByRole("heading", { name: /Seattle ADU Starter Guide/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Inspiration Gallery/i })[0]);
    expect(screen.getByRole("heading", { name: /Inspiration Gallery/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Estimate Summary/i })[0]);
    expect(
      screen.getByRole("heading", { name: "Estimate Summary", level: 2 }),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Export Preview/i })[0]);
    expect(screen.getByRole("heading", { name: "Certificate of Feasibility" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Feasibility Studio/i })[0]);
    expect(
      screen.getByRole("heading", { name: "Feasibility Studio", level: 2 }),
    ).toBeInTheDocument();
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
