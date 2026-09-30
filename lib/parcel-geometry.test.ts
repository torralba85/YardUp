import { describe, expect, it } from "vitest";
import {
  distanceToPolygonFt,
  estimateLotDimensions,
  interiorPoint,
  orientedLotDimensions,
  polygonAreaSqft,
  polygonContainsPoint,
} from "./parcel-geometry";
import type { GeoJsonPolygon } from "./parcel-types";

const FT_PER_DEG_LAT = 364000;

/**
 * Build a rectangular lot polygon centered at (lat, lng), `widthFt` in the
 * rotated-x direction and `lengthFt` in the rotated-y direction, rotated by
 * `angleDeg`. Coordinates are GeoJSON [lng, lat] pairs.
 */
function rectPolygon(
  lat: number,
  lng: number,
  widthFt: number,
  lengthFt: number,
  angleDeg: number,
): GeoJsonPolygon {
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const lngScale = FT_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const corners: [number, number][] = [
    [-widthFt / 2, -lengthFt / 2],
    [widthFt / 2, -lengthFt / 2],
    [widthFt / 2, lengthFt / 2],
    [-widthFt / 2, lengthFt / 2],
  ];
  const ring = corners.map(([x, y]) => {
    const rx = x * cosA - y * sinA;
    const ry = x * sinA + y * cosA;
    return [lng + rx / lngScale, lat + ry / FT_PER_DEG_LAT];
  });
  ring.push(ring[0]); // close the ring
  return { type: "Polygon", coordinates: [ring] };
}

describe("orientedLotDimensions", () => {
  it("recovers exact dimensions for an axis-aligned rectangle", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(dims!.lotWidth).toBeCloseTo(50, 0);
    expect(dims!.lotLength).toBeCloseTo(100, 0);
  });

  it("recovers true dimensions for a 30° rotated rectangle (Seattle latitude)", () => {
    // The old axis-aligned code would report ~93×112 for this lot.
    const poly = rectPolygon(47.65, -122.31, 50, 100, 30);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(Math.abs(dims!.lotWidth - 50)).toBeLessThanOrEqual(1);
    expect(Math.abs(dims!.lotLength - 100)).toBeLessThanOrEqual(1);
  });

  it("recovers true dimensions for a 45° rotated rectangle", () => {
    const poly = rectPolygon(30.25, -97.75, 60, 120, 45);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(Math.abs(dims!.lotWidth - 60)).toBeLessThanOrEqual(1);
    expect(Math.abs(dims!.lotLength - 120)).toBeLessThanOrEqual(1);
  });

  it("uses cos(lat) longitude scaling — a Seattle lot is not distorted", () => {
    // At 47.65°N, 1° lng ≈ 245,000 ft, not the 288,000 the old code assumed.
    // A 100 ft east-west by 50 ft north-south axis-aligned lot must come back
    // 50×100, which only happens with latitude-correct projection.
    const poly = rectPolygon(47.65, -122.31, 100, 50, 0);
    const dims = orientedLotDimensions(poly);
    expect(dims).not.toBeNull();
    expect(dims!.lotWidth).toBeCloseTo(50, 0);
    expect(dims!.lotLength).toBeCloseTo(100, 0);
  });

  it("returns null for a degenerate sliver (< 10 ft wide)", () => {
    const poly = rectPolygon(47.65, -122.31, 2, 300, 0);
    expect(orientedLotDimensions(poly)).toBeNull();
  });

  it("returns null for an implausibly huge lot (> 1000 ft)", () => {
    const poly = rectPolygon(47.65, -122.31, 500, 2000, 0);
    expect(orientedLotDimensions(poly)).toBeNull();
  });

  it("returns null when the rectangle wildly disagrees with reported lot area", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0); // 5000 sq ft rect
    expect(orientedLotDimensions(poly, 40000)).toBeNull(); // 8x mismatch
  });

  it("accepts moderate area disagreement (irregular lots)", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0); // 5000 sq ft rect
    expect(orientedLotDimensions(poly, 4000)).not.toBeNull();
  });

  it("returns null for a polygon with too few points", () => {
    const poly: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [[[-122.31, 47.65], [-122.3105, 47.6502]]],
    };
    expect(orientedLotDimensions(poly)).toBeNull();
  });
});

