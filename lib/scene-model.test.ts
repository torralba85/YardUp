import { describe, expect, it } from "vitest";
import {
  buildAduFootprint,
  buildAduHeightModel,
  buildAduSceneModel,
  buildExistingHouseFootprint,
  buildExistingHouseSceneModel,
  buildParcelOutline,
  buildSceneModel,
  buildSceneOrigin,
  computeCoverageSummary,
  projectGeodeticToLocal,
  projectLocalToGeodetic,
  projectPolygonToLocal,
  rectangleCorners,
} from "./scene-model";
import {
  degeneratePolygon,
  demoPresets,
  fallbackLiveParcel,
  invalidCoordinatesParcel,
  invalidSetbackParcel,
  irregularLiveParcel,
  oversizeAduConfig,
  rotatedLiveParcel,
  zeroAreaAduConfig,
} from "./scene-model-fixtures";
import { defaultAduConfig } from "./feasibility";
import type { GeoJsonPolygon } from "./parcel-types";

describe("buildExistingHouseFootprint — D1 area agreement", () => {
  it("does not render the borrowed house in a legacy fallback parcel", () => {
    const legacy = { ...demoPresets[0], source: "fallback" as const };
    expect(buildExistingHouseFootprint(legacy).width).toBeNull();
    expect(buildExistingHouseSceneModel(legacy).pose).toBeNull();
  });
  it("gives the Seattle sample a balanced footprint without changing its area", () => {
    const seattle = demoPresets[0];
    const footprint = buildExistingHouseFootprint(seattle);
    expect(footprint.width).toBe(30);
    expect(footprint.depth).toBe(46);
    expect(footprint.areaSqft).toBe(1380);
  });

  it("preserves the declared existingHouseSqft exactly for all demo presets", () => {
    for (const parcel of demoPresets) {
      const footprint = buildExistingHouseFootprint(parcel);
      expect(footprint.width).not.toBeNull();
      expect(footprint.depth).not.toBeNull();
      expect(footprint.width! * footprint.depth!).toBeCloseTo(parcel.existingHouseSqft, 6);
      expect(footprint.areaSqft).toBe(parcel.existingHouseSqft);
    }
  });

  it("does not shrink a large house to manufacture room inside the buildable length", () => {
    const austin = { ...demoPresets.find((p) => p.id === "compact-lot")!, existingHouseSqft: 3000 };
    const footprint = buildExistingHouseFootprint(austin);
    const buildableLength = austin.lotLength - austin.setbacks.front - austin.setbacks.rear;
    expect(footprint.depth).toBeGreaterThan(buildableLength);
  });

  it("models natural residential frontage on wider lots instead of clamping width to 32 ft", () => {
    const portland = demoPresets.find((p) => p.id === "corner-lot")!;
    const footprint = buildExistingHouseFootprint(portland);
    // Portland (60' lot, 48' buildable width, 1,720 sf): previously pinned to 32' wide x 53.8' deep.
    // Now models balanced frontage (~45' wide x ~38.2' deep).
    expect(footprint.width!).toBeGreaterThan(32);
    expect(footprint.width!).toBeLessThanOrEqual(portland.lotWidth - portland.setbacks.side * 2);
    expect(footprint.depth!).toBeLessThan(45);
    expect(footprint.width! * footprint.depth!).toBeCloseTo(1720, 6);
  });

  it("allows standard suburban lots to expand house width up to 55 ft rather than 32 ft", () => {
    const suburban = {
      lotWidth: 70,
      existingHouseSqft: 2400,
      setbacks: { front: 25, rear: 25, side: 7.5 },
    };
    const footprint = buildExistingHouseFootprint(suburban);
    // Target width: sqrt(2400 / 0.85) ~ 53.1 ft. Fits within buildable width 55 ft (70 - 15).
    expect(footprint.width!).toBeCloseTo(Math.sqrt(2400 / 0.85), 1);
    expect(footprint.width!).toBeGreaterThan(50);
    expect(footprint.depth!).toBeLessThan(50);
    expect(footprint.areaSqft).toBe(2400);
  });

  it("returns the explicit unknown state for zero existingHouseSqft", () => {
    const footprint = buildExistingHouseFootprint(fallbackLiveParcel);
    expect(footprint).toMatchObject({ areaSqft: 0, width: null, depth: null, source: "unknown" });
  });

  it("returns the explicit unknown state for a negative/NaN existingHouseSqft", () => {
    const base = demoPresets[0];
    expect(buildExistingHouseFootprint({ ...base, existingHouseSqft: -5 }).source).toBe("unknown");
    expect(buildExistingHouseFootprint({ ...base, existingHouseSqft: NaN }).source).toBe("unknown");
  });

  it("returns the explicit unknown state for negative setbacks instead of NaN", () => {
    const footprint = buildExistingHouseFootprint(invalidSetbackParcel);
    expect(footprint).toMatchObject({ width: null, depth: null, source: "unknown" });
    expect(Number.isNaN(footprint.areaSqft)).toBe(false);
  });

  it("returns the explicit unknown state for a non-finite lotWidth", () => {
    const base = demoPresets[0];
    const footprint = buildExistingHouseFootprint({ ...base, lotWidth: NaN });
    expect(footprint.source).toBe("unknown");
  });

  it("carries the caller-supplied area basis through untouched", () => {
    const footprint = buildExistingHouseFootprint(demoPresets[0], "unverified-building-area");
    expect(footprint.areaBasis).toBe("unverified-building-area");
  });
});

