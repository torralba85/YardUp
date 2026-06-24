import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "yardup-2026";

/**
 * Shared Admin app. On Firebase/Google infra, Application Default Credentials
 * supply the service-account identity that lets Firestore writes bypass
 * security rules (needed for the admin-only `leadUnlocks` grant). Token
 * verification needs only the projectId; `lib/server/api-auth.ts` initializes
 * its own app for that and is left untouched.
 */
export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({ projectId: PROJECT_ID });
}

/**
 * Get the Admin Firestore instance for the shared {@link getAdminApp} app.
 *
 * @returns The Admin SDK {@link Firestore} (writes bypass security rules).
 */
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
