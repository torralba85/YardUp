import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthModal } from "./AuthModal";

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), google: vi.fn(), apple: vi.fn() }));
vi.mock("@/lib/auth-context", () => ({
  CURRENT_LEGAL_CONSENT: { termsVersion: "test", privacyVersion: "test", adultConfirmed: true },
  useAuth: () => ({ user: null, signIn: vi.fn(), signUp: mocks.signUp, signInWithGoogle: mocks.google, signInWithApple: mocks.apple }),
}));

describe("builder registration in the auth modal", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  function openBuilderSignup() {
    render(<AuthModal isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /don't have an account/i }));
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "builder" } });
    fireEvent.click(screen.getByRole("checkbox"));
  }
  it("passes the selected builder role to email registration", async () => {
    openBuilderSignup();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Builder" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "builder@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create free account" }));
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledWith("builder@example.com", "password123", "Builder", "builder", expect.objectContaining({ adultConfirmed: true })));
  });
  it.each(["Google", "Apple"])("passes the builder role to %s registration", async (provider) => {
    openBuilderSignup();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(provider) }));
    await waitFor(() => expect(provider === "Google" ? mocks.google : mocks.apple).toHaveBeenCalledWith("builder", expect.objectContaining({ adultConfirmed: true })));
  });
});
