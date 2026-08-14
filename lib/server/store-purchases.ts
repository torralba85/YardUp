/**
 * Server-side store purchase verification and idempotent entitlement grants.
 *
 * Apple / Google receipts are verified by {@link createDefaultStoreVerifier}
 * (demo tokens in test/demo mode; real JWS / Play API when credentials are set).
 * Certificate products with a `certKey` write `certificatePurchases/{uid}_{certKey}`
 * so {@link useCertificateAccess} unlocks the certificate after refresh.
 */

import { FieldValue } from "firebase-admin/firestore";
import { getStoreProduct } from "@/lib/commerce/products";
import type { PurchaseChannel } from "@/lib/commerce/purchase-channel";
import { grantCertificate } from "./certificate-purchases";
import { getAdminDb } from "./firebase-admin";
import { purchaseTokenHash } from "./purchase-token-hash";
import {
  parseDemoReceiptToken,
  verifyAppleSignedTransaction,
  verifyGooglePlayPurchase,
} from "./store-receipt-verifiers";

export interface PurchaseGrant {
  id: string;
  uid: string;
  platform: PurchaseChannel;
  productId: string;
  credits: number;
  certificateCredits: number;
  transactionId: string;
  createdAt: string;
  /** Lot certificate key when this grant unlocked a certificate. */
  certKey?: string;
}

export interface VerifyPurchaseInput {
  uid: string;
  platform: PurchaseChannel;
  productId: string;
  token: string;
  /**
   * Required for certificate products so the grant lands in
   * `certificatePurchases` (what the studio unlock hook reads).
   */
  certKey?: string;
}

export type VerifyPurchaseResult =
  | { ok: true; grant: PurchaseGrant; replay: boolean }
  | { ok: false; error: string; status: number };

export interface StorePurchaseVerifier {
  verifyApple: (input: {
    productId: string;
    token: string;
  }) => Promise<{ transactionId: string } | { error: string }>;
  verifyGoogle: (input: {
    productId: string;
    token: string;
  }) => Promise<{ transactionId: string } | { error: string }>;
}

/**
 * Default verifiers: demo tokens in test/demo mode; real Apple JWS / Play API
 * when platform credentials are configured. Setting APPLE_BUNDLE_ID or
 * GOOGLE_PLAY_* enables real verification — it does **not** permanently fail.
 */
export function createDefaultStoreVerifier(
  fetchImpl: typeof fetch = fetch,
): StorePurchaseVerifier {
  return {
    async verifyApple({ productId, token }) {
      const configuredBundle = process.env.APPLE_BUNDLE_ID;
      const bundleId = configuredBundle || "com.lotfoundry.app";
      const result = verifyAppleSignedTransaction({ productId, token, bundleId });
      if ("transactionId" in result) return result;
      if (!configuredBundle && !parseDemoReceiptToken(token)) {
        return { error: "App Store verification is not configured." };
      }
      return result;
    },
    async verifyGoogle({ productId, token }) {
      const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
      const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
      if (!packageName || !serviceAccountJson) {
        const demoId = parseDemoReceiptToken(token);
        if (demoId) return { transactionId: `google:${demoId}:${productId}` };
        return { error: "Google Play verification is not configured." };
      }
      return verifyGooglePlayPurchase(
        { productId, token, packageName, serviceAccountJson },
        fetchImpl,
      );
    },
  };
}

/**
 * Verify a store receipt and grant entitlements exactly once per
 * `platform:transactionId`. Certificate products with `certKey` also write
 * the studio unlock doc via {@link grantCertificate}.
 */
