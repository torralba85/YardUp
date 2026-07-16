/**
 * Map Firebase Auth (and related App Check) error codes to user-facing copy.
 */

export function getAuthErrorMessage(code: string, fallback?: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/operation-not-allowed":
      return "That sign-in method is not enabled for this Firebase project yet.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Firebase sign-in. Add localhost (and your host) under Authentication → Settings → Authorized domains.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was closed before it finished.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists for this email using another sign-in method.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    case "auth/internal-error":
      return "Sign-in failed (Firebase internal error). On local dev this is often App Check — set NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN in .env.local.";
    case "appCheck/recaptcha-error":
    case "appCheck/fetch-status-error":
    case "appCheck/throttled":
      return "App Check / reCAPTCHA failed. For local login, register a debug token in Firebase App Check and set NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN in .env.local.";
    case "permission-denied":
      return "Signed in, but profile setup was blocked. Please try again.";
    default:
      return fallback || "Something went wrong. Please try again.";
  }
}

/** Extract a Firebase-style error code from an unknown thrown value. */
export function getAuthErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  if ("code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return null;
}
