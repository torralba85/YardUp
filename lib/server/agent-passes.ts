import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import { certificateGrantData, certificateGrantRef, type GrantCertificateInput } from "./certificate-purchases";

/**
 * Agent passes (`agentPasses/{CODE}`), created only by `scripts/agent-pass.mjs`
 * through the Admin SDK; Firestore rules deny every client read and write.
 * A pass belongs to one listing (`certKey`) and allows `maxRedemptions`
 * complimentary certificates until `expiresAt`. Each claim is recorded under
 * `agentPasses/{CODE}/redemptions/{uid}`, so later paid orders by those
 * accounts can be attributed from first-party records, never from analytics.
 */
export const AGENT_PASSES = "agentPasses";

/** The `stripeSessionId` prefix a pass grant carries, like `store:` for store grants. */
export const AGENT_PASS_GRANT_PREFIX = "pass:";

/** Outcome of {@link redeemAgentPassGrant}. */
export type AgentPassRedeemResult =
  | { kind: "granted" }
  | { kind: "already_granted" }
  | { kind: "not_found" }
  | { kind: "wrong_property" }
  | { kind: "expired" }
  | { kind: "used_up" };

/** Input for {@link redeemAgentPassGrant}: the grant fields minus payment ones. */
export type RedeemAgentPassGrantInput = Omit<
  GrantCertificateInput,
  "stripeSessionId" | "amount" | "demo" | "analyticsOrderId"
> & {
  /** The normalized pass code. */
  code: string;
  /** Clock override for tests. */
  now?: Date;
};

interface StoredPass {
  certKey?: unknown;
  status?: unknown;
  maxRedemptions?: unknown;
  redemptions?: unknown;
  expiresAt?: unknown;
}

function expiryMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

/**
 * Claim a complimentary certificate with an agent pass. One transaction checks
 * the pass (active, unexpired, under its cap, for this property), writes the
 * `$0` grant and counts the redemption, so two buyers racing for the last slot
 * cannot both get it. An account that already holds the certificate is told so
 * without spending a redemption.
 */
export async function redeemAgentPassGrant(
  input: RedeemAgentPassGrantInput,
): Promise<AgentPassRedeemResult> {
  const { code, now = new Date(), ...grant } = input;
  const db = getAdminDb();
  const passRef = db.collection(AGENT_PASSES).doc(code);
  const grantRef = certificateGrantRef(grant.uid, grant.certKey);

  return db.runTransaction(async (tx) => {
    const [passSnap, grantSnap] = await Promise.all([tx.get(passRef), tx.get(grantRef)]);
    const pass = passSnap.exists ? (passSnap.data() as StoredPass) : null;
    if (!pass || pass.status !== "active") return { kind: "not_found" } as const;
    if (pass.certKey !== grant.certKey) return { kind: "wrong_property" } as const;
    if (grantSnap.exists) return { kind: "already_granted" } as const;

    const expiresAt = expiryMillis(pass.expiresAt);
    if (expiresAt === null || expiresAt <= now.getTime()) return { kind: "expired" } as const;
    const max = typeof pass.maxRedemptions === "number" ? pass.maxRedemptions : 0;
    const used = typeof pass.redemptions === "number" ? pass.redemptions : 0;
    if (used >= max) return { kind: "used_up" } as const;

    tx.create(grantRef, {
      ...certificateGrantData({
        ...grant,
        stripeSessionId: `${AGENT_PASS_GRANT_PREFIX}${code}`,
        amount: 0,
        demo: false,
      }),
      source: "agent_pass",
      passCode: code,
    });
    tx.update(passRef, {
      redemptions: FieldValue.increment(1),
      lastRedeemedAt: FieldValue.serverTimestamp(),
    });
    // set, not create: a voided grant leaves its redemption record behind.
    tx.set(passRef.collection("redemptions").doc(grant.uid), {
      uid: grant.uid,
      certKey: grant.certKey,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { kind: "granted" } as const;
  });
}
