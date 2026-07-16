import { describe, expect, it } from "vitest";
import { getAuthErrorCode, getAuthErrorMessage } from "./auth-errors";

describe("getAuthErrorMessage", () => {
  it("explains App Check / reCAPTCHA failures for local dev", () => {
    expect(getAuthErrorMessage("appCheck/recaptcha-error")).toMatch(/App Check/i);
    expect(getAuthErrorMessage("appCheck/recaptcha-error")).toMatch(
      /APPCHECK_DEBUG_TOKEN/i,
    );
  });

  it("explains unauthorized domain", () => {
    expect(getAuthErrorMessage("auth/unauthorized-domain")).toMatch(
      /Authorized domains/i,
    );
  });
});

describe("getAuthErrorCode", () => {
  it("reads Firebase-style codes", () => {
    expect(getAuthErrorCode({ code: "auth/popup-blocked" })).toBe(
      "auth/popup-blocked",
    );
    expect(getAuthErrorCode(new Error("nope"))).toBeNull();
  });
});
