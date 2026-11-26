import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { deleteApp, getApps } from "firebase-admin/app";

// Real transaction coverage, isolated from production and from the rules suite.
vi.mock("./firebase-admin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  return {
    getAdminDb: () => {
      if (!process.env.FIRESTORE_EMULATOR_HOST?.startsWith("127.0.0.1:")) {
        throw new Error("A loopback Firestore emulator is required");
      }
      const app = getApps().find((app) => app.name === "certificate-transfer-test")
        ?? initializeApp({ projectId: "demo-lotfoundry-rules" }, "certificate-transfer-test");
      return getFirestore(app);
    },
    getAdminApp: () => { throw new Error("Use the injected test identity lookup"); },
  };
});

import { claimCertificatesByVerifiedEmail, grantCertificate, hasCertificate } from "./certificate-purchases";
import { getAdminDb } from "./firebase-admin";
import { pseudonymizePurchaseRecords } from "./deleted-account-purchases";

afterAll(async () => {
  const app = getApps().find((app) => app.name === "certificate-transfer-test");
  if (app) await deleteApp(app);
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("certificate recovery transactions", () => {
  it("allows one concurrent claimant and never resurrects access on payment replay", async () => {
    const id = randomUUID();
    const sourceUid = `guest-${id}`;
    const sessionId = `cs_${id}`;
    const grant = { uid: sourceUid, certKey: "lot-1", stripeSessionId: sessionId, amount: 2900, buyerEmail: "buyer@example.test", anonymousCheckout: true };
    await grantCertificate(grant);
    const deps = {
      getAuthUser: async () => null,
      retrieveSession: async () => ({
        id: sessionId, mode: "payment", status: "complete", payment_status: "paid",
        currency: "usd", amount_total: 2900, customer_details: { email: grant.buyerEmail },
        metadata: { uid: sourceUid, certKey: "lot-1", purchaseType: "certificate" },
      }) as never,
    };
    const targets = [`member-a-${id}`, `member-b-${id}`];
    await Promise.all(targets.map((targetUid) => claimCertificatesByVerifiedEmail({ targetUid, verifiedEmail: grant.buyerEmail }, deps)));
    expect((await Promise.all(targets.map((uid) => hasCertificate(uid, "lot-1")))).filter(Boolean)).toHaveLength(1);
    expect(await hasCertificate(sourceUid, "lot-1")).toBe(false);
    expect(await grantCertificate(grant)).toBe(false);
    expect(await hasCertificate(sourceUid, "lot-1")).toBe(false);
    expect(await grantCertificate({ ...grant, stripeSessionId: `cs_new_${id}` })).toBe(true);
  }, 30_000);

  it("never restores a deleted account's email or address on payment replay", async () => {
    const id = randomUUID();
    const uid = `deleting-${id}`;
    const grant = { uid, certKey: "lot-1", stripeSessionId: `cs_${id}`, amount: 2900, address: "1 Elm St", buyerEmail: "buyer@example.test" };
    expect(await grantCertificate(grant)).toBe(true);
    await pseudonymizePurchaseRecords(getAdminDb(), uid);

    expect(await grantCertificate(grant)).toBe(false);
    expect(await hasCertificate(uid, "lot-1")).toBe(false);
    const records = await getAdminDb().collection("certificatePurchases").where("uid", "==", uid).get();
    expect(records.docs).toHaveLength(1);
    expect(records.docs[0].data()).not.toHaveProperty("address");
    expect(records.docs[0].data()).not.toHaveProperty("buyerEmail");
  }, 30_000);
});
