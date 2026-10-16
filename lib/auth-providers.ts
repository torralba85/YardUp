/**
 * Whether the web sign-in surfaces offer Apple.
 *
 * Off unless the build sets `NEXT_PUBLIC_APPLE_SIGN_IN=true`. Sign in with
 * Apple needs a paid Apple Developer membership for its Services ID and key,
 * and the `apple.com` provider is not configured in Firebase Auth yet, so the
 * button could only fail. Turn it on once that provider is live.
 *
 * Read statically so Next.js inlines it into the client bundle.
 *
 * @returns `true` only when the flag is exactly `"true"`.
 */
export function isAppleSignInEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APPLE_SIGN_IN === "true";
}
