import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingAuthGate from "./LandingAuthGate";

const authMock = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  loading: false,
}));

vi.mock("@/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: authMock.user, loading: authMock.loading }),
}));

// Mirrors the real modal's two exits: it calls `onClose` on a *successful*
// sign-in as well as on a cancel, distinguished only by the reason argument.
// A stub that closes without a reason cannot catch the gate tearing its own
// provider down mid-sign-in.
vi.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({
    isOpen,
    onClose,
    initialMode,
    analyticsSurface,
    analyticsSource,
  }: {
    isOpen: boolean;
    onClose: (reason: "signed-in" | "dismissed") => void;
    initialMode?: "sign-in" | "sign-up";
    analyticsSurface?: string;
    analyticsSource?: string;
  }) =>
    isOpen ? (
      <div
        role="dialog"
        aria-label={initialMode === "sign-up" ? "Create account to continue" : "Sign in to continue"}
        data-analytics-surface={analyticsSurface}
        data-analytics-source={analyticsSource}
      >
        <button onClick={() => onClose("dismissed")}>Close</button>
        <button
          onClick={() => {
            // The real modal closes itself the moment sign-in resolves; the
            // provider reports the user on a later render.
            onClose("signed-in");
          }}
        >
          Sign in
        </button>
      </div>
    ) : null,
}));

/**
 * The resume path is the half of the funnel the hero's own tests cannot reach:
 * they stub the modal, so signing in never happens there. These drive the gate
 * across the session transition directly.
 */
describe("LandingAuthGate", () => {
  beforeEach(() => {
    authMock.user = null;
    authMock.loading = false;
  });

  it("shows the sign-in modal to a guest and hands nothing off", () => {
    const onAuthenticated = vi.fn();
    render(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog", { name: /sign in to continue/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("data-analytics-surface", "landing");
    expect(dialog).toHaveAttribute("data-analytics-source", "account_control");
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("opens spent-guest prompts directly in create-account mode", () => {
    render(
      <LandingAuthGate
        onAuthenticated={vi.fn()}
        onDismiss={vi.fn()}
        initialMode="sign-up"
        analyticsSource="guest_limit"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /create account to continue/i });
    expect(dialog).toHaveAttribute("data-analytics-surface", "landing");
    expect(dialog).toHaveAttribute("data-analytics-source", "guest_limit");
  });

  it("stays silent while the session is still resolving", () => {
    authMock.loading = true;
    const onAuthenticated = vi.fn();
    render(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );

    // A signed-in visitor must not see the modal flash before auth resolves.
    expect(
      screen.queryByRole("dialog", { name: /sign in to continue/i }),
    ).not.toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("hands an already-signed-in visitor straight through", () => {
    authMock.user = { uid: "user-1" };
    const onAuthenticated = vi.fn();
    render(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("dialog", { name: /sign in to continue/i }),
    ).not.toBeInTheDocument();
  });

  it("resumes the handoff once the guest signs in", () => {
    const onAuthenticated = vi.fn();
    const { rerender } = render(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );
    expect(onAuthenticated).not.toHaveBeenCalled();

    // Sign-in completes: the provider reports a user on the next render.
    authMock.user = { uid: "user-1" };
    rerender(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it("survives the modal closing itself on a successful sign-in", () => {
    const onAuthenticated = vi.fn();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <LandingAuthGate
        onAuthenticated={onAuthenticated}
        onDismiss={onDismiss}
      />,
    );

    // The modal closes the instant sign-in resolves — before the provider has
    // reported the user. Treating that as a dismissal would unmount the gate
    // (and its AuthProvider) and strand the visitor on the landing page.
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onDismiss).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: /sign in to continue/i }),
    ).not.toBeInTheDocument();

    // Session lands a render later; the handoff resumes.
    authMock.user = { uid: "user-1" };
    rerender(
      <LandingAuthGate
        onAuthenticated={onAuthenticated}
        onDismiss={onDismiss}
      />,
    );

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("dismisses when the guest backs out instead", () => {
    const onAuthenticated = vi.fn();
    const onDismiss = vi.fn();
    render(
      <LandingAuthGate
        onAuthenticated={onAuthenticated}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("fires the handoff exactly once across later re-renders", () => {
    const onAuthenticated = vi.fn();
    const { rerender } = render(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );

    authMock.user = { uid: "user-1" };
    rerender(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );
    // The profile lands after the user does; the route change has not happened
    // yet, so the gate re-renders while still mounted.
    rerender(
      <LandingAuthGate onAuthenticated={onAuthenticated} onDismiss={vi.fn()} />,
    );

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });
});
