import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { AuthModal } from "./AuthModal";

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));

/**
 * Host that mirrors StudioShell/MobileHeader: the sign-in trigger and the
 * account control swap inside a stable container when auth state changes.
 */
function Host() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div data-testid="slot">
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
      <AuthModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}

describe("AuthModal focus restore", () => {
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

  it("moves focus to the trigger's replacement when sign-in unmounts it", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Sign In" });
    trigger.focus();
    fireEvent.click(trigger);

    // Successful sign-in: the trigger is replaced by account UI and the
    // modal closes in the same update.
    fireEvent.click(screen.getByRole("button", { name: "Simulate sign-in" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Account" }),
    );
  });
});
