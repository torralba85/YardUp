import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useEffect, useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/lib/auth-context";

const mocks = vi.hoisted(() => ({
  auth: { user: null as { uid: string } | null },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signInWithApple: vi.fn().mockResolvedValue(undefined),
    user: mocks.auth.user,
  }),
}));

/**
 * Host that mirrors StudioShell/MobileHeader: the sign-in trigger and the
 * account control swap inside a stable container that also holds earlier
 * unrelated controls (Reset), and auth state can settle a render after the
 * modal closes.
 */
function Host() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div data-testid="slot">
        <button type="button">Reset</button>
        {signedIn ? (
          <button key="account" type="button">
            Account
          </button>
        ) : (
          <button key="sign-in" type="button" onClick={() => setOpen(true)}>
            Sign In
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setSignedIn(true);
          setOpen(false);
        }}
      >
        Simulate sign-in
      </button>
      <button type="button" onClick={() => setSignedIn(true)}>
        Swap trigger only
      </button>
      <AuthModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

describe("AuthModal focus restore", () => {
  beforeEach(() => {
    mocks.auth.user = null;
  });

  it("opens directly in sign-up mode when requested", async () => {
    render(
      <AuthModal
        isOpen
        initialMode="sign-up"
        analyticsSurface="studio"
        analyticsSource="post_result"
        onClose={() => {}}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Save your property" })).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Create free account" })).toBeEnabled();
    expect(screen.getByLabelText("Name")).toBeTruthy();
  });

  it.each([
    ["guest_limit", /That was your free address lookup/],
    ["post_result", /save this lot and come back/],
    ["save_scenario", /save this lot and come back/],
    ["account_control", /save ADU estimates, reports, and builder-ready snapshots/],
  ] as const)("names what a free account gives when opened from %s", (source, blurb) => {
    render(
      <AuthModal
        isOpen
        initialMode="sign-up"
        analyticsSource={source}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(blurb)).toBeTruthy();
  });

  it("returns focus to the trigger when it is still mounted", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Sign In" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("uses the deep-orange-on-chalk focus token for signup legal links", () => {
    render(<AuthModal isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /don't have an account/i }));

    expect(screen.getByRole("link", { name: /terms & conditions/i })).toHaveClass(
      "focus-visible:ring-lot-orange-ink",
      "focus-visible:ring-offset-lf-card",
    );
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveClass(
      "focus-visible:ring-lot-orange-ink",
      "focus-visible:ring-offset-lf-card",
    );
  });

  it("gates social auth in both modes while leaving returning email sign-in available", () => {
    render(<AuthModal isOpen onClose={() => {}} />);

    const checkbox = screen.getByRole("checkbox", { name: /18 or older/i });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toHaveAccessibleDescription(/confirmation above to enable/);
    expect(screen.getByRole("button", { name: "Continue with Apple" })).toHaveAccessibleDescription(/confirmation above to enable/);
    expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue with Apple" })).toBeDisabled();

    fireEvent.click(checkbox);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toHaveAccessibleDescription("Google and Apple sign-in are ready.");
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue with Apple" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /don't have an account/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alma Reyes" } });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alma@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create free account" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/confirm that you are 18 or older/i);
  });

  it("associates visible labels with the email/password fields in both auth modes", () => {
    render(<AuthModal isOpen onClose={() => {}} />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "auth-email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("id", "auth-password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");

    fireEvent.click(screen.getByRole("button", { name: /don't have an account/i }));

    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "auth-display-name");
    expect(screen.getByLabelText("Name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("moves focus to the trigger's replacement, not an earlier control, when sign-in unmounts it", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Sign In" });
    trigger.focus();
    fireEvent.click(trigger);

    // Successful sign-in: the trigger is replaced by account UI and the
    // modal closes in the same update. "Reset" precedes the slot, so a
    // first-focusable fallback would land there instead of "Account".
    fireEvent.click(screen.getByRole("button", { name: "Simulate sign-in" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Account" }),
    );
  });

  it("does not steal focus after a cancel close, even if the trigger is later unmounted", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Sign In" });
    trigger.focus();
    fireEvent.click(trigger);

    // Cancel: Escape closes without signing in. Focus returns to the
    // trigger, but this close must not arm delayed recovery for it.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);

    // Unrelated auth churn afterward (e.g. signing in from another tab or
    // surface) unmounts the old trigger. Since this modal never completed a
    // sign-in, it must not reach in and move focus to the replacement.
    mocks.auth.user = { uid: "user-1" };
    fireEvent.click(screen.getByRole("button", { name: "Swap trigger only" }));

    expect(document.activeElement).not.toBe(
      screen.getByRole("button", { name: "Account" }),
    );
  });

  it("recovers focus when the auth render replaces the trigger after a completed sign-in closed the modal", async () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Sign In" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText("name@example.com"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText("••••••••"), {
      target: { value: "hunter2" },
    });

    // Email/password flow: the modal closes as soon as signIn resolves,
    // while the trigger is still mounted — focus is restored to it.
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    // A moment later onAuthStateChanged lands: the user appears and the
    // trigger is swapped for account UI in the same render.
    mocks.auth.user = { uid: "user-1" };
    fireEvent.click(screen.getByRole("button", { name: "Swap trigger only" }));

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Account" }),
      ),
    );
  });

  it("does not clamp onto an unrelated (or destructive) action when the replacement cluster is shorter than the captured position", () => {
    function ShellHost() {
      const [phase, setPhase] = useState<"guest" | "account">("guest");
      const [open, setOpen] = useState(false);
      return (
        <div>
          <div data-testid="account-area">
            {phase === "guest" ? (
              <>
                <button type="button">Extra A</button>
                <button type="button">Extra B</button>
                <button type="button" onClick={() => setOpen(true)}>
                  Sign In
                </button>
              </>
            ) : (
              <>
                <button type="button">Sign out</button>
                <button type="button">Delete account</button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setPhase("account");
              setOpen(false);
            }}
          >
            Simulate account swap
          </button>
          <AuthModal isOpen={open} onClose={() => setOpen(false)} />
        </div>
      );
    }

    render(<ShellHost />);
    const trigger = screen.getByRole("button", { name: "Sign In" });
    trigger.focus();
    fireEvent.click(trigger);

    // "Extra A"/"Extra B" precede the trigger, so its captured position (2)
    // no longer exists once the whole cluster shrinks to just two controls
    // in the same host — the old clamp would land on the last one, "Delete
    // account", instead of refusing to guess.
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate account swap" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).not.toBe(
      screen.getByRole("button", { name: "Delete account" }),
    );
  });

  it("recovers focus into a persisted shell when a parent (like the mobile wizard) tears down the trigger's whole subtree right after a completed sign-in", async () => {
    // Mirrors WizardFlow: its own effect reacts to the same `user` change
    // AuthModal does, and unmounts the wizard (trigger included) once
    // sign-in completes — in the same commit as, but after, AuthModal's own
    // child effects (WizardFlowLike is the parent here, same as WizardFlow
    // is AuthModal's parent in the app).
    function WizardFlowLike({ onComplete }: { onComplete: () => void }) {
      const { user } = useAuth();
      const [authOpen, setAuthOpen] = useState(false);
      useEffect(() => {
        if (user) onComplete();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [user]);
      return (
        <div data-testid="wizard">
          <button type="button" onClick={() => setAuthOpen(true)}>
            Create free account
          </button>
          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      );
    }

    function WizardLikeHost() {
      const [showWizard, setShowWizard] = useState(true);
      const [, forceRerender] = useState(0);
      return (
        <div>
          <div data-testid="shell">
            <button type="button">Shell Extra</button>
          </div>
          {showWizard && (
            <WizardFlowLike onComplete={() => setShowWizard(false)} />
          )}
          <button
            type="button"
            onClick={() => forceRerender((n) => n + 1)}
          >
            Notice auth change
          </button>
        </div>
      );
    }

    render(<WizardLikeHost />);
    const trigger = screen.getByRole("button", { name: "Create free account" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText("name@example.com"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText("••••••••"), {
      target: { value: "hunter2" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger.isConnected).toBe(true);

    // onAuthStateChanged lands: AuthModal's own recovery effect runs first
    // (it's the child), sees the trigger still connected, and defers rather
    // than declaring victory. The wizard's own effect (its parent) then
    // unmounts the wizard's whole subtree in the same pass.
    mocks.auth.user = { uid: "user-1" };
    fireEvent.click(screen.getByRole("button", { name: "Notice auth change" }));

    expect(screen.queryByTestId("wizard")).toBeNull();
    expect(trigger.isConnected).toBe(false);
    // The ordinal fallback isn't guaranteed to land on any *specific*
    // surviving control (that's the separate, deferred "safe target" issue)
    // — what this fix guarantees is that focus recovers into the persisted
    // page instead of staying orphaned on the removed trigger or on body.
    expect(document.activeElement).not.toBe(document.body);
    expect(["Shell Extra", "Notice auth change"]).toContain(
      (document.activeElement as HTMLElement | null)?.textContent,
    );
  });
});