describe("buildExistingHouseSceneModel", () => {
  it("places the front wall at the front setback using half the house depth", () => {
    const parcel = demoPresets[0];
    const house = buildExistingHouseSceneModel(parcel);
    expect(house.boundsLocal!.maxZ).toBeCloseTo(parcel.lotLength / 2 - parcel.setbacks.front, 6);
    expect(house.boundsLocal!.minZ).toBeCloseTo(-3.5, 6);
  });

  it("returns null pose/corners/bounds when the footprint is unknown", () => {
    const model = buildExistingHouseSceneModel(fallbackLiveParcel);
    expect(model.pose).toBeNull();
    expect(model.corners).toBeNull();
    expect(model.boundsLocal).toBeNull();
  });

  it("produces 4 corners and finite bounds for a known footprint", () => {
    const model = buildExistingHouseSceneModel(demoPresets[0]);
    expect(model.corners).toHaveLength(4);
    expect(model.boundsLocal!.maxX).toBeGreaterThan(model.boundsLocal!.minX);
    for (const c of model.corners!) {
      expect(Number.isFinite(c.x)).toBe(true);
      expect(Number.isFinite(c.z)).toBe(true);
    }
  });

  it("returns a known footprint but null pose/corners when lotLength is invalid", () => {
    const parcel = { ...demoPresets[0], lotLength: NaN };
    const model = buildExistingHouseSceneModel(parcel);
    expect(model.footprint.width).not.toBeNull(); // footprint math didn't need lotLength
    expect(model.pose).toBeNull();
    expect(model.corners).toBeNull();
    expect(model.boundsLocal).toBeNull();
  });

  it("returns a known footprint but null pose when the front setback is negative", () => {
    const parcel = { ...demoPresets[0], setbacks: { ...demoPresets[0].setbacks, front: -1 } };
    const model = buildExistingHouseSceneModel(parcel);
    expect(model.footprint.width).not.toBeNull();
    expect(model.pose).toBeNull();
  });
});

describe("buildAduFootprint", () => {
  it("derives area from width * length, not the config.footprint label", () => {
    const footprint = buildAduFootprint(oversizeAduConfig);
    expect(footprint.areaSqft).toBe(31 * 20);
    expect(footprint.areaSqft).not.toBe(oversizeAduConfig.footprint);
  });

  it("returns the explicit unknown state for a zero-area config", () => {
    const footprint = buildAduFootprint(zeroAreaAduConfig);
    expect(footprint).toMatchObject({ areaSqft: 0, width: null, depth: null, source: "unknown" });
  });
});

