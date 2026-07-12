import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { AuthModal } from "./AuthModal";

const mocks = vi.hoisted(() => ({
  auth: { user: null as { uid: string } | null },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
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
          <button type="button">Account</button>
        ) : (
          <button type="button" onClick={() => setOpen(true)}>
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

  it("recovers focus when the auth render replaces the trigger after the modal closed", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Sign In" });
    trigger.focus();
    fireEvent.click(trigger);

    // Email/password flow: the modal closes as soon as signIn resolves, while
    // the trigger is still mounted — focus is restored to it.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);

    // A moment later onAuthStateChanged lands: the user appears and the
    // trigger is swapped for account UI in the same render.
    mocks.auth.user = { uid: "user-1" };
    fireEvent.click(screen.getByRole("button", { name: "Swap trigger only" }));

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Account" }),
    );
  });
});