describe("estimateLotDimensions", () => {
  it("derives proportional width/length from area at ~2:1 depth-to-width", () => {
    const dims = estimateLotDimensions(5000);
    expect(dims.lotWidth).toBe(50); // sqrt(5000/2)
    expect(dims.lotLength).toBe(100);
  });

  it("scales with area: a 12,000 sq ft lot is wider than a 4,000 sq ft one", () => {
    const small = estimateLotDimensions(4000);
    const big = estimateLotDimensions(12000);
    expect(big.lotWidth).toBeGreaterThan(small.lotWidth);
    expect(big.lotLength).toBeGreaterThan(small.lotLength);
  });

  it("clamps width to at least 25 ft and preserves area via length", () => {
    const dims = estimateLotDimensions(800); // sqrt(400) = 20 → clamp 25
    expect(dims.lotWidth).toBe(25);
    expect(dims.lotLength).toBe(32); // 800 / 25
  });

  it("clamps width to at most 200 ft", () => {
    const dims = estimateLotDimensions(200000); // sqrt(100000) ≈ 316 → clamp
    expect(dims.lotWidth).toBe(200);
    expect(dims.lotLength).toBe(1000); // 200000 / 200
  });

  it("returns a sane default for zero/negative area", () => {
    expect(estimateLotDimensions(0)).toEqual({ lotWidth: 40, lotLength: 100 });
    expect(estimateLotDimensions(-5)).toEqual({ lotWidth: 40, lotLength: 100 });
  });
});

describe("polygonAreaSqft", () => {
  it("computes the area of a rectangle in square feet", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 0);
    expect(polygonAreaSqft(poly)).toBeCloseTo(5000, -2); // within ~50 sq ft
  });

  it("is rotation-invariant", () => {
    const poly = rectPolygon(47.65, -122.31, 50, 100, 37);
    expect(polygonAreaSqft(poly)).toBeCloseTo(5000, -2);
  });

  it("returns 0 for degenerate input", () => {
    const poly: GeoJsonPolygon = { type: "Polygon", coordinates: [[]] };
    expect(polygonAreaSqft(poly)).toBe(0);
  });
});

describe("distanceToPolygonFt", () => {
  const LAT = 47.69;
  const LNG = -122.31;
  const lngScale = FT_PER_DEG_LAT * Math.cos((LAT * Math.PI) / 180);
  // 50 ft wide (east-west) by 100 ft long (north-south), centered on (LAT, LNG).
  const lot = rectPolygon(LAT, LNG, 50, 100, 0);

  it("is 0 for a point inside the polygon", () => {
    expect(distanceToPolygonFt(lot, LNG, LAT)).toBe(0);
  });

  it("measures straight-line feet to the nearest edge", () => {
    // 75 ft east of center is 50 ft past the 25 ft half-width.
    expect(distanceToPolygonFt(lot, LNG + 75 / lngScale, LAT)).toBeCloseTo(50, 0);
  });

  it("measures to the nearest corner for a diagonal point", () => {
    // Corner is at (25, 50) ft; the point sits 30 ft east and 40 ft north of it.
    const distance = distanceToPolygonFt(
      lot,
      LNG + 55 / lngScale,
      LAT + 90 / FT_PER_DEG_LAT,
    );
    expect(distance).toBeCloseTo(50, 0);
  });

  it("is Infinity when the polygon has no usable exterior ring", () => {
    const empty: GeoJsonPolygon = { type: "Polygon", coordinates: [[]] };
    expect(distanceToPolygonFt(empty, LNG, LAT)).toBe(Infinity);
  });
});

describe("interiorPoint", () => {
  it("returns a point inside a plain lot", () => {
    const lot = rectPolygon(47.69, -122.31, 50, 100, 30);
    const point = interiorPoint(lot);
    expect(point).not.toBeNull();
    expect(polygonContainsPoint(lot, point!.lng, point!.lat)).toBe(true);
  });

  it("stays on an L-shaped lot whose centroid falls outside it", () => {
    const ell: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [[[0, 0], [10, 0], [10, 1], [1, 1], [1, 10], [0, 10], [0, 0]]],
    };
    const point = interiorPoint(ell);
    expect(point).not.toBeNull();
    expect(polygonContainsPoint(ell, point!.lng, point!.lat)).toBe(true);
  });

  it("avoids a hole", () => {
    const donut: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[3, 3], [3, 7], [7, 7], [7, 3], [3, 3]],
      ],
    };
    const point = interiorPoint(donut);
    expect(point).not.toBeNull();
    expect(polygonContainsPoint(donut, point!.lng, point!.lat)).toBe(true);
  });

  it("returns null for a degenerate polygon", () => {
    expect(interiorPoint({ type: "Polygon", coordinates: [[]] })).toBeNull();
    const flat: GeoJsonPolygon = {
      type: "Polygon",
      coordinates: [[[0, 1], [5, 1], [9, 1], [0, 1]]],
    };
    expect(interiorPoint(flat)).toBeNull();
  });
});