describe("buildAduHeightModel — D4 height convention and roof geometry", () => {
  it("treats config.height as wallHeight (migration: not totalHeight)", () => {
    const model = buildAduHeightModel({ height: 12, roof: "shed", width: 20, length: 30 })!;
    expect(model.wallHeight).toBe(12);
    expect(model.totalHeight).toBeGreaterThan(model.wallHeight);
  });

  it("returns null (not NaN) for a negative or non-finite height", () => {
    expect(buildAduHeightModel({ height: -1, roof: "flat", width: 20, length: 30 })).toBeNull();
    expect(buildAduHeightModel({ height: NaN, roof: "flat", width: 20, length: 30 })).toBeNull();
  });

  it("returns null for a gable roof with a non-finite/zero width (ridge rise needs it)", () => {
    expect(buildAduHeightModel({ height: 12, roof: "gable", width: 0, length: 30 })).toBeNull();
    expect(buildAduHeightModel({ height: 12, roof: "gable", width: NaN, length: 30 })).toBeNull();
  });

  it("returns null for a shed roof with a non-finite/zero length (rise/overhang needs it)", () => {
    expect(buildAduHeightModel({ height: 12, roof: "shed", width: 20, length: 0 })).toBeNull();
    expect(buildAduHeightModel({ height: 12, roof: "shed", width: 20, length: NaN })).toBeNull();
  });

  it("gable ridge rise is clamped between 1.6 and 4 ft based on width, with a 0.8 ft overhang both axes", () => {
    const narrow = buildAduHeightModel({ height: 12, roof: "gable", width: 5, length: 30 })!;
    const wide = buildAduHeightModel({ height: 12, roof: "gable", width: 100, length: 30 })!;
    expect(narrow.roofGeometry.rise).toBeCloseTo(1.6, 5);
    expect(wide.roofGeometry.rise).toBeCloseTo(4, 5);
    expect(narrow.roofGeometry.overhangFt).toEqual({ width: 0.8, depth: 0.8 });
  });

  it("shed rise exceeds the nominal 2.1 ft by the tilted slab's thickness projection, and width overhang stays a flat 0.6 ft", () => {
    const model20 = buildAduHeightModel({ height: 12, roof: "shed", width: 20, length: 20 })!;
    const model40 = buildAduHeightModel({ height: 12, roof: "shed", width: 20, length: 40 })!;
    // Exact derivation: rise = 2.1 + 0.25 * (run / hypot(run, 2.1)), run = length + 1.4.
    const expectedRise = (length: number) => {
      const run = length + 1.4;
      return 2.1 + 0.25 * (run / Math.hypot(run, 2.1));
    };
    expect(model20.roofGeometry.rise).toBeCloseTo(expectedRise(20), 6);
    expect(model40.roofGeometry.rise).toBeCloseTo(expectedRise(40), 6);
    expect(model20.roofGeometry.rise).toBeGreaterThan(2.1);
    expect(model20.roofGeometry.overhangFt.width).toBe(0.6);
    // Length overhang converges toward 0.7 + a small thickness correction as length grows.
    expect(model20.roofGeometry.overhangFt.depth).toBeGreaterThan(0.7);
    expect(model20.roofGeometry.overhangFt.depth).toBeLessThan(0.73);
  });

  it("flat roof rise is a fixed 0.6 ft cap with a 0.6 ft overhang both axes", () => {
    const model = buildAduHeightModel({ height: 12, roof: "flat", width: 20, length: 30 })!;
    expect(model.roofGeometry.rise).toBeCloseTo(0.6, 5);
    expect(model.roofGeometry.overhangFt).toEqual({ width: 0.6, depth: 0.6 });
  });

  it("eaveHeight always equals wallHeight in this model", () => {
    for (const roof of ["shed", "gable", "flat"] as const) {
      const model = buildAduHeightModel({ height: 10, roof, width: 25, length: 30 })!;
      expect(model.eaveHeight).toBe(model.wallHeight);
    }
  });
});

