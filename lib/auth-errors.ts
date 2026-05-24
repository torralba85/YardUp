export function describeAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks off. Double-check and try again.";
    case "auth/missing-password":
      return "Enter a password.";
    case "auth/weak-password":
      return "Passwords need to be at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account already exists for that email. Try logging in.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before finishing.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and retry.";
    default:
      if (err instanceof Error && err.message) return err.message;
      return "Something went wrong. Try again.";
  }
}
