import { describe, expect, it } from "vitest";
import { latLngToPixel, boundingBox } from "./map-utils";

describe("latLngToPixel", () => {
  const centerLat = 47.6500;
  const centerLng = -122.3100;
  const zoom = 19;
  const w = 800;
  const h = 540;

  it("returns the image center for the center coordinates", () => {
    const { x, y } = latLngToPixel(centerLat, centerLng, centerLat, centerLng, zoom, w, h, 2);
    // Should be exactly at image center (within floating point tolerance)
    expect(x).toBeCloseTo(w / 2, 1);
    expect(y).toBeCloseTo(h / 2, 1);
  });

  it("places a point north of center above the center line", () => {
    const { y } = latLngToPixel(centerLat + 0.0001, centerLng, centerLat, centerLng, zoom, w, h, 2);
    // More northward = smaller y (closer to top of image)
    expect(y).toBeLessThan(h / 2);
  });

  it("places a point east of center to the right of center", () => {
    const { x } = latLngToPixel(centerLat, centerLng + 0.0001, centerLat, centerLng, zoom, w, h, 2);
    expect(x).toBeGreaterThan(w / 2);
  });

  it("places a point south of center below the center line", () => {
    const { y } = latLngToPixel(centerLat - 0.0001, centerLng, centerLat, centerLng, zoom, w, h, 2);
    expect(y).toBeGreaterThan(h / 2);
  });
});

describe("boundingBox", () => {
  it("returns correct min/max values", () => {
    const coords = [
      { lat: 47.65, lng: -122.31 },
      { lat: 47.66, lng: -122.30 },
      { lat: 47.64, lng: -122.32 },
    ];
    const box = boundingBox(coords);
    expect(box.minLat).toBe(47.64);
    expect(box.maxLat).toBe(47.66);
    expect(box.minLng).toBe(-122.32);
    expect(box.maxLng).toBe(-122.30);
  });
});
