import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
  calculateFeasibility,
} from "./feasibility";
import { buildConnectionSnapshot } from "./marketplace";
import {
  GREATBUILDZ,
  PARTNER_REFERRAL_CONSENT_VERSION,
  availablePartnerNetwork,
  buildPartnerReferralHandoff,
  partnerConsentText,
  partnerServesLocation,
  validatePartnerReferralRequest,
} from "./partner-referrals";

function laSnapshot(county = "Los Angeles", state = "CA") {
  const parcel = {
    ...parcelPresets[0],
    address: "123 Elm St, Pasadena, CA 91101",
    city: "Pasadena",
    state,
    county,
  };
  return buildConnectionSnapshot({
    parcelKey: "elm",
    parcel,
    config: defaultAduConfig,
    assumptions: defaultFinancialAssumptions,
    result: calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions),
  });
}

const contact = { name: "Jane Owner", email: "jane@example.com", phone: null, message: null };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("partnerServesLocation", () => {
  it("matches the ten California counties GreatBuildz serves, with or without the County suffix", () => {
    expect(GREATBUILDZ.counties).toHaveLength(10);
    for (const county of ["Los Angeles", "Orange", "Ventura", "San Bernardino", "Riverside", "San Diego", "Alameda", "Contra Costa", "Santa Clara", "San Mateo"]) {
      expect(partnerServesLocation(GREATBUILDZ, { state: "CA", county })).toBe(true);
    }
    expect(partnerServesLocation(GREATBUILDZ, { state: "ca", county: "Ventura County" })).toBe(true);
  });

  it("rejects Sacramento, other states, and unknown counties", () => {
    expect(partnerServesLocation(GREATBUILDZ, { state: "CA", county: "Sacramento" })).toBe(false);
    expect(partnerServesLocation(GREATBUILDZ, { state: "WA", county: "Los Angeles" })).toBe(false);
    expect(partnerServesLocation(GREATBUILDZ, { state: "CA", county: null })).toBe(false);
  });
});

describe("availablePartnerNetwork", () => {
  it("stays off until the launch flag is exactly true", () => {
    vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "");
    expect(availablePartnerNetwork(laSnapshot())).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "1");
    expect(availablePartnerNetwork(laSnapshot())).toBeNull();
  });

  it("offers GreatBuildz only for covered lots once enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "true");
    expect(availablePartnerNetwork(laSnapshot())).toBe(GREATBUILDZ);
    expect(availablePartnerNetwork(laSnapshot("San Diego"))).toBe(GREATBUILDZ);
    expect(availablePartnerNetwork(laSnapshot("Sacramento"))).toBeNull();
    expect(availablePartnerNetwork({ ...laSnapshot(), parcel: parcelPresets[0], parcelState: "WA" })).toBeNull();
  });

  it("holds back projects whose build band tops out under $100K", () => {
    vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "true");
    const snapshot = laSnapshot();
    expect(availablePartnerNetwork({ ...snapshot, result: { ...snapshot.result, costLow: 60000, costHigh: 74000 } })).toBeNull();
    // The band rounds up to $25k, so a $75,001 top counts as a $100K project.
    expect(availablePartnerNetwork({ ...snapshot, result: { ...snapshot.result, costLow: 60000, costHigh: 75001 } })).toBe(GREATBUILDZ);
  });
});

describe("partner referral handoff", () => {
  it("sends contact, address, and banded project figures, never exact costs or rent", () => {
    const snapshot = laSnapshot();
    const handoff = buildPartnerReferralHandoff(contact, snapshot);
    expect(handoff.homeowner).toEqual(contact);
    expect(handoff.property).toMatchObject({ address: "123 Elm St, Pasadena, CA 91101", county: "Los Angeles", state: "CA", zip: "91101" });
    expect(handoff.property).toHaveProperty("fireHazard");
    expect(handoff.project.bedroomClass).toMatch(/^(studio|1br|2br)$/);
    expect(handoff.project.buildBandLow % 25000).toBe(0);
    expect(handoff.project.buildBandHigh % 25000).toBe(0);
    expect(JSON.stringify(handoff)).not.toContain(String(snapshot.result.costLow));
    expect(Object.keys(handoff.project)).not.toContain("monthlyRent");
  });

  it("names the partner, the shared fields, texts, the referral fee and who screens contractors", () => {
    const text = partnerConsentText(GREATBUILDZ);
    expect(text).toMatch(/^I'm 18 or older and I direct LotFoundry to email my name, email, optional phone and message, property address/);
    expect(text).toContain("to GreatBuildz Inc., with a copy to me");
    expect(text).toMatch(/contractors or architects GreatBuildz matches me with, may contact me .* by phone, email or text/);
    expect(text).toContain("reply STOP to opt out");
    expect(text).toContain("GreatBuildz handles my information under its own privacy policy and terms");
    expect(text).toContain("referral fee, which doesn't change what I pay");
    expect(text).toContain("LotFoundry doesn't screen, background-check or guarantee any contractor");
    expect(text).not.toMatch(/screened|vetted/);
  });
});

describe("validatePartnerReferralRequest", () => {
  const valid = () => ({
    partnerId: "greatbuildz",
    consentVersion: PARTNER_REFERRAL_CONSENT_VERSION,
    // A fresh contact each time: the cases below edit it.
    handoff: buildPartnerReferralHandoff({ ...contact }, laSnapshot()),
  });

  it("accepts a current, covered request and drops unknown keys", () => {
    const body = valid();
    (body.handoff.homeowner as unknown as Record<string, unknown>).ssn = "000-00-0000";
    (body.handoff as unknown as Record<string, unknown>).extra = "x";
    const result = validatePartnerReferralRequest(body);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.value)).not.toContain("000-00-0000");
    expect(JSON.stringify(result.value)).not.toContain("extra");
  });

  it("rejects stale consent, unknown partners, bad email, and uncovered counties", () => {
    expect(validatePartnerReferralRequest({ ...valid(), consentVersion: "old" })).toMatchObject({ ok: false });
    expect(validatePartnerReferralRequest({ ...valid(), partnerId: "other" })).toMatchObject({ ok: false });
    const badEmail = valid();
    badEmail.handoff.homeowner.email = "nope";
    expect(validatePartnerReferralRequest(badEmail)).toMatchObject({ ok: false, error: /valid email/ });
    const outside = valid();
    outside.handoff.property.county = "Sacramento";
    expect(validatePartnerReferralRequest(outside)).toMatchObject({ ok: false, error: /does not serve/ });
    const small = valid();
    small.handoff.project.buildBandHigh = 75000;
    expect(validatePartnerReferralRequest(small)).toMatchObject({ ok: false, error: "GreatBuildz takes projects from $100,000." });
    const noFireClass = valid();
    (noFireClass.handoff.property as unknown as Record<string, unknown>).fireHazard = "";
    expect(validatePartnerReferralRequest(noFireClass)).toMatchObject({ ok: false });
    expect(validatePartnerReferralRequest(null)).toMatchObject({ ok: false });
  });
});
