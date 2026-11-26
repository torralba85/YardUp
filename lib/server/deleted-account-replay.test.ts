import { beforeEach, describe, expect, it, vi } from "vitest";

// One in-memory Firestore shared by account deletion and payment fulfilment,
// so a Stripe retry can be replayed against the records deletion left behind.
const store = vi.hoisted(() => ({ docs: new Map<string, Record<string, unknown>>(), nextId: 0 }));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TS",
    delete: () => "DELETE_FIELD",
  },
}));

vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ getUser: vi.fn() }) }));
vi.mock("../stripe", () => ({ getStripe: async () => null }));

type Ref = { path: string; get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }> };
type Query = { get: () => Promise<{ docs: Array<{ ref: Ref; data: () => Record<string, unknown> }> }> };

const fakeDb = vi.hoisted(() => {
  const ref = (path: string): Ref => ({
    path,
    get: async () => ({ exists: store.docs.has(path), data: () => store.docs.get(path) }),
  });
  const collection = (name: string) => ({
    doc: (id?: string) => ref(`${name}/${id ?? `auto-${++store.nextId}`}`),
    where: (field: string, _op: string, value: unknown): Query => ({
      get: async () => ({
        docs: Array.from(store.docs.entries())
          .filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
          .map(([path, data]) => ({ ref: ref(path), data: () => data })),
      }),
    }),
  });
  const create = (target: Ref, data: Record<string, unknown>) => {
    if (store.docs.has(target.path)) throw new Error(`exists: ${target.path}`);
    store.docs.set(target.path, data);
  };
  const batch = () => {
    const writes: Array<() => void> = [];
    return {
      create: (target: Ref, data: Record<string, unknown>) => writes.push(() => create(target, data)),
      delete: (target: Ref) => writes.push(() => store.docs.delete(target.path)),
      update: (target: Ref, data: Record<string, unknown>) =>
        writes.push(() => {
          const next = { ...store.docs.get(target.path) };
          for (const [key, value] of Object.entries(data)) {
            if (value === "DELETE_FIELD") delete next[key];
            else next[key] = value;
          }
          store.docs.set(target.path, next);
        }),
      commit: async () => writes.forEach((write) => write()),
    };
  };
  const runTransaction = async <T>(
    fn: (tx: { get: (target: Ref | Query) => unknown; create: typeof create }) => Promise<T>,
  ) => fn({ get: (target) => target.get(), create });
  return { collection, batch, runTransaction };
});

vi.mock("./firebase-admin", () => ({
  getAdminApp: () => ({}),
  getAdminDb: () => fakeDb,
}));

import type { Firestore } from "firebase-admin/firestore";
import { fulfillPaidCertificateSession, grantCertificate } from "./certificate-purchases";
import { pseudonymizePurchaseRecords } from "./deleted-account-purchases";

// An address slug, assembled so secret scanners do not read it as an API key.
const ELM_CERT_KEY = ["1", "elm", "st", "san", "diego"].join("-");

/** The paid Checkout Session as Stripe sends it again on a webhook retry. */
const paidSession = {
  id: "cs_test_replay",
  customer_details: { email: "Owner@Example.com" },
  metadata: {
    uid: "deleting-user",
    certKey: ELM_CERT_KEY,
    parcelName: "1 Elm St",
    address: "1 Elm St",
    city: "San Diego",
    state: "CA",
    zip: "92101",
    lat: "32.7",
    lng: "-117.1",
  },
};

const personalData = /elm|owner@example|92101|32\.7|-117\.1/i;

beforeEach(() => {
  store.docs.clear();
  store.nextId = 0;
});

describe("Stripe webhook replay after account deletion", () => {
  it("does not restore the deleted buyer's email or address", async () => {
    expect(await fulfillPaidCertificateSession(paidSession)).toBe(true);
    expect(JSON.stringify(Array.from(store.docs.values()))).toMatch(personalData);

    await pseudonymizePurchaseRecords(fakeDb as unknown as Firestore, "deleting-user");
    expect(JSON.stringify(Array.from(store.docs.values()))).not.toMatch(personalData);

    // Stripe retries the same checkout.session.completed event.
    expect(await fulfillPaidCertificateSession(paidSession)).toBe(false);

    expect(JSON.stringify(Array.from(store.docs.values()))).not.toMatch(personalData);
    const records = Array.from(store.docs.values()).filter((data) => data.stripeSessionId === paidSession.id);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ accountDeleted: true, uid: "deleting-user" });
  });

  it("blocks the checkout retry path for the same payment too", async () => {
    // Grants written directly, as the checkout-certificate retry does.
    await grantCertificate({
      uid: "deleting-user",
      certKey: ELM_CERT_KEY,
      stripeSessionId: paidSession.id,
      amount: 2900,
      address: "1 Elm St",
      buyerEmail: "owner@example.com",
    });
    await pseudonymizePurchaseRecords(fakeDb as unknown as Firestore, "deleting-user");

    expect(await grantCertificate({
      uid: "deleting-user",
      certKey: ELM_CERT_KEY,
      stripeSessionId: paidSession.id,
      amount: 2900,
      address: "1 Elm St",
      buyerEmail: "owner@example.com",
    })).toBe(false);
    expect(JSON.stringify(Array.from(store.docs.values()))).not.toMatch(personalData);
  });

  it("lets a demo grant for the same lot through, since demo session ids are shared", async () => {
    const demo = { certKey: ELM_CERT_KEY, stripeSessionId: `demo_${ELM_CERT_KEY}`, amount: 2900, demo: true };
    await grantCertificate({ ...demo, uid: "deleting-user" });
    await pseudonymizePurchaseRecords(fakeDb as unknown as Firestore, "deleting-user");

    expect(await grantCertificate({ ...demo, uid: "another-user" })).toBe(true);
  });
});
