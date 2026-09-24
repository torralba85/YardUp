import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuilderPage from "./page";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), dashboard: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({
  user: { uid: "builder" }, profile: { role: "builder", email: "builder@example.com" }, loading: false,
}) }));
vi.mock("@/components/builder/BuilderDashboard", () => ({ default: () => {
  mocks.dashboard();
  return <div>Builder purchase controls</div>;
} }));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("builder direct route", () => {
  it("never mounts the dashboard in a store shell and redirects to Studio", () => {
    vi.stubGlobal("LotFoundryNative", { platform: "android" });
    render(<BuilderPage />);
    expect(mocks.dashboard).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith("/studio");
  });
  it("keeps the dashboard for signed-in web builders at phone widths", () => {
    vi.stubGlobal("innerWidth", 390);
    render(<BuilderPage />);
    expect(screen.getByText("Builder purchase controls")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
