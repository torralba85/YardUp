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
 * Checks the builder profile Stripe status and transitions it to 'active' if it was 'pending'.
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

  if (status === "pending") {
    status = "active";
    await docRef.update({
      stripeConnectStatus: "active",
      updatedAt: new Date().toISOString(),
    });
  }

  return status;
}
