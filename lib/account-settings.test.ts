import { describe, expect, it } from "vitest";
import {
  getAccountCapabilities,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from "./account-settings";

describe("getAccountCapabilities", () => {
  it("marks password accounts as email and password editable", () => {
    expect(getAccountCapabilities([{ providerId: "password" }])).toEqual({
      canChangeEmail: true,
      canChangePassword: true,
      managedBy: "LotFoundry",
    });
  });

  it("marks Google-only accounts as provider managed", () => {
    expect(getAccountCapabilities([{ providerId: "google.com" }])).toEqual({
      canChangeEmail: false,
      canChangePassword: false,
      managedBy: "Google",
    });
  });

  it("marks Apple-only accounts as provider managed", () => {
    expect(getAccountCapabilities([{ providerId: "apple.com" }])).toEqual({
      canChangeEmail: false,
      canChangePassword: false,
      managedBy: "Apple",
    });
  });

  it("prefers password capabilities when password is linked alongside OAuth", () => {
    expect(
      getAccountCapabilities([
        { providerId: "google.com" },
        { providerId: "password" },
      ]),
    ).toEqual({
      canChangeEmail: true,
      canChangePassword: true,
      managedBy: "LotFoundry",
    });
  });
});

describe("validateDisplayName", () => {
  it("rejects blank and overlong display names", () => {
    expect(validateDisplayName("  ")).toBe("Enter your name.");
    expect(validateDisplayName("x".repeat(101))).toBe("Name must be 100 characters or fewer.");
  });

  it("accepts a normal name", () => {
    expect(validateDisplayName(" Alma Reyes ")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("enforces length bounds", () => {
    expect(validatePassword("short")).toBe("Password must be at least 8 characters.");
    expect(validatePassword("x".repeat(129))).toBe("Password must be 128 characters or fewer.");
    expect(validatePassword("long-enough")).toBeNull();
  });
});

describe("validateEmail", () => {
  it("rejects blank and malformed emails", () => {
    expect(validateEmail(" ")).toBe("Enter your email.");
    expect(validateEmail("not-an-email")).toBe("Enter a valid email address.");
    expect(validateEmail("you@example.com")).toBeNull();
  });
});
