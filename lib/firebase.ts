import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function envOrFallback(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

const firebaseConfig = {
  apiKey: envOrFallback(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "AIzaSyDqUcyMOM_sS77xVkwFIxqgAjv8hKksrJc",
  ),
  authDomain: envOrFallback(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "yardup-2026.firebaseapp.com",
  ),
  projectId: envOrFallback("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "yardup-2026"),
  storageBucket: envOrFallback(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "yardup-2026.firebasestorage.app",
  ),
  messagingSenderId: envOrFallback(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "166268911022",
  ),
  appId: envOrFallback(
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "1:166268911022:web:08b5493550c6f176305c3f",
  ),
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
