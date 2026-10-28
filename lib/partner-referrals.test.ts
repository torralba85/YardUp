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
  it("matches the Southern California and Bay Area counties GreatBuildz serves, with or without the County suffix", () => {
    for (const county of [
      "Los Angeles", "Orange", "Ventura", "San Bernardino", "Riverside", "San Diego",
      "Alameda", "Contra Costa", "Santa Clara", "San Mateo",
    ]) {
      expect(partnerServesLocation(GREATBUILDZ, { state: "CA", county })).toBe(true);
    }
    expect(partnerServesLocation(GREATBUILDZ, { state: "ca", county: "Ventura County" })).toBe(true);
    expect(partnerServesLocation(GREATBUILDZ, { state: "CA", county: "contra costa county" })).toBe(true);
  });

  it("rejects other counties, other states, and unknown counties", () => {
    expect(partnerServesLocation(GREATBUILDZ, { state: "CA", county: "Sacramento" })).toBe(false);
    expect(partnerServesLocation(GREATBUILDZ, { state: "CA", county: "San Francisco" })).toBe(false);
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
    expect(availablePartnerNetwork(laSnapshot("Sacramento"))).toBeNull();
    expect(availablePartnerNetwork({ parcel: parcelPresets[0], parcelState: "WA" })).toBeNull();
  });
});

describe("partner referral handoff", () => {
  it("sends contact, address, and banded project figures, never exact costs or rent", () => {
    const snapshot = laSnapshot();
    const handoff = buildPartnerReferralHandoff(contact, snapshot);
    expect(handoff.homeowner).toEqual(contact);
    expect(handoff.property).toMatchObject({ address: "123 Elm St, Pasadena, CA 91101", county: "Los Angeles", state: "CA", zip: "91101" });
    expect(handoff.project.buildBandLow % 25000).toBe(0);
    expect(handoff.project.buildBandHigh % 25000).toBe(0);
    expect(JSON.stringify(handoff)).not.toContain(String(snapshot.result.costLow));
    expect(Object.keys(handoff.project)).not.toContain("monthlyRent");
  });

  it("names the partner, the shared fields, and the referral fee in the consent", () => {
    const text = partnerConsentText(GREATBUILDZ);
    expect(text).toMatch(/send my name, email, optional phone and message, exact property address/);
    expect(text).toMatch(/GreatBuildz handles my details under its own privacy policy/);
    expect(text).toMatch(/referral fee/);
  });
});

describe("validatePartnerReferralRequest", () => {
  const valid = () => ({
    partnerId: "greatbuildz",
    consentVersion: PARTNER_REFERRAL_CONSENT_VERSION,
    handoff: buildPartnerReferralHandoff(contact, laSnapshot()),
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
    expect(validatePartnerReferralRequest(null)).toMatchObject({ ok: false });
  });
});
