import { initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAI, GoogleAIBackend } from "firebase/ai";

// NEXT_PUBLIC_* vars must be referenced statically so Next.js inlines them
// into the browser bundle at build time — a dynamic process.env[key] lookup
// is not replaced by the compiler and resolves to undefined in the browser.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
    "AIzaSyDqUcyMOM_sS77xVkwFIxqgAjv8hKksrJc",
  // Use the verified same-site helper. Switch to auth.lotfoundry.net only
  // after its DNS, Hosting certificate and OAuth redirects are provisioned
  // (docs/cloudflare-dns.md). Publishing the subdomain before that makes
  // social sign-in unreachable. Android app-link isolation remains pending.
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
    "lotfoundry.net",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "yardup-2026",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    "yardup-2026.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    "166268911022",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ||
    "1:166268911022:web:08b5493550c6f176305c3f",
};

const app = initializeApp(firebaseConfig);

const appCheckSiteKey =
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim() ||
  "6Ld8T1AtAAAAAJNbNuVPFb0CxBTE42cRerKUk9ra";
const appCheckDebugToken =
  process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim();

/**
 * App Check must initialize before Auth/Firestore usage when enforcement is on.
 *
 * Localhost cannot satisfy reCAPTCHA Enterprise without a **debug token**:
 * 1. Run the app once with the debug flag (see below) and copy the UUID logged
 *    as "App Check debug token".
 * 2. Firebase Console → App Check → Manage debug tokens → register that UUID.
 * 3. Put it in `.env.local` as NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=…
 * 4. Restart `npm run dev`.
 *
 * Never ship a debug token in production builds.
 */
if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
  const appCheckGlobal = globalThis as typeof globalThis & {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
    __lotFoundryAppCheckInitialized?: boolean;
  };

  if (!appCheckGlobal.__lotFoundryAppCheckInitialized) {
    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (appCheckDebugToken) {
      appCheckGlobal.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
    } else if (isLocalHost || process.env.NODE_ENV === "development") {
      // `true` makes the SDK mint a debug token and print it to the console
      // once — register that value in Firebase App Check, then pin it in env.
      appCheckGlobal.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.warn(
        "[LotFoundry] App Check debug mode is on for local dev. " +
          "Copy the App Check debug token from the console, register it in " +
          "Firebase → App Check → Manage debug tokens, then set " +
          "NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN in .env.local and restart. " +
          "Without that, Google/email sign-in fails with recaptcha-error.",
      );
    }

    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.error("[LotFoundry] App Check failed to initialize:", err);
    }
    appCheckGlobal.__lotFoundryAppCheckInitialized = true;
  }
}

/** The Firebase Authentication instance for the client app. */
export const auth = getAuth(app);
/** The Firestore database instance for the client app. */
export const db = getFirestore(app);
/** Firebase AI Logic handle (Gemini Developer API backend) for client-side AI calls. */
export const ai = getAI(app, { backend: new GoogleAIBackend() });
export { app };
