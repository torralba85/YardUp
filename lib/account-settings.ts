import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";

/**
 * What the signed-in user is allowed to edit, derived from their linked
 * sign-in providers. Password accounts manage credentials with LotFoundry;
 * Google/Apple-only accounts manage them with the identity provider.
 */
export interface AccountCapabilities {
  canChangeEmail: boolean;
  canChangePassword: boolean;
  managedBy: "LotFoundry" | "Google" | "Apple";
}

/**
 * Derive account capabilities from the user's linked providers.
 *
 * A linked `password` provider always wins: those accounts can change email
 * and password here. Otherwise the account is managed by the social provider
 * (Apple checked before the Google fallback).
 */
export function getAccountCapabilities(
  providers: Array<{ providerId: string }>,
): AccountCapabilities {
  const ids = new Set(providers.map((provider) => provider.providerId));
  if (ids.has("password")) {
    return { canChangeEmail: true, canChangePassword: true, managedBy: "LotFoundry" };
  }
  if (ids.has("apple.com")) {
    return { canChangeEmail: false, canChangePassword: false, managedBy: "Apple" };
  }
  return { canChangeEmail: false, canChangePassword: false, managedBy: "Google" };
}

/** Validate a display name; returns an error message or `null` when valid. */
export function validateDisplayName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Enter your name.";
  if (name.length > 100) return "Name must be 100 characters or fewer.";
  return null;
}

/** Validate an email address; returns an error message or `null` when valid. */
export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter an email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

/** Validate a new password; returns an error message or `null` when valid. */
export function validateNewPassword(value: string): string | null {
  if (value.length < 8) return "Password must be at least 8 characters.";
  return null;
}

/**
 * Re-verify the user's current password before a sensitive change.
 * Firebase requires a recent login for email/password mutations; failing here
 * surfaces as `auth/wrong-password` without touching the account.
 */
async function reauthenticate(user: User, currentPassword: string): Promise<void> {
  const credential = EmailAuthProvider.credential(user.email ?? "", currentPassword);
  await reauthenticateWithCredential(user, credential);
}

/** Write a trimmed display name to the Firebase Auth profile. */
export async function updateAccountName(user: User, displayName: string): Promise<void> {
  const name = displayName.trim();
  const error = validateDisplayName(name);
  if (error) throw new Error(error);
  await updateProfile(user, { displayName: name });
}

/**
 * Start an email change: reauthenticate, then send a verification link to the
 * new address. The account email only changes after the user confirms it.
 */
export async function changeAccountEmail(
  user: User,
  email: string,
  currentPassword: string,
): Promise<void> {
  const nextEmail = email.trim();
  const error = validateEmail(nextEmail);
  if (error) throw new Error(error);
  await reauthenticate(user, currentPassword);
  await verifyBeforeUpdateEmail(user, nextEmail);
}

/** Change the account password after reauthenticating with the current one. */
export async function changeAccountPassword(
  user: User,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const error = validateNewPassword(nextPassword);
  if (error) throw new Error(error);
  await reauthenticate(user, currentPassword);
  await updatePassword(user, nextPassword);
}

/** Send a verification email for the user's current address. */
export async function sendVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}
