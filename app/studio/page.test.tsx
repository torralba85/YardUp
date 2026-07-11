import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudioPage from "./page";
import { TYPICAL_MARKET } from "@/lib/typical-market";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  authState: {
    loading: false,
    user: null as null | { uid: string },
    profile: null as null | { role: "user" | "builder" },
  },
}));

vi.mock("@/components/FeasibilityStudio", () => ({
  default: function MockFeasibilityStudio() {
    return <div>Feasibility Studio Mock</div>;
  },
}));

vi.mock("@/components/studio/SignedInStudioGate", () => ({
  default: function MockSignedInStudioGate() {
    return <div>Signed-in Blank Slate Mock</div>;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mocks.authState,
}));

describe("StudioPage", () => {
  beforeEach(() => {
    mocks.replace.mockClear();
    mocks.authState.loading = false;
    mocks.authState.user = null;
    mocks.authState.profile = null;
  });

  it("renders the exploratory studio for guests without redirecting", () => {
    render(<StudioPage />);

    expect(screen.getByText("Feasibility Studio Mock")).toBeInTheDocument();
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("shows the dawn arrival plate with the typical money band while auth resolves", () => {
    mocks.authState.loading = true;

    render(<StudioPage />);

    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    // Seam rule (DESIGN.md): a money-green figure must be visible on arrival —
    // never a bare "Loading studio..." spinner state.
    expect(screen.queryByText("Loading studio...")).not.toBeInTheDocument();
    expect(screen.getByText(TYPICAL_MARKET.rentBand)).toBeInTheDocument();
    expect(screen.getByText(/typical supported markets/i)).toBeInTheDocument();
  });

  it("renders an empty address-first workspace for signed-in users", () => {
    mocks.authState.user = { uid: "user-1" };

    render(<StudioPage />);

    expect(screen.getByText("Signed-in Blank Slate Mock")).toBeInTheDocument();
    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
  });
});
