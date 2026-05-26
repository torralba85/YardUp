import { callCloudFunction, getFirebaseClients } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export interface OnboardingUrlResponse {
  url: string;
}

export interface StripeStatusResponse {
  stripeConnectStatus: "idle" | "pending" | "active";
}

/**
 * Fetches a mock Stripe Express Connect onboarding URL. The backend derives
 * the user from request.auth.uid, so no userId is sent from the client. The
 * caller is responsible for opening the URL (e.g., via Linking.openURL) so
 * this service stays a pure data fetcher and is easy to test/compose.
 */
export async function getStripeOnboardingUrl(userId: string): Promise<string | null> {
  const clients = getFirebaseClients();
  if (!clients) {
    return `https://connect.stripe.com/express/oauth/authorize?state=${userId}`;
  }

  try {
    const res = await callCloudFunction<Record<string, never>, OnboardingUrlResponse>(
      "getStripeOnboardingUrl",
      {},
    );
    return res?.url ?? null;
  } catch (error) {
    console.error("Failed to start Stripe onboarding:", error);
    return null;
  }
}

/**
 * Calls the Cloud Function to verify/update the builder's Stripe status.
 * The backend derives the user from request.auth.uid.
 */
export async function checkStripeStatus(_userId: string): Promise<"idle" | "pending" | "active"> {
  const clients = getFirebaseClients();
  if (!clients) {
    return "active"; // Mock environment auto-transitions to active
  }

  try {
    const res = await callCloudFunction<Record<string, never>, StripeStatusResponse>(
      "checkStripeStatus",
      {},
    );
    return res?.stripeConnectStatus ?? "idle";
  } catch (error) {
    console.error("Failed to check Stripe status:", error);
    return "idle";
  }
}

/**
 * Directly fetches the builder's Stripe Connect status from Firestore.
 */
export async function fetchStripeStatusFromFirestore(userId: string): Promise<"idle" | "pending" | "active"> {
  const clients = getFirebaseClients();
  if (!clients) {
    return "idle";
  }

  try {
    const snap = await getDoc(doc(clients.db, "userProfiles", userId));
    if (snap.exists()) {
      const data = snap.data() as { stripeConnectStatus?: "idle" | "pending" | "active" };
      return data.stripeConnectStatus ?? "idle";
    }
  } catch (error) {
    console.error("Failed to fetch Stripe status from Firestore:", error);
  }
  return "idle";
}
