import { getFirestore } from "firebase-admin/firestore";

/**
 * Generates a mock Stripe Connect onboarding URL and updates the builder profile status to 'pending' in Firestore.
 */
export async function getStripeOnboardingUrlHelper(userId: string): Promise<string> {
  const mockUrl = `https://connect.stripe.com/express/oauth/authorize?state=${userId}`;
  
  const db = getFirestore();
  await db.collection("userProfiles").doc(userId).set({
    stripeConnectStatus: "pending",
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return mockUrl;
}

/**
 * Checks the builder profile Stripe status.
 *
 * In mock mode (STRIPE_MOCK_ONBOARDING=true), auto-transitions 'pending' → 'active'
 * to simulate completed onboarding in the emulator or local dev. Firebase Functions
 * run with NODE_ENV=production even in the emulator, so this flag is the only safe
 * way to distinguish mock from real without a real Stripe key.
 *
 * In production, 'pending' stays 'pending' — a real Stripe webhook sets 'active'
 * once the builder completes Express onboarding (to be wired in a follow-up PR).
 */
export async function checkStripeStatusHelper(userId: string): Promise<string> {
  const db = getFirestore();
  const docRef = db.collection("userProfiles").doc(userId);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new Error("User profile not found");
  }

  const data = snap.data();
  let status = data?.stripeConnectStatus || "idle";

  if (status === "pending" && process.env.STRIPE_MOCK_ONBOARDING === "true") {
    status = "active";
    await docRef.update({
      stripeConnectStatus: "active",
      updatedAt: new Date().toISOString(),
    });
  }

  return status;
}
