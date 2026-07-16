import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import {
  changeAccountEmail,
  changeAccountPassword,
  getAccountCapabilities,
  sendVerification,
  updateAccountName,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
} from "./account-settings";

const authMocks = vi.hoisted(() => ({
  credential: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  sendEmailVerification: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: { credential: authMocks.credential },
  reauthenticateWithCredential: authMocks.reauthenticateWithCredential,
  sendEmailVerification: authMocks.sendEmailVerification,
  updatePassword: authMocks.updatePassword,
  updateProfile: authMocks.updateProfile,
  verifyBeforeUpdateEmail: authMocks.verifyBeforeUpdateEmail,
}));

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    uid: "user-1",
    email: "owner@example.com",
    displayName: "Alma Reyes",
    ...overrides,
  } as User;
}

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

  it("marks Apple-only accounts as provider managed by Apple", () => {
    expect(getAccountCapabilities([{ providerId: "apple.com" }])).toEqual({
      canChangeEmail: false,
      canChangePassword: false,
      managedBy: "Apple",
    });
  });

  it("treats a linked password provider as editable even alongside Google", () => {
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

describe("validation", () => {
  it("rejects blank and overlong display names", () => {
    expect(validateDisplayName("  ")).toBe("Enter your name.");
    expect(validateDisplayName("x".repeat(101))).toBe(
      "Name must be 100 characters or fewer.",
    );
    expect(validateDisplayName("Alma Reyes")).toBeNull();
  });

  it("rejects malformed email addresses", () => {
    expect(validateEmail("")).toBe("Enter an email address.");
    expect(validateEmail("not-an-email")).toBe("Enter a valid email address.");
    expect(validateEmail("owner@example.com")).toBeNull();
  });

  it("rejects short new passwords", () => {
    expect(validateNewPassword("12345")).toBe(
      "Password must be at least 8 characters.",
    );
    expect(validateNewPassword("longenough1")).toBeNull();
  });
});

describe("account mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.credential.mockReturnValue("cred-1");
    authMocks.reauthenticateWithCredential.mockResolvedValue(undefined);
    authMocks.updatePassword.mockResolvedValue(undefined);
    authMocks.updateProfile.mockResolvedValue(undefined);
    authMocks.verifyBeforeUpdateEmail.mockResolvedValue(undefined);
    authMocks.sendEmailVerification.mockResolvedValue(undefined);
  });

  it("trims the display name before writing the Auth profile", async () => {
    const user = fakeUser();
    await updateAccountName(user, "  Alma Reyes  ");
    expect(authMocks.updateProfile).toHaveBeenCalledWith(user, {
      displayName: "Alma Reyes",
    });
  });

  it("reauthenticates before sending the change-email verification", async () => {
    const user = fakeUser();
    await changeAccountEmail(user, "next@example.com", "current-pass");
    expect(authMocks.credential).toHaveBeenCalledWith(
      "owner@example.com",
      "current-pass",
    );
    expect(authMocks.reauthenticateWithCredential).toHaveBeenCalledWith(
      user,
      "cred-1",
    );
    expect(authMocks.verifyBeforeUpdateEmail).toHaveBeenCalledWith(
      user,
      "next@example.com",
    );
    expect(
      authMocks.reauthenticateWithCredential.mock.invocationCallOrder[0],
    ).toBeLessThan(authMocks.verifyBeforeUpdateEmail.mock.invocationCallOrder[0]);
  });

  it("does not send a change-email verification when reauth fails", async () => {
    authMocks.reauthenticateWithCredential.mockRejectedValue(
      new Error("auth/wrong-password"),
    );
    await expect(
      changeAccountEmail(fakeUser(), "next@example.com", "bad-pass"),
    ).rejects.toThrow();
    expect(authMocks.verifyBeforeUpdateEmail).not.toHaveBeenCalled();
  });

  it("reauthenticates then updates the password", async () => {
    const user = fakeUser();
    await changeAccountPassword(user, "current-pass", "next-pass-123");
    expect(authMocks.reauthenticateWithCredential).toHaveBeenCalledWith(
      user,
      "cred-1",
    );
    expect(authMocks.updatePassword).toHaveBeenCalledWith(user, "next-pass-123");
  });

  it("sends an address verification email", async () => {
    const user = fakeUser();
    await sendVerification(user);
    expect(authMocks.sendEmailVerification).toHaveBeenCalledWith(user);
  });
});
