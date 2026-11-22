import { describe, expect, it } from "vitest";
import { parcelPresets } from "./feasibility";
import { parcelPermitAuthority, pickPermitAuthority, resolvePermitAuthority } from "./permit-authority";

const AT = "2026-11-21T00:00:00.000Z";

describe("resolvePermitAuthority", () => {
  it("trusts the parcel record over the Census boundary", () => {
    expect(resolvePermitAuthority({
      parcelRecord: { kind: "county", name: "San Diego" },
      census: { county: "San Diego", place: "San Diego" },
      checkedAt: AT,
    })).toEqual({ kind: "county", name: "San Diego", basis: "parcel-record", checkedAt: AT });
  });

  it("keeps the Census community on a county parcel record", () => {
    expect(resolvePermitAuthority({
      parcelRecord: { kind: "county", name: "San Diego" },
      census: { county: "San Diego", community: "Spring Valley" },
      checkedAt: AT,
    })).toEqual({ kind: "county", name: "San Diego", community: "Spring Valley", basis: "parcel-record", checkedAt: AT });
  });

  it("never attaches a community to a city", () => {
    expect(resolvePermitAuthority({
      parcelRecord: { kind: "city", name: "Poway" },
      census: { county: "San Diego", community: "Spring Valley" },
      checkedAt: AT,
    })).toEqual({ kind: "city", name: "Poway", basis: "parcel-record", checkedAt: AT });
  });

  it("falls back to the incorporated place, then to the county", () => {
    expect(resolvePermitAuthority({ census: { county: "San Diego", place: "San Diego" }, checkedAt: AT }))
      .toEqual({ kind: "city", name: "San Diego", basis: "place-boundary", checkedAt: AT });
    expect(resolvePermitAuthority({ census: { county: "San Diego", community: "Spring Valley" }, checkedAt: AT }))
      .toEqual({ kind: "county", name: "San Diego", community: "Spring Valley", basis: "place-boundary", checkedAt: AT });
  });

  it("resolves nothing without a signal or a county to name", () => {
    expect(resolvePermitAuthority({ census: null, checkedAt: AT })).toBeUndefined();
    expect(resolvePermitAuthority({ census: {}, checkedAt: AT })).toBeUndefined();
    expect(resolvePermitAuthority({ checkedAt: AT })).toBeUndefined();
  });
});

describe("pickPermitAuthority / parcelPermitAuthority", () => {
  it("rejects malformed records and drops a city's community", () => {
    expect(pickPermitAuthority(null)).toBeUndefined();
    expect(pickPermitAuthority({ kind: "town", name: "X", basis: "parcel-record", checkedAt: AT })).toBeUndefined();
    expect(pickPermitAuthority({ kind: "city", name: " ", basis: "parcel-record", checkedAt: AT })).toBeUndefined();
    expect(pickPermitAuthority({ kind: "city", name: "X", basis: "guess", checkedAt: AT })).toBeUndefined();
    expect(pickPermitAuthority({ kind: "city", name: "X", basis: "parcel-record" })).toBeUndefined();
    expect(pickPermitAuthority({ kind: "city", name: "Vista", community: "Shadowridge", basis: "parcel-record", checkedAt: AT }))
      .toEqual({ kind: "city", name: "Vista", basis: "parcel-record", checkedAt: AT });
  });

  it("caps strings at the lengths firestore.rules allows", () => {
    const picked = pickPermitAuthority({ kind: "county", name: "N".repeat(150), community: "C".repeat(150), basis: "place-boundary", checkedAt: "T".repeat(60) });
    expect(picked?.name).toHaveLength(100);
    expect(picked?.community).toHaveLength(100);
    expect(picked?.checkedAt).toHaveLength(40);
  });

  it("reads nothing from a preset", () => {
    expect(parcelPermitAuthority(parcelPresets[0])).toBeNull();
  });
});
