import { Linking } from "react-native";
import { callCloudFunction, getFirebaseClients } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export interface OnboardingUrlResponse {
  url: string;
}

export interface StripeStatusResponse {
  stripeConnectStatus: "idle" | "pending" | "active";
}

/**
 * Calls the Cloud Function to get a mock Stripe Express Connect onboarding link,
 * records pending status in Firestore, and opens the link using Linking.openURL.
 */
export async function getStripeOnboardingUrl(userId: string): Promise<string | null> {
  const clients = getFirebaseClients();
  if (!clients) {
    // Local mock environment
    const mockUrl = `https://connect.stripe.com/express/oauth/authorize?state=${userId}`;
    const supported = await Linking.canOpenURL(mockUrl);
    if (supported) {
      await Linking.openURL(mockUrl);
    }
    return mockUrl;
  }

  try {
    const res = await callCloudFunction<{ userId: string }, OnboardingUrlResponse>(
      "getStripeOnboardingUrl",
      { userId }
    );
    if (res?.url) {
      const supported = await Linking.canOpenURL(res.url);
      if (supported) {
        await Linking.openURL(res.url);
      }
      return res.url;
    }
  } catch (error) {
    console.error("Failed to start Stripe onboarding:", error);
  }
  return null;
}

/**
 * Calls the Cloud Function to verify/update the builder's Stripe status.
 */
export async function checkStripeStatus(userId: string): Promise<"idle" | "pending" | "active"> {
  const clients = getFirebaseClients();
  if (!clients) {
    // Local mock environment
    return "active"; // Auto-transition mock user to active
  }

  try {
    const res = await callCloudFunction<{ userId: string }, StripeStatusResponse>(
      "checkStripeStatus",
      { userId }
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
