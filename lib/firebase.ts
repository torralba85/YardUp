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
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
    "yardup-2026.firebaseapp.com",
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

if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
  const appCheckGlobal = globalThis as typeof globalThis & {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
    __lotFoundryAppCheckInitialized?: boolean;
  };

  if (!appCheckGlobal.__lotFoundryAppCheckInitialized) {
    if (appCheckDebugToken) {
      appCheckGlobal.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
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
