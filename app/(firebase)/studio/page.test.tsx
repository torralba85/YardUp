import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudioPage from "./page";

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

vi.mock("@/components/studio/StudioWelcome", () => ({
  default: () => <div>Studio Welcome Mock</div>,
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

  it("keeps guests on the welcome screen without opening the workspace", () => {
    render(<StudioPage />);

    expect(screen.getByText("Studio Welcome Mock")).toBeInTheDocument();
    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("waits for authentication before showing either entry", () => {
    mocks.authState.loading = true;

    render(<StudioPage />);

    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    expect(screen.queryByText("Studio Welcome Mock")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Getting your Studio ready");
  });

  it("renders an empty address-first workspace for signed-in users", () => {
    mocks.authState.user = { uid: "user-1" };

    render(<StudioPage />);

    expect(screen.getByText("Signed-in Blank Slate Mock")).toBeInTheDocument();
    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
  });

  it("returns to the welcome when the session ends", () => {
    mocks.authState.user = { uid: "user-1" };
    const { rerender } = render(<StudioPage />);
    mocks.authState.user = null;
    rerender(<StudioPage />);
    expect(screen.getByText("Studio Welcome Mock")).toBeInTheDocument();
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
  });

  it("routes builders to their dashboard without mounting the owner workspace", () => {
    mocks.authState.user = { uid: "builder-1" };
    mocks.authState.profile = { role: "builder" };
    render(<StudioPage />);
    expect(mocks.replace).toHaveBeenCalledWith("/builder");
    expect(screen.queryByText("Signed-in Blank Slate Mock")).not.toBeInTheDocument();
  });
});
