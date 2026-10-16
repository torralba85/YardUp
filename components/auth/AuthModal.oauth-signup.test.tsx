import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthModal } from "./AuthModal";

const mocks = vi.hoisted(() => ({
  google: vi.fn(),
  apple: vi.fn(),
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

vi.mock("@/lib/analytics/events", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics/events")>()),
  trackSignupSucceeded: mocks.signupSucceeded,
}));

describe("OAuth sign-up conversion tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APPLE_SIGN_IN", "true");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function resolveSignIn(profileCreated: boolean) {
    const credential = { user: { uid: "u1" }, profileCreated };
    mocks.google.mockResolvedValue(credential);
    mocks.apple.mockResolvedValue(credential);
  }

  function continueWith(provider: string) {
    const onClose = vi.fn();
    render(<AuthModal isOpen onClose={onClose} initialMode="sign-up" analyticsSource="guest_limit" />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(provider) }));
    return onClose;
  }

  it.each(["Google", "Apple"])("records a sign-up when %s registers the account", async (provider) => {
    resolveSignIn(true);
    const onClose = continueWith(provider);
    await waitFor(() => expect(onClose).toHaveBeenCalledWith("signed-in"));
    expect(mocks.signupSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({ method: provider.toLowerCase(), source: "guest_limit" }),
    );
  });

  it.each(["Google", "Apple"])("does not record a sign-up when %s signs in a registered account", async (provider) => {
    resolveSignIn(false);
    const onClose = continueWith(provider);
    await waitFor(() => expect(onClose).toHaveBeenCalledWith("signed-in"));
    expect(mocks.signupSucceeded).not.toHaveBeenCalled();
  });
});
