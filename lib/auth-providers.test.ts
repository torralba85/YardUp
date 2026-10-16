import { afterEach, describe, expect, it, vi } from "vitest";
import { isAppleSignInEnabled } from "./auth-providers";

describe("isAppleSignInEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off when the build does not opt in", () => {
    vi.stubEnv("NEXT_PUBLIC_APPLE_SIGN_IN", undefined);
    expect(isAppleSignInEnabled()).toBe(false);
  });

  it.each(["", "false", "1", "TRUE", "yes"])("stays off for %j", (value) => {
    vi.stubEnv("NEXT_PUBLIC_APPLE_SIGN_IN", value);
    expect(isAppleSignInEnabled()).toBe(false);
  });

  it("is on only for the exact value true", () => {
    vi.stubEnv("NEXT_PUBLIC_APPLE_SIGN_IN", "true");
    expect(isAppleSignInEnabled()).toBe(true);
  });
});
