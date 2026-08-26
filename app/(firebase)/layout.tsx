import { AuthProvider } from "@/lib/auth-context";

/**
 * Layout for every surface that actually reads Firebase.
 *
 * The Firebase client SDK (auth + Firestore + App Check) is ~479 KB, and
 * `AuthProvider` used to sit in the root layout, so the marketing landing
 * downloaded and initialized all of it without a single `useAuth` consumer on
 * the page. Scoping the provider to this route group keeps that payload off
 * `/`, `/about`, `/help`, `/terms`, and `/privacy`.
 *
 * The group parentheses are organizational only — every route inside keeps its
 * original URL (`app/(firebase)/studio` still serves `/studio`).
 *
 * Anything added here that calls `useAuth`, or renders a component that does,
 * belongs inside this group.
 */
export default function FirebaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
