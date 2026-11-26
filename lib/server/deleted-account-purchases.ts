import { FieldValue, type Firestore } from "firebase-admin/firestore";

/**
 * Certificate grant fields that hold no contact or property detail. Accounting,
 * tax, dispute and fraud review need only these after an account is deleted.
 */
const RETAINED_GRANT_FIELDS = [
  "uid",
  "stripeSessionId",
  "amount",
  "status",
  "demo",
  "analyticsOrderId",
  "createdAt",
  "anonymousCheckout",
  "consentVersion",
  "privacyVersion",
  "consentAcceptedAt",
] as const;

/** Each moved grant is one create plus one delete; Firestore caps a batch at 500 writes. */
const GRANTS_PER_BATCH = 200;
const UPDATES_PER_BATCH = 400;

/** The kept fields of a certificate grant, marked as belonging to a deleted account. */
export function retainedGrantFields(data: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {
    accountDeleted: true,
    pseudonymizedAt: FieldValue.serverTimestamp(),
  };
  for (const key of RETAINED_GRANT_FIELDS) {
    if (data[key] !== undefined) kept[key] = data[key];
  }
  return kept;
}

/**
 * Remove the email address, property address, coordinates and parcel data from
 * a deleting account's purchase records, as the Privacy Policy (§6) promises.
 *
 * A certificate grant's document id is `{uid}_{certKey}`, and the certKey is a
 * slug of the street address, so the kept fields move to a new random-id
 * document and the original is deleted in the same batch. A retry skips grants
 * already moved. Store grants (`purchaseGrants`) are keyed by transaction, so
 * only their certKey field is removed.
 */
export async function pseudonymizePurchaseRecords(db: Firestore, uid: string): Promise<void> {
  const grants = db.collection("certificatePurchases");
  const owned = (await grants.where("uid", "==", uid).get()).docs.filter(
    (doc) => doc.data().accountDeleted !== true,
  );
  for (let i = 0; i < owned.length; i += GRANTS_PER_BATCH) {
    const batch = db.batch();
    for (const doc of owned.slice(i, i + GRANTS_PER_BATCH)) {
      batch.create(grants.doc(), retainedGrantFields(doc.data()));
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  const storeGrants = await db.collection("purchaseGrants").where("uid", "==", uid).get();
  const keyed = storeGrants.docs.filter((doc) => doc.data().certKey !== undefined);
  for (let i = 0; i < keyed.length; i += UPDATES_PER_BATCH) {
    const batch = db.batch();
    for (const doc of keyed.slice(i, i + UPDATES_PER_BATCH)) {
      batch.update(doc.ref, { certKey: FieldValue.delete() });
    }
    await batch.commit();
  }
}
