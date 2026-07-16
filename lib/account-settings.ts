/**
 * Account settings boundary: provider capabilities and validation for member
 * profile/security controls. UI and Auth context consume these pure helpers.
 */

export interface AccountCapabilities {
  canChangeEmail: boolean;
  canChangePassword: boolean;
  managedBy: "LotFoundry" | "Google" | "Apple";
}

/**
 * Derive editable security capabilities from Firebase Auth provider data.
 *
 * Password accounts can change email/password in-app. Google- and Apple-only
 * accounts manage credentials with the identity provider.
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

/**
 * Validate a display name for profile updates.
 *
 * @returns An error message, or `null` when valid.
 */
export function validateDisplayName(value: string): string | null {
  const name = value.trim();
  if (!name) return "Enter your name.";
  if (name.length > 100) return "Name must be 100 characters or fewer.";
  return null;
}

/**
 * Validate a new password for account security updates.
 *
 * @returns An error message, or `null` when valid.
 */
export function validatePassword(value: string): string | null {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be 128 characters or fewer.";
  return null;
}

/**
 * Validate an email address shape for profile email changes.
 *
 * @returns An error message, or `null` when valid.
 */
export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter your email.";
  if (email.length > 254) return "Email must be 254 characters or fewer.";
  // Practical shape check; Firebase enforces the final authority.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}
