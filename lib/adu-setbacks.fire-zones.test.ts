import { describe, expect, it } from "vitest";
import {
  type AduSetbackRule,
  aduSetbackNote,
  aduSetbacks,
  SAN_DIEGO_FIRE_ZONE_SETBACK_FT,
  SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT,
  withAduSetbacks,
} from "./adu-setbacks";
import { defaultAduConfig, parcelPresets, type ADUConfig, type Parcel } from "./feasibility";
import type { FireHazardZone, ParcelFireHazard } from "./parcel-types";
import { buildAduHeightModel } from "./scene-model";

/**
 * Every branch of aduSetbacks once the parcel carries a fire hazard zone. A
 * San Diego lot gets 0 ft only when the lookup positively placed it outside
 * High and Very High zones; a failed or missing lookup gets 4 ft.
 */

const california: Parcel = {
  address: "1 Test Street",
  city: "Oceanside, CA 92054",
  lotArea: 6000,
  lotWidth: 50,
  lotLength: 120,
  existingHouseSqft: 1600,
  maxLotCoveragePercent: 50,
  setbacks: { front: 20, rear: 20, side: 5 },
};
const sanDiego = { ...california, city: "San Diego, CA 92110", state: "CA" } as Parcel;
const seattle = parcelPresets[0];

const low: ADUConfig = { ...defaultAduConfig, height: 9, roof: "flat" };
const tall: ADUConfig = { ...defaultAduConfig, height: 16, roof: "gable" };

function inZone<P extends Parcel>(parcel: P, zone: FireHazardZone): P & { fireHazard: ParcelFireHazard } {
  return {
    ...parcel,
    fireHazard: { zone, source: "City of San Diego FHSZ map (2025)", checkedAt: "2026-10-16T00:00:00.000Z" },
  };
}

describe("aduSetbacks with a fire hazard zone", () => {
  it("test configs straddle San Diego's 16 ft line", () => {
    expect(buildAduHeightModel(low)!.totalHeight).toBeLessThanOrEqual(SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT);
    expect(buildAduHeightModel(tall)!.totalHeight).toBeGreaterThan(SAN_DIEGO_NO_SETBACK_MAX_HEIGHT_FT);
  });

  describe("City of San Diego", () => {
    it.each(["very-high", "high"] as const)("uses 4 ft at any height in a %s zone", (zone) => {
      const parcel = inZone(sanDiego, zone);
      for (const config of [low, tall, undefined]) {
        expect(aduSetbacks(parcel, config)).toEqual({ front: 20, rear: 4, side: 4, rule: "san-diego-fire" });
      }
      expect(SAN_DIEGO_FIRE_ZONE_SETBACK_FT).toBe(4);
    });

    it("requires the full 4 ft in a fire zone even where the parcel's own setbacks are tighter", () => {
      const tight = inZone({ ...sanDiego, setbacks: { front: 15, rear: 3, side: 2 } }, "very-high");
      expect(aduSetbacks(tight, low)).toEqual({ front: 15, rear: 4, side: 4, rule: "san-diego-fire" });
    });

    it.each(["none", "moderate"] as const)("keeps the height rule in a %s zone", (zone) => {
      const parcel = inZone(sanDiego, zone);
      expect(aduSetbacks(parcel, low)).toEqual({ front: 20, rear: 0, side: 0, rule: "san-diego-low" });
      expect(aduSetbacks(parcel, tall)).toEqual({ front: 20, rear: 4, side: 4, rule: "san-diego-tall" });
      expect(aduSetbacks(parcel)).toEqual({ front: 20, rear: 4, side: 4, rule: "california" });
    });

    it("assumes 4 ft when the lookup failed, the parcel predates it, or the zone is malformed", () => {
      const unchecked = [
        inZone(sanDiego, "unknown"),
        sanDiego,
        { ...sanDiego, fireHazard: { zone: "extreme", source: "x", checkedAt: "" } } as Parcel,
        { ...sanDiego, fireHazard: null } as Parcel,
      ];
      for (const parcel of unchecked) {
        for (const config of [low, tall, undefined]) {
          expect(aduSetbacks(parcel, config)).toEqual({ front: 20, rear: 4, side: 4, rule: "san-diego-unchecked" });
        }
      }
    });
  });

  describe("rest of California", () => {
    it.each(["very-high", "high"] as const)("keeps the 4 ft cap and flags a %s zone", (zone) => {
      expect(aduSetbacks(inZone(california, zone), low)).toEqual({ front: 20, rear: 4, side: 4, rule: "california-fire" });
      const tight = inZone({ ...california, setbacks: { front: 15, rear: 3, side: 2 } }, zone);
      expect(aduSetbacks(tight, tall)).toEqual({ front: 15, rear: 3, side: 2, rule: "california-fire" });
    });

    it.each(["moderate", "none", "unknown"] as const)("uses the plain 4 ft cap in a %s zone", (zone) => {
      expect(aduSetbacks(inZone(california, zone), low)).toEqual({ front: 20, rear: 4, side: 4, rule: "california" });
    });

    it("uses the plain 4 ft cap when the parcel carries no zone", () => {
      expect(aduSetbacks(california, low)).toEqual({ front: 20, rear: 4, side: 4, rule: "california" });
    });
  });

  it("ignores the zone outside California", () => {
    expect(aduSetbacks(inZone(seattle, "very-high"), low)).toEqual({ ...seattle.setbacks, rule: "parcel" });
  });

  it("swaps in the fire-zone setbacks with withAduSetbacks", () => {
    const parcel = inZone(sanDiego, "very-high");
    const swapped = withAduSetbacks(parcel, low);
    expect(swapped.setbacks).toEqual({ front: 20, rear: 4, side: 4 });
    expect(swapped.fireHazard).toEqual(parcel.fireHazard);
  });
});

describe("aduSetbackNote", () => {
  const rules: AduSetbackRule[] = [
    "california",
    "california-fire",
    "san-diego-low",
    "san-diego-tall",
    "san-diego-fire",
    "san-diego-unchecked",
  ];

  it("names the rule for every California figure and stays silent for the parcel's own", () => {
    for (const rule of rules) expect(aduSetbackNote(rule)).toMatch(/^(California|City of San Diego)\b.*\.$/);
    expect(aduSetbackNote("parcel")).toBeNull();
  });

  it("says what the fire zone did to each San Diego figure", () => {
    expect(aduSetbackNote("san-diego-fire")).toBe(
      "City of San Diego: 4 ft side and rear setbacks at any height, because this lot is mapped in a High or Very High fire hazard zone.",
    );
    expect(aduSetbackNote("san-diego-unchecked")).toMatch(/fire hazard zone wasn't checked/);
    expect(aduSetbackNote("san-diego-low")).toMatch(/outside High and Very High fire hazard zones, and this lot is outside them/);
    expect(aduSetbackNote("california-fire")).toMatch(/^California caps ADU side and rear setbacks at 4 ft\. This lot is mapped in a High or Very High fire hazard zone/);
  });
});
