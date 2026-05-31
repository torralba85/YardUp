import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqUcyMOM_sS77xVkwFIxqgAjv8hKksrJc",
  authDomain: "yardup-2026.firebaseapp.com",
  projectId: "yardup-2026",
  storageBucket: "yardup-2026.firebasestorage.app",
  messagingSenderId: "166268911022",
  appId: "1:166268911022:web:08b5493550c6f176305c3f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
