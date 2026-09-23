import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemberNav } from "./LandingMemberNav";

const mocks = vi.hoisted(() => ({
  state: { user: null as { uid: string } | null, profile: null as { role: string } | null, loading: false },
  logout: vi.fn(),
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ ...mocks.state, logout: mocks.logout }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("landing member navigation", () => {
  beforeEach(() => {
    mocks.state = { user: null, profile: null, loading: false };
    mocks.logout.mockClear();
  });
  it("shows no member controls for guests or unresolved sessions", () => {
    const view = render(<MemberNav />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Account")).not.toBeInTheDocument();
    mocks.state.loading = true;
    view.rerender(<MemberNav />);
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByText("Account")).not.toBeInTheDocument();
  });
  it("shows role-appropriate links and removes them when the session ends", () => {
    mocks.state = { user: { uid: "member" }, profile: { role: "user" }, loading: false };
    const view = render(<MemberNav />);
    fireEvent.click(screen.getByText("Account"));
    expect(screen.getByRole("link", { name: "Open Studio" })).toBeInTheDocument();
    expect(screen.queryByText("Builder dashboard")).not.toBeInTheDocument();
    mocks.state.profile = { role: "builder" };
    view.rerender(<MemberNav />);
    expect(screen.getByRole("link", { name: "Builder dashboard" })).toHaveAttribute("href", "/builder");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mocks.logout).toHaveBeenCalledOnce();
    mocks.state.user = null;
    view.rerender(<MemberNav />);
    expect(screen.queryByText("Account")).not.toBeInTheDocument();
  });
  it("hides the dashboard for an existing builder in the app", () => {
    vi.stubGlobal("LotFoundryNative", { platform: "android" });
    mocks.state = { user: { uid: "builder" }, profile: { role: "builder" }, loading: false };
    render(<MemberNav />);
    fireEvent.click(screen.getByText("Account"));
    expect(screen.queryByRole("link", { name: "Builder dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Studio" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("closes the member disclosure with Escape and restores focus", () => {
    mocks.state.user = { uid: "member" };
    render(<MemberNav />);
    const summary = screen.getByText("Account");
    fireEvent.click(summary);
    fireEvent.keyDown(summary, { key: "Escape" });
    expect(summary.closest("details")).not.toHaveAttribute("open");
    expect(summary).toHaveFocus();
  });
});