export async function verifyAndGrantPurchase(
  input: VerifyPurchaseInput,
  verifier: StorePurchaseVerifier = createDefaultStoreVerifier(),
): Promise<VerifyPurchaseResult> {
  if (input.platform === "web") {
    return {
      ok: false,
      error: "Web purchases use Stripe Checkout, not the store verify route.",
      status: 400,
    };
  }

  const product = getStoreProduct(input.productId);
  if (!product) {
    return { ok: false, error: "Unknown product.", status: 400 };
  }

  if (!input.token || input.token.length < 4) {
    return { ok: false, error: "Missing purchase token.", status: 400 };
  }

  const certKey = input.certKey?.trim() || undefined;
  // Single-certificate SKU must bind to a lot; otherwise the studio unlock
  // hook (certificatePurchases) never sees a grant.
  if (product.certificateCredits > 0 && product.leadCredits === 0 && !certKey) {
    return {
      ok: false,
      error: "certKey is required to unlock a certificate purchase.",
      status: 400,
    };
  }

  const verified =
    input.platform === "app-store"
      ? await verifier.verifyApple({
          productId: input.productId,
          token: input.token,
        })
      : await verifier.verifyGoogle({
          productId: input.productId,
          token: input.token,
        });

  if ("error" in verified) {
    return { ok: false, error: verified.error, status: 400 };
  }

  const grantId = `${input.platform}:${verified.transactionId}`;
  const db = getAdminDb();
  const grantRef = db.collection("purchaseGrants").doc(grantId);
  const now = new Date().toISOString();
  let replayUidMismatch = false;

  const grant: PurchaseGrant = {
    id: grantId,
    uid: input.uid,
    platform: input.platform,
    productId: input.productId,
    credits: product.leadCredits,
    certificateCredits: product.certificateCredits,
    transactionId: verified.transactionId,
    createdAt: now,
    ...(certKey ? { certKey } : {}),
  };

  try {
    const outcome = await db.runTransaction(async (tx) => {
      const existing = await tx.get(grantRef);
      if (existing.exists) {
        const data = existing.data() as PurchaseGrant;
        // A transaction id belongs to exactly one account: replaying another
        // user's receipt must never grant or reveal anything.
        if (data.uid !== input.uid) {
          replayUidMismatch = true;
          return { grant, replay: true };
        }
        return {
          grant: {
            ...grant,
            ...data,
            id: grantId,
            // Replays honor only the certKey recorded at grant time; a
            // client-supplied certKey on a replay must not unlock new lots.
            certKey: data.certKey,
          },
          replay: true,
        };
      }

      tx.create(grantRef, {
        ...grant,
        // Indexed so a voided-purchase notification — which carries only a
        // purchase token and order id — can find this grant even when the
        // grant was keyed by something other than the order id.
        purchaseTokenHash: purchaseTokenHash(input.token),
        createdAtServer: FieldValue.serverTimestamp(),
      });

      if (product.leadCredits > 0) {
        const builderRef = db.collection("builders").doc(input.uid);
        const builderSnap = await tx.get(builderRef);
        if (builderSnap.exists) {
          tx.update(builderRef, {
            credits: FieldValue.increment(product.leadCredits),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      // Balance ledger for multi-credit packs (no single certKey).
      if (product.certificateCredits > 0 && !certKey) {
        const certBalRef = db.collection("certificateCredits").doc(input.uid);
        tx.set(
          certBalRef,
          {
            uid: input.uid,
            balance: FieldValue.increment(product.certificateCredits),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      return { grant, replay: false };
    });

    if (replayUidMismatch) {
      return {
        ok: false,
        error: "This purchase belongs to a different account.",
        status: 403,
      };
    }

    // Unlock the studio certificate for this lot — same collection the client
    // hook reads. Idempotent via grantCertificate create(). Always attempt
    // after a successful ledger write (including replay) so a partial prior
    // failure cannot leave the certificate locked. On replay this uses the
    // certKey recorded at grant time, never the client-supplied one.
    const grantCertKey = outcome.replay ? outcome.grant.certKey : certKey;
    if (product.certificateCredits > 0 && grantCertKey) {
      await grantCertificate({
        uid: input.uid,
        certKey: grantCertKey,
        stripeSessionId: `store:${input.platform}:${verified.transactionId}`,
        amount: 0,
        demo: false,
      });
    }

    return { ok: true, grant: outcome.grant, replay: outcome.replay };
  } catch (err) {
    console.error("[store-purchases] grant failed", err);
    return {
      ok: false,
      error: "Could not record the purchase. Please try again.",
      status: 500,
    };
  }
}
