import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppStudioOnboarding, { APP_GUIDE_SEEN_KEY } from "./AppStudioOnboarding";

vi.mock("@/components/FeasibilityStudio", () => ({
  default: function MockFeasibilityStudio({ demoChosen }: { demoChosen?: boolean }) {
    if (!demoChosen) return <div>Guest Studio Mock</div>;
    return <div>Demo Studio Mock {demoChosen ? "chosen" : "unchosen"} {window.location.search}</div>;
  },
}));

vi.mock("./SignedInStudioGate", () => ({
  default: function MockSignedInStudioGate() {
    return <div>Address Workspace Mock</div>;
  },
}));

vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: function MockAuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: (reason: "signed-in" | "dismissed") => void }) {
    if (!isOpen) return null;
    return (
      <div role="dialog">
        <button type="button" onClick={() => onClose("dismissed")}>Dismiss</button>
        <button type="button" onClick={() => onClose("signed-in")}>Finish sign-in</button>
      </div>
    );
  },
}));

const member = { uid: "owner-1" } as User;

function goBack() {
  act(() => {
    window.history.back();
  });
}

describe("AppStudioOnboarding", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/studio");
    window.localStorage.clear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("opens the guest address workspace through the guide without sign-in", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={null} />);

    expect(screen.getByRole("heading", { name: "A little more room for life." })).toBeInTheDocument();
    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    expect(screen.getByRole("heading", { name: "How the Studio works." })).toHaveFocus();
    expect(screen.getByText("Find your lot")).toBeInTheDocument();

    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(APP_GUIDE_SEEN_KEY)).toBe("1");
  });

  it("keeps the guest workspace mounted when the guest signs in from the Studio", async () => {
    const clicker = userEvent.setup();
    const { rerender } = render(<AppStudioOnboarding user={null} />);

    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();

    rerender(<AppStudioOnboarding user={member} />);
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();
    expect(screen.queryByText("Address Workspace Mock")).not.toBeInTheDocument();
  });

  it("opens a demo city without an account and starts past the find step", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={null} />);

    await clicker.click(screen.getByRole("button", { name: /Portland, OR/ }));
    expect(screen.getByText("Start in Portland, OR")).toBeInTheDocument();
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));

    expect(screen.getByText("Demo Studio Mock chosen ?parcel=corner-lot")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps a shared design for the same demo lot", async () => {
    const clicker = userEvent.setup();
    window.history.replaceState(null, "", "/studio?parcel=corner-lot&size=800");
    render(<AppStudioOnboarding user={null} />);

    await clicker.click(screen.getByRole("button", { name: /Portland, OR/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Demo Studio Mock chosen ?parcel=corner-lot&size=800")).toBeInTheDocument();
  });

  it("steps back through the screens with the history back gesture", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={null} />);

    await clicker.click(screen.getByRole("button", { name: /Austin, TX/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText(/Demo Studio Mock/)).toBeInTheDocument();

    goBack();
    expect(await screen.findByTestId("app-guide")).toBeInTheDocument();
    goBack();
    expect(await screen.findByTestId("app-welcome")).toBeInTheDocument();
  });

  it("restores the screen and demo city when it remounts mid-flow", async () => {
    const clicker = userEvent.setup();
    const first = render(<AppStudioOnboarding user={null} />);
    await clicker.click(screen.getByRole("button", { name: /Portland, OR/ }));
    first.unmount();

    const second = render(<AppStudioOnboarding user={null} />);
    expect(screen.getByText("Start in Portland, OR")).toBeInTheDocument();
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    second.unmount();

    render(<AppStudioOnboarding user={null} />);
    expect(screen.getByText("Demo Studio Mock chosen ?parcel=corner-lot")).toBeInTheDocument();
    goBack();
    expect(await screen.findByText("Start in Portland, OR")).toBeInTheDocument();
  });

  it("sends returning members straight to the workspace once they have read the guide", () => {
    const { unmount } = render(<AppStudioOnboarding user={member} />);
    expect(screen.getByTestId("app-guide")).toBeInTheDocument();
    unmount();

    // A later launch starts on a fresh history entry.
    window.history.replaceState(null, "", "/studio");
    window.localStorage.setItem(APP_GUIDE_SEEN_KEY, "1");
    render(<AppStudioOnboarding user={member} />);
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();
  });

  it("never shows the private workspace after the member signs out", () => {
    window.localStorage.setItem(APP_GUIDE_SEEN_KEY, "1");
    const { rerender } = render(<AppStudioOnboarding user={member} />);
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();

    rerender(<AppStudioOnboarding user={null} />);
    expect(screen.queryByText("Address Workspace Mock")).not.toBeInTheDocument();
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();
  });

  it("preserves guest property entry on remount and Back without storing an address", async () => {
    const clicker = userEvent.setup();
    const first = render(<AppStudioOnboarding user={null} />);
    await clicker.click(screen.getByRole("button", { name: /Explore my property/ }));
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    first.unmount();
    render(<AppStudioOnboarding user={null} />);
    expect(screen.getByText("Guest Studio Mock")).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(window.history.state.lfAppOnboardingStep).toBe("studio");
    goBack();
    expect(await screen.findByTestId("app-guide")).toBeInTheDocument();
    goBack();
    expect(await screen.findByTestId("app-welcome")).toBeInTheDocument();
  });

  it("keeps the signed-in property entry on the authenticated gate", async () => {
    const clicker = userEvent.setup();
    render(<AppStudioOnboarding user={member} />);
    await clicker.click(screen.getByRole("button", { name: /Open the Studio/ }));
    expect(screen.getByText("Address Workspace Mock")).toBeInTheDocument();
    expect(screen.queryByText("Guest Studio Mock")).not.toBeInTheDocument();
  });
});
