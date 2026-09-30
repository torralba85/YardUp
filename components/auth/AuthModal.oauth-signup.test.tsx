import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthModal } from "./AuthModal";

const mocks = vi.hoisted(() => ({
  google: vi.fn(),
  apple: vi.fn(),
  additionalUserInfo: vi.fn(),
  signupSucceeded: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  CURRENT_LEGAL_CONSENT: { termsVersion: "test", privacyVersion: "test", adultConfirmed: true },
  useAuth: () => ({
    user: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: mocks.google,
    signInWithApple: mocks.apple,
  }),
}));

vi.mock("firebase/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/auth")>()),
  getAdditionalUserInfo: mocks.additionalUserInfo,
}));

vi.mock("@/lib/analytics/events", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics/events")>()),
  trackSignupSucceeded: mocks.signupSucceeded,
}));

describe("OAuth sign-up conversion tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const credential = { user: { uid: "u1" } };
    mocks.google.mockResolvedValue(credential);
    mocks.apple.mockResolvedValue(credential);
  });

  function continueWith(provider: string) {
    const onClose = vi.fn();
    render(<AuthModal isOpen onClose={onClose} initialMode="sign-up" analyticsSource="guest_limit" />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(provider) }));
    return onClose;
  }

  it.each(["Google", "Apple"])("records a sign-up when %s creates a new account", async (provider) => {
    mocks.additionalUserInfo.mockReturnValue({ isNewUser: true });
    const onClose = continueWith(provider);
    await waitFor(() => expect(onClose).toHaveBeenCalledWith("signed-in"));
    expect(mocks.signupSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({ method: provider.toLowerCase(), source: "guest_limit" }),
    );
  });

  it.each(["Google", "Apple"])("does not record a sign-up when %s signs in an existing account", async (provider) => {
    mocks.additionalUserInfo.mockReturnValue({ isNewUser: false });
    const onClose = continueWith(provider);
    await waitFor(() => expect(onClose).toHaveBeenCalledWith("signed-in"));
    expect(mocks.signupSucceeded).not.toHaveBeenCalled();
  });
});
