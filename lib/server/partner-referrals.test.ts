import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GREATBUILDZ, PARTNER_REFERRAL_CONSENT_VERSION, type PartnerReferralHandoff } from "@/lib/partner-referrals";

const resendMocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendMocks.send };
  },
}));

const store = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  updates: [] as Record<string, unknown>[],
}));
vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: (id: string) => {
        const key = `${name}/${id}`;
        return {
          get: async () => ({ exists: store.docs.has(key), data: () => store.docs.get(key) }),
          create: async (data: Record<string, unknown>) => {
            if (store.docs.has(key)) throw new Error("already exists");
            store.docs.set(key, data);
          },
          update: async (data: Record<string, unknown>) => {
            store.updates.push(data);
            store.docs.set(key, { ...store.docs.get(key), ...data });
          },
        };
      },
    }),
  }),
}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "server-time", arrayUnion: (value: unknown) => ({ arrayUnion: value }) },
}));

import {
  createPartnerReferral,
  dispatchPartnerReferral,
  generateReferralId,
  partnerReferralDocId,
  renderPartnerReferralEmail,
} from "./partner-referrals";

const handoff: PartnerReferralHandoff = {
  homeowner: { name: "Jane <Owner>", email: "jane@example.com", phone: null, message: "Backyard is sloped" },
  property: { address: "123 Elm St, Pasadena, CA 91101", city: "Pasadena", county: "Los Angeles", state: "CA", zip: "91101", lotSqft: 6000 },
  project: { aduSqft: 600, widthFt: 20, lengthFt: 30, roof: "gable", finish: "standard", buildBandLow: 200000, buildBandHigh: 275000, zoningStatus: "Compliant" },
};
const request = { partnerId: "greatbuildz" as const, consentVersion: PARTNER_REFERRAL_CONSENT_VERSION, handoff };

beforeEach(() => {
  store.docs.clear();
  store.updates = [];
  resendMocks.send.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("partner referral ids", () => {
  it("issues LFR- referral numbers and a stable per-owner-and-property doc id", () => {
    expect(generateReferralId()).toMatch(/^LFR-[0-9A-F]{8}$/);
    expect(partnerReferralDocId("u1", "greatbuildz", " 123 Elm  St ")).toBe(partnerReferralDocId("u1", "greatbuildz", "123 elm st"));
    expect(partnerReferralDocId("u1", "greatbuildz", "123 Elm St")).not.toBe(partnerReferralDocId("u2", "greatbuildz", "123 Elm St"));
  });
});

describe("renderPartnerReferralEmail", () => {
  it("includes the referral number and escapes homeowner text in HTML", () => {
    const message = renderPartnerReferralEmail(GREATBUILDZ, "LFR-ABCDEF12", handoff);
    expect(message.subject).toContain("LFR-ABCDEF12");
    expect(message.text).toContain("Estimated build band: $200,000 to $275,000");
    expect(message.text).toMatch(/not quotes, surveys or permit approvals/);
    expect(message.html).toContain("Jane &lt;Owner&gt;");
  });
});

describe("dispatchPartnerReferral", () => {
  it("queues for manual handoff without a Resend key or intake address", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("GREATBUILDZ_REFERRAL_EMAIL", "");
    expect(await dispatchPartnerReferral(GREATBUILDZ, "LFR-1", handoff)).toEqual({ delivery: "queued" });
    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("emails the intake address with the homeowner as reply-to and an idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("GREATBUILDZ_REFERRAL_EMAIL", "intake@partner.example");
    resendMocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    expect(await dispatchPartnerReferral(GREATBUILDZ, "LFR-1", handoff)).toEqual({ delivery: "sent", resendId: "email-1" });
    const [payload, options] = resendMocks.send.mock.calls[0];
    expect(payload).toMatchObject({ to: ["intake@partner.example"], replyTo: "jane@example.com" });
    expect(options).toMatchObject({ idempotencyKey: "partner-referral/LFR-1" });
  });

  it("keeps the referral queued when the provider fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("GREATBUILDZ_REFERRAL_EMAIL", "intake@partner.example");
    resendMocks.send.mockRejectedValue(new Error("timeout"));
    expect(await dispatchPartnerReferral(GREATBUILDZ, "LFR-1", handoff)).toMatchObject({ delivery: "queued", error: "timeout" });
  });
});

describe("createPartnerReferral", () => {
  it("records consent before handing off, then records the delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("GREATBUILDZ_REFERRAL_EMAIL", "intake@partner.example");
    resendMocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null });

    const result = await createPartnerReferral("owner-1", request);
    expect(result).toMatchObject({ status: "sent", duplicate: false });
    const [record] = Array.from(store.docs.values());
    expect(record).toMatchObject({
      referralId: result.referralId,
      partnerId: "greatbuildz",
      ownerUid: "owner-1",
      status: "sent",
      handoff,
      consent: { version: PARTNER_REFERRAL_CONSENT_VERSION },
      attribution: { county: "Los Angeles", state: "CA", aduSqft: 600 },
      delivery: { channel: "email", outcome: "sent", resendId: "email-1" },
    });
    expect((record.consent as { text: string }).text).toMatch(/GreatBuildz/);
  });

  it("returns the existing referral instead of sending the same property twice", async () => {
    const first = await createPartnerReferral("owner-1", request);
    const second = await createPartnerReferral("owner-1", request);
    expect(second).toEqual({ referralId: first.referralId, status: "queued", duplicate: true });
    expect(resendMocks.send).not.toHaveBeenCalled();
  });
});
