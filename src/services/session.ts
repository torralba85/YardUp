import { signInAnonymously } from "firebase/auth";

import { getFirebaseClients } from "./firebase";

export async function ensureFirebaseSession(): Promise<boolean> {
  const clients = getFirebaseClients();
  if (!clients) {
    return false;
  }

  if (clients.auth.currentUser) {
    return true;
  }

  await signInAnonymously(clients.auth);
  return true;
}
