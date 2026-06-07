import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudioPage from "./page";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  authState: {
    loading: false,
    user: null as null | { uid: string },
  },
}));

vi.mock("@/components/FeasibilityStudio", () => ({
  default: function MockFeasibilityStudio() {
    return <div>Feasibility Studio Mock</div>;
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
  });

  it("redirects guests to login before rendering studio data", async () => {
    render(<StudioPage />);

    expect(screen.queryByText("Feasibility Studio Mock")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/login?next=/studio");
    });
  });

  it("renders the studio for signed-in users", () => {
    mocks.authState.user = { uid: "user-1" };

    render(<StudioPage />);

    expect(screen.getByText("Feasibility Studio Mock")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
