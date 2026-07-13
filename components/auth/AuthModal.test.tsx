import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { AuthModal } from "./AuthModal";

const mocks = vi.hoisted(() => ({
  auth: { user: null as { uid: string } | null },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
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
    expect(document.activeElement).toBe(trigger);

    // A moment later onAuthStateChanged lands: the user appears and the
    // trigger is swapped for account UI in the same render.
    mocks.auth.user = { uid: "user-1" };
    fireEvent.click(screen.getByRole("button", { name: "Swap trigger only" }));

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Account" }),
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
});
