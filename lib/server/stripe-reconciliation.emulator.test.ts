import { randomUUID } from "node:crypto";
import { deleteApp, getApps } from "firebase-admin/app";
import type Stripe from "stripe";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("./firebase-admin", async () => {
  const { getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  return {
    getAdminDb: () => {
      if (!process.env.FIRESTORE_EMULATOR_HOST?.startsWith("127.0.0.1:")) {
        throw new Error("A loopback Firestore emulator is required");
      }
      const app = getApps().find((candidate) => candidate.name === "stripe-reconciliation-test")
        ?? initializeApp({ projectId: "demo-stripe-fix" }, "stripe-reconciliation-test");
      return getFirestore(app);
    },
  };
});

import { getAdminDb } from "./firebase-admin";
import { grantCertificate, hasCertificate } from "./certificate-purchases";
import { grantLeadUnlock, isLeadUnlocked } from "./lead-unlocks";
import { settlePaidLeadCheckout } from "./stripe-paid-lead";
import { reconcileStripeReversal } from "./stripe-reversals";
import { stripeCheckoutRecord } from "./stripe-checkout-record";

afterAll(async () => {
  const app = getApps().find((candidate) => candidate.name === "stripe-reconciliation-test");
  if (app) await deleteApp(app);
});

function checkout(metadata: Record<string, string>, amountTotal: number): Stripe.Checkout.Session {
  const id = randomUUID();
  return {
    id: `cs_test_${id}`, mode: "payment", currency: "usd", amount_total: amountTotal,
    payment_status: "paid", livemode: false, payment_intent: `pi_${id}`, metadata,
  } as Stripe.Checkout.Session;
}

function refundEvent(amount: number): Stripe.RefundCreatedEvent {
  return {
    id: `evt_${randomUUID()}`, type: "refund.created", livemode: false,
    data: { object: { id: "re_test", object: "refund", currency: "usd", amount, status: "succeeded", payment_intent: "pi_test" } },
  } as Stripe.RefundCreatedEvent;
}

function provider(session: Stripe.Checkout.Session, refundedAmounts: number[]) {
  return {
    checkout: { sessions: { list: vi.fn().mockResolvedValue({ data: [session] }) } },
    refunds: {
      async *list() {
        for (const amount of refundedAmounts) yield { status: "succeeded", currency: "usd", amount };
      },
    },
  } as unknown as Stripe;
}

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("Stripe reconciliation transactions", () => {
  it("grants one concurrent lead buyer and submits only one refund for the other", async () => {
    const db = getAdminDb();
    const requestId = randomUUID();
    const builders = ["builder-first", "builder-second"];
    const lead = db.doc(`connectionRequests/${requestId}`);
    await Promise.all([
      lead.set({ status: "submitted", matchedBuilderIds: builders }),
      ...builders.map((builder) => db.doc(`builders/${builder}`).set({ credits: 0 })),
    ]);
    const sessions = builders.map((builderId) => checkout({
      purchaseType: "lead_unlock", builderId, requestId,
    }, 4900));
    const refunds = {
      list: vi.fn().mockResolvedValue({ data: [] }),
      create: vi.fn().mockResolvedValue({ id: "re_blocked", status: "succeeded" }),
    };
    const stripe = { refunds } as unknown as Stripe;
    const outcomes = await Promise.all(sessions.map((session, index) =>
      settlePaidLeadCheckout(stripe, session, builders[index], requestId),
    ));
    const winner = outcomes.indexOf("granted");
    const blocked = outcomes.indexOf("refund_requested");
    expect([...outcomes].sort()).toEqual(["granted", "refund_requested"]);
    expect((await lead.get()).data()?.firstUnlockedBy).toBe(builders[winner]);
    await expect(isLeadUnlocked(builders[winner], requestId)).resolves.toBe(true);
    await expect(isLeadUnlocked(builders[blocked], requestId)).resolves.toBe(false);
    expect((await db.doc(`builders/${builders[blocked]}/ledger/stripe_lead_refund_${sessions[blocked].id}`).get()).data())
      .toMatchObject({ type: "refund", stripeRefundStatus: "succeeded", stripeSessionId: sessions[blocked].id });
    expect(refunds.create).toHaveBeenCalledOnce();
    expect(refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: sessions[blocked].payment_intent }),
      { idempotencyKey: `lotfoundry-lead-refund:${sessions[blocked].id}` },
    );
    await lead.update({ headStartUntil: "2020-01-01T00:00:00.000Z" });
    await expect(settlePaidLeadCheckout(stripe, sessions[blocked], builders[blocked], requestId))
      .resolves.toBe("refund_requested");
    await expect(isLeadUnlocked(builders[blocked], requestId)).resolves.toBe(false);
    expect(refunds.create).toHaveBeenCalledOnce();
  }, 30_000);

  it("records partial reversals and removes a transferred certificate only when fully refunded", async () => {
    const uid = randomUUID();
    const recoveredUid = randomUUID();
    const certKey = "test-certificate";
    const metadata = { purchaseType: "certificate", uid, certKey };
    const session = checkout(metadata, 2900);
    const grant = { uid: recoveredUid, certKey, amount: 2900, stripeSessionId: session.id };
    await grantCertificate(grant);

    const amounts = [1000];
    const stripe = provider(session, amounts);
    await reconcileStripeReversal(stripe, refundEvent(1000));
    const record = stripeCheckoutRecord(getAdminDb(), session.id);
    expect((await record.get()).data()).toMatchObject({ requiresReview: true });
    await expect(hasCertificate(recoveredUid, certKey)).resolves.toBe(true);

    amounts.push(1900);
    const full = refundEvent(1900);
    await Promise.all([reconcileStripeReversal(stripe, full), reconcileStripeReversal(stripe, full)]);
    await expect(hasCertificate(recoveredUid, certKey)).resolves.toBe(false);
    await expect(grantCertificate(grant)).resolves.toBe(false);
    expect((await record.collection("events").get()).size).toBe(2);
    const otherOrder = checkout(metadata, 2900);
    await expect(grantCertificate({ ...grant, stripeSessionId: otherOrder.id })).resolves.toBe(true);
  }, 30_000);

  it("records a credit clawback once and tracks spent credits without debt", async () => {
    const db = getAdminDb();
    const builderId = randomUUID();
    const session = checkout({ purchaseType: "credit_pack", builderId }, 17_500);
    const builder = db.doc(`builders/${builderId}`);
    const purchase = builder.collection("ledger").doc(`${builderId}_${session.id}`);
    await Promise.all([
      builder.set({ credits: 2 }),
      purchase.set({ type: "purchase", creditsChange: 5, stripeSessionId: session.id }),
    ]);
    const stripe = provider(session, [17_500]);
    await Promise.all([
      reconcileStripeReversal(stripe, refundEvent(17_500)),
      reconcileStripeReversal(stripe, refundEvent(17_500)),
    ]);
    expect((await builder.get()).data()?.credits).toBe(0);
    expect((await purchase.get()).exists).toBe(true);
    expect((await builder.collection("ledger").doc(`stripe_reversal_${session.id}`).get()).data())
      .toMatchObject({ type: "refund", creditsChange: -2, shortfall: 3 });
    expect((await stripeCheckoutRecord(db, session.id).get()).data())
      .toMatchObject({ requiresReview: true, leadCreditShortfall: 3 });
  }, 30_000);

  it("handles out-of-order chargeback delivery without deleting another purchase's lead grant", async () => {
    const db = getAdminDb();
    const requestId = randomUUID();
    const builderId = "builder";
    const session = checkout({ purchaseType: "lead_unlock", builderId, requestId }, 4900);
    const replacement = checkout({ purchaseType: "lead_unlock", builderId, requestId }, 4900);
    await db.doc(`connectionRequests/${requestId}`).set({ status: "submitted", matchedBuilderIds: [builderId] });
    const won = {
      id: `evt_${randomUUID()}`, type: "charge.dispute.closed", livemode: false,
      data: { object: { id: "dp_test", object: "dispute", status: "won", currency: "usd", amount: 4900, payment_intent: session.payment_intent } },
    } as Stripe.ChargeDisputeClosedEvent;
    const lost = {
      ...won, id: `evt_${randomUUID()}`, data: { object: { ...won.data.object, status: "lost" } },
    } as Stripe.ChargeDisputeClosedEvent;
    const stripe = provider(session, []);
    await reconcileStripeReversal(stripe, won);
    expect((await stripeCheckoutRecord(db, session.id).get()).data()?.reversedAt).toBeUndefined();
    await reconcileStripeReversal(stripe, lost);
    await expect(grantLeadUnlock({ builderId, requestId, stripeSessionId: session.id, amount: 4900 }))
      .resolves.toEqual({ status: "reversed" });
    await grantLeadUnlock({ builderId, requestId, stripeSessionId: replacement.id, amount: 4900 });
    await reconcileStripeReversal(stripe, { ...lost, id: `evt_${randomUUID()}` });
    expect((await db.doc(`leadUnlocks/${builderId}_${requestId}`).get()).data()?.stripeSessionId)
      .toBe(replacement.id);
  }, 30_000);
});