describe("rectangleCorners", () => {
  it("returns axis-aligned corners at rotation 0", () => {
    const corners = rectangleCorners({ x: 0, z: 0 }, 20, 30, 0);
    expect(corners).toEqual([
      { x: 10, z: 15 },
      { x: 10, z: -15 },
      { x: -10, z: -15 },
      { x: -10, z: 15 },
    ]);
  });

  it("swaps the bounding footprint at a 90° rotation (T02's rotate-to-fit case)", () => {
    const corners = rectangleCorners({ x: 0, z: 0 }, 31, 20, 90);
    const xs = corners.map((c) => c.x);
    const zs = corners.map((c) => c.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(20, 5);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(31, 5);
  });
});

describe("buildAduSceneModel", () => {
  it("rotated bounds reflect the swapped footprint; footprintBounds top is wallHeight, roofBounds top is totalHeight", () => {
    const pose = { x: 0, z: 0, rotationDeg: 90 };
    const model = buildAduSceneModel(oversizeAduConfig, pose);
    expect(model.footprintBoundsLocal!.maxX - model.footprintBoundsLocal!.minX).toBeCloseTo(20, 5);
    expect(model.footprintBoundsLocal!.maxZ - model.footprintBoundsLocal!.minZ).toBeCloseTo(31, 5);
    expect(model.footprintBoundsLocal!.maxY).toBe(model.heightModel!.wallHeight);
    expect(model.roofBoundsLocal!.maxY).toBeCloseTo(model.heightModel!.totalHeight, 5);
  });

  it("roof bounds are strictly larger (footprint + overhang) than footprint bounds on both axes", () => {
    const pose = { x: 0, z: 0, rotationDeg: 0 };
    const model = buildAduSceneModel(defaultAduConfig, pose);
    expect(model.roofBoundsLocal!.maxX).toBeGreaterThan(model.footprintBoundsLocal!.maxX);
    expect(model.roofBoundsLocal!.maxZ).toBeGreaterThan(model.footprintBoundsLocal!.maxZ);
  });

  it("returns null corners/bounds for a zero-area config while still returning the pose", () => {
    const pose = { x: 5, z: 5, rotationDeg: 0 };
    const model = buildAduSceneModel(zeroAreaAduConfig, pose);
    expect(model.pose).toEqual(pose);
    expect(model.footprintCorners).toBeNull();
    expect(model.footprintBoundsLocal).toBeNull();
    expect(model.roofBoundsLocal).toBeNull();
  });

  it("returns the raw (invalid) pose but null corners/bounds when pose contains NaN", () => {
    const pose = { x: NaN, z: 0, rotationDeg: 0 };
    const model = buildAduSceneModel(defaultAduConfig, pose);
    expect(model.pose).toEqual(pose);
    expect(model.footprintCorners).toBeNull();
    expect(model.footprintBoundsLocal).toBeNull();
    expect(model.roofBoundsLocal).toBeNull();
  });

  it("returns null bounds when the height model itself is invalid (negative height)", () => {
    const config = { ...defaultAduConfig, height: -1 };
    const model = buildAduSceneModel(config, { x: 0, z: 0, rotationDeg: 0 });
    expect(model.heightModel).toBeNull();
    expect(model.footprintBoundsLocal).toBeNull();
    expect(model.roofBoundsLocal).toBeNull();
  });
});

describe("buildParcelOutline — D3 provenance", () => {
  it("marks a demo preset as source=preset, isProxy=false (no survey claim needed)", () => {
    const outline = buildParcelOutline(demoPresets[0]);
    expect(outline).toMatchObject({ source: "preset", isProxy: false, boundaryGeoJson: null });
  });

  it("marks a rotated Regrid parcel as source-provided but still a proxy (only the OBB is rendered)", () => {
    const outline = buildParcelOutline(rotatedLiveParcel);
    expect(outline.source).toBe("source-provided");
    expect(outline.isProxy).toBe(true);
    expect(outline.boundaryGeoJson).not.toBeNull();
  });

  it("marks an irregular/concave Regrid parcel as source-provided + proxy, without claiming the rectangle matches the true edges", () => {
    const outline = buildParcelOutline(irregularLiveParcel);
    expect(outline.source).toBe("source-provided");
    expect(outline.isProxy).toBe(true);
  });

  it("marks a fallback (no polygon) lookup as estimated + proxy", () => {
    const outline = buildParcelOutline(fallbackLiveParcel);
    expect(outline.source).toBe("estimated");
    expect(outline.isProxy).toBe(true);
    expect(outline.boundaryGeoJson).toBeNull();
  });

  it("returns the unknown state for non-finite/zero lot dimensions", () => {
    const outline = buildParcelOutline({ lotWidth: 0, lotLength: 100 });
    expect(outline.source).toBe("unknown");
  });
});

describe("buildSceneOrigin — D3/U8 provenance, no bearing inference", () => {
  it("marks a valid geocoded lat/lng as source=geocoded, bearing always null", () => {
    const origin = buildSceneOrigin(rotatedLiveParcel);
    expect(origin.source).toBe("geocoded");
    expect(origin.lat).toBe(rotatedLiveParcel.lat);
    expect(origin.bearingDeg).toBeNull();
  });

  it("marks absent lat/lng as unknown", () => {
    expect(buildSceneOrigin({})).toEqual({ lat: null, lng: null, bearingDeg: null, source: "unknown" });
  });

  it("marks an out-of-range latitude as unknown, not a geocoded claim", () => {
    const origin = buildSceneOrigin(invalidCoordinatesParcel);
    expect(origin.source).toBe("unknown");
    expect(origin.lat).toBeNull();
  });
});

describe("geodetic <-> local feet transforms (D3)", () => {
  const origin = { lat: 47.65, lng: -122.31 };

  it("round-trips local -> geodetic -> local within 0.01 ft, unrotated", () => {
    const point = { x: 13.37, z: -42.5 };
    const geo = projectLocalToGeodetic(origin, 0, point)!;
    const back = projectGeodeticToLocal(origin, 0, geo)!;
    expect(Math.abs(back.x - point.x)).toBeLessThan(0.01);
    expect(Math.abs(back.z - point.z)).toBeLessThan(0.01);
  });

  it("rejects a null/non-finite bearing rather than assuming north-up", () => {
    for (const bearing of [null, NaN, Infinity, -Infinity]) {
      expect(projectGeodeticToLocal(origin, bearing, { lat: 47.6505, lng: -122.309 })).toBeNull();
      expect(projectLocalToGeodetic(origin, bearing, { x: 13.37, z: -42.5 })).toBeNull();
    }
  });

  it("round-trips local -> geodetic -> local within 0.01 ft, with a non-null bearing", () => {
    const point = { x: -8.2, z: 55.9 };
    const bearing = 37;
    const geo = projectLocalToGeodetic(origin, bearing, point)!;
    const back = projectGeodeticToLocal(origin, bearing, geo)!;
    expect(Math.abs(back.x - point.x)).toBeLessThan(0.01);
    expect(Math.abs(back.z - point.z)).toBeLessThan(0.01);
  });

  it("round-trips geodetic -> local -> geodetic within a hair's breadth", () => {
    const point = { lat: 47.6505, lng: -122.309 };
    const local = projectGeodeticToLocal(origin, 15, point)!;
    const back = projectLocalToGeodetic(origin, 15, local)!;
    expect(back.lat).toBeCloseTo(point.lat, 8);
    expect(back.lng).toBeCloseTo(point.lng, 8);
  });

  it("recovers axis-aligned local dimensions from a rotated polygon only when the true bearing is supplied", () => {
    // rotatedLiveParcel's boundary was constructed as a 40x110 rectangle
    // rotated 30° at (47.65, -122.31) — see scene-model-fixtures.ts.
    const alignedLocal = projectPolygonToLocal(origin, 30, rotatedLiveParcel.boundaryGeoJson)!;
    const xs = alignedLocal.map((p) => p.x);
    const zs = alignedLocal.map((p) => p.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(40, 0);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(110, 0);
  });

  it("returns null when bearing is left unknown (null) — no alignment is invented", () => {
    expect(projectPolygonToLocal(origin, null, rotatedLiveParcel.boundaryGeoJson)).toBeNull();
  });

  it("returns null for a polygon with holes rather than silently dropping them", () => {
    const withHole: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [
        rotatedLiveParcel.boundaryGeoJson!.coordinates[0],
        irregularLiveParcel.boundaryGeoJson!.coordinates[0],
      ],
    };
    expect(projectPolygonToLocal(origin, 0, withHole)).toBeNull();
  });

  it("preserves a concave polygon's local vertex offsets within 0.01 ft", () => {
    // irregularLiveParcel's ring was built from these exact local feet
    // offsets around (30.25, -97.75) — see irregularPolygon() in fixtures.
    const expected = [
      { x: -25, z: -50 },
      { x: 25, z: -50 },
      { x: 25, z: 20 },
      { x: 5, z: 20 },
      { x: 5, z: 50 },
      { x: -25, z: 50 },
    ];
    const local = projectPolygonToLocal(
      { lat: irregularLiveParcel.lat, lng: irregularLiveParcel.lng },
      0,
      irregularLiveParcel.boundaryGeoJson,
    )!;
    for (let i = 0; i < expected.length; i++) {
      expect(Math.abs(local[i].x - expected[i].x)).toBeLessThan(0.01);
      expect(Math.abs(local[i].z - expected[i].z)).toBeLessThan(0.01);
    }
  });

  it("returns null for a degenerate ring with fewer than 4 points", () => {
    expect(projectPolygonToLocal(origin, 0, degeneratePolygon)).toBeNull();
  });

  it("returns null for a missing polygon", () => {
    expect(projectPolygonToLocal(origin, 0, null)).toBeNull();
  });

  it("returns null when the origin coordinates are out of range", () => {
    expect(projectGeodeticToLocal({ lat: 200, lng: -122.31 }, 0, { lat: 47.65, lng: -122.31 })).toBeNull();
  });

  it("returns null when the target point coordinates are non-finite", () => {
    expect(projectGeodeticToLocal(origin, 0, { lat: NaN, lng: -122.31 })).toBeNull();
  });

  it("returns null when the local point passed to the inverse transform is non-finite", () => {
    expect(projectLocalToGeodetic(origin, 0, { x: NaN, z: 0 })).toBeNull();
  });
});

describe("computeCoverageSummary — explicit unknown/completeness accounting", () => {
  it("sums the same footprint areas the scene renders when both are known", () => {
    const parcel = demoPresets[0];
    const existing = buildExistingHouseFootprint(parcel);
    const adu = buildAduFootprint(defaultAduConfig);
    const coverage = computeCoverageSummary(parcel.lotArea, existing, adu);
    expect(coverage.isComplete).toBe(true);
    expect(coverage.totalFootprintSqft).toBe(existing.areaSqft + adu.areaSqft);
    expect(coverage.coveragePercent).toBeCloseTo((coverage.totalFootprintSqft / parcel.lotArea) * 100, 6);
  });

  it("returns coveragePercent: null (not 0) for a zero/invalid lot area — missing area is not 0% coverage", () => {
    const existing = buildExistingHouseFootprint(demoPresets[0]);
    const adu = buildAduFootprint(defaultAduConfig);
    const zero = computeCoverageSummary(0, existing, adu);
    expect(zero.coveragePercent).toBeNull();
    expect(zero.lotAreaSqft).toBeNull();
    const invalid = computeCoverageSummary(NaN, existing, adu);
    expect(invalid.coveragePercent).toBeNull();
  });

  it("returns coveragePercent: null and isComplete: false for an unknown existing building alongside a valid ADU and invalid lot area", () => {
    const unknownExisting = buildExistingHouseFootprint(fallbackLiveParcel); // existingHouseSqft: 0
    const validAdu = buildAduFootprint(defaultAduConfig);
    const coverage = computeCoverageSummary(NaN, unknownExisting, validAdu);
    expect(coverage.existingFootprintKnown).toBe(false);
    expect(coverage.aduFootprintKnown).toBe(true);
    expect(coverage.isComplete).toBe(false);
    expect(coverage.lotAreaSqft).toBeNull();
    expect(coverage.coveragePercent).toBeNull();
    // The unknown house must not silently read as "0 sf of house" being the full picture.
    expect(coverage.existingFootprintSqft).toBe(0);
  });

  it("flags isComplete: false when only the ADU footprint is unknown", () => {
    const existing = buildExistingHouseFootprint(demoPresets[0]);
    const unknownAdu = buildAduFootprint(zeroAreaAduConfig);
    const coverage = computeCoverageSummary(demoPresets[0].lotArea, existing, unknownAdu);
    expect(coverage.isComplete).toBe(false);
    expect(coverage.coveragePercent).toBeNull();
  });
});

describe("buildSceneModel — end-to-end contract", () => {
  it("assembles a full model for each demo preset with agreeing coverage and house area", () => {
    for (const parcel of demoPresets) {
      const model = buildSceneModel(parcel, defaultAduConfig, { x: 0, z: -40, rotationDeg: 0 });
      expect(model.existingHouse.footprint.areaSqft).toBe(parcel.existingHouseSqft);
      expect(model.coverage.existingFootprintSqft).toBe(parcel.existingHouseSqft);
      expect(model.coverage.isComplete).toBe(true);
      expect(model.parcelOutline.source).toBe("preset");
    }
  });

  it("marks origin as unknown (no bearing/geocode claim) when lat/lng are absent, e.g. presets", () => {
    const model = buildSceneModel(demoPresets[0], defaultAduConfig, { x: 0, z: 0, rotationDeg: 0 });
    expect(model.origin).toEqual({ lat: null, lng: null, bearingDeg: null, source: "unknown" });
  });

  it("carries lat/lng through as geocoded for a live parcel but still leaves bearing unknown", () => {
    const model = buildSceneModel(rotatedLiveParcel, defaultAduConfig, { x: 0, z: 0, rotationDeg: 0 });
    expect(model.origin.source).toBe("geocoded");
    expect(model.origin.lat).toBe(rotatedLiveParcel.lat);
    expect(model.origin.bearingDeg).toBeNull();
  });
});
