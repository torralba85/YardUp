import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PARTNER_REFERRAL_CONSENT_VERSION } from "@/lib/partner-referrals";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const createPartnerReferral = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/partner-referrals", () => ({ createPartnerReferral }));

import { POST } from "./route";

const body = {
  partnerId: "greatbuildz",
  consentVersion: PARTNER_REFERRAL_CONSENT_VERSION,
  handoff: {
    homeowner: { name: "Jane Owner", email: "jane@example.com", phone: null, message: null },
    property: { address: "123 Elm St, Pasadena, CA 91101", city: "Pasadena", county: "Los Angeles", state: "CA", zip: "91101", lotSqft: 6000 },
    project: { aduSqft: 600, widthFt: 20, lengthFt: 30, roof: "gable", finish: "standard", buildBandLow: 200000, buildBandHigh: 275000, zoningStatus: "Compliant" },
  },
};

function post(payload: unknown) {
  return new NextRequest("http://localhost/api/partners/referral", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  resetRateLimitBuckets();
  createPartnerReferral.mockReset();
  createPartnerReferral.mockResolvedValue({ referralId: "LFR-ABCDEF12", status: "sent", duplicate: false });
  vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/partners/referral", () => {
  it("is not available until the launch flag is on", async () => {
    vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "");
    const res = await POST(post(body));
    expect(res.status).toBe(404);
    expect(createPartnerReferral).not.toHaveBeenCalled();
  });

  it("records a valid referral for the signed-in owner", async () => {
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ referralId: "LFR-ABCDEF12", status: "sent", duplicate: false });
    expect(createPartnerReferral).toHaveBeenCalledWith("local-dev", expect.objectContaining({ partnerId: "greatbuildz" }));
  });

  it("rejects an out-of-area or stale-consent request without recording it", async () => {
    const outside = structuredClone(body);
    outside.handoff.property.county = "San Diego";
    expect((await POST(post(outside))).status).toBe(400);
    expect((await POST(post({ ...body, consentVersion: "old" }))).status).toBe(400);
    expect(createPartnerReferral).not.toHaveBeenCalled();
  });

  it("limits each account to five referrals an hour", async () => {
    for (let i = 0; i < 5; i += 1) expect((await POST(post(body))).status).toBe(200);
    expect((await POST(post(body))).status).toBe(429);
  });

  it("returns a generic error when the ledger write fails", async () => {
    createPartnerReferral.mockRejectedValue(new Error("firestore down"));
    const res = await POST(post(body));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not send this referral. Please try again." });
  });
});
