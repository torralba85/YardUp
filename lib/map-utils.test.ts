import { describe, expect, it } from "vitest";
import { latLngToPixel, boundingBox } from "./map-utils";

describe("latLngToPixel", () => {
  const centerLat = 47.6500;
  const centerLng = -122.3100;
  const zoom = 19;
  const w = 800;
  const h = 540;

  it("returns the image center for the center coordinates", () => {
    const { x, y } = latLngToPixel(centerLat, centerLng, centerLat, centerLng, zoom, w, h);
    // Should be exactly at image center (within floating point tolerance)
    expect(x).toBeCloseTo(w / 2, 1);
    expect(y).toBeCloseTo(h / 2, 1);
  });

  it("places a point north of center above the center line", () => {
    const { y } = latLngToPixel(centerLat + 0.0001, centerLng, centerLat, centerLng, zoom, w, h);
    // More northward = smaller y (closer to top of image)
    expect(y).toBeLessThan(h / 2);
  });

  it("places a point east of center to the right of center", () => {
    const { x } = latLngToPixel(centerLat, centerLng + 0.0001, centerLat, centerLng, zoom, w, h);
    expect(x).toBeGreaterThan(w / 2);
  });

  it("places a point south of center below the center line", () => {
    const { y } = latLngToPixel(centerLat - 0.0001, centerLng, centerLat, centerLng, zoom, w, h);
    expect(y).toBeGreaterThan(h / 2);
  });

  it("projects ground distance at the true zoom-19 resolution", () => {
    // Web Mercator ground resolution: 156543.03392 * cos(lat) / 2^zoom m/px.
    // 30 m east of center should land 30 / resolution pixels right of center.
    const metersEast = 30;
    const metersPerDegLng =
      111319.4908 * Math.cos((centerLat * Math.PI) / 180);
    const { x } = latLngToPixel(
      centerLat,
      centerLng + metersEast / metersPerDegLng,
      centerLat,
      centerLng,
      zoom,
      w,
      h,
    );
    const resolution =
      (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / 2 ** zoom;
    expect(x - w / 2).toBeCloseTo(metersEast / resolution, 0);
  });

  it("keeps a lot-sized offset within the image frame", () => {
    // A 40 ft (~12.2 m) offset — a typical lot half-width — must project to
    // tens of pixels, not off the image. Guards against unit regressions in
    // the world-pixel math (an extra TILE_SIZE factor once pushed overlays
    // ~128x off-frame).
    const metersPerDegLng =
      111319.4908 * Math.cos((centerLat * Math.PI) / 180);
    const { x } = latLngToPixel(
      centerLat,
      centerLng + 12.2 / metersPerDegLng,
      centerLat,
      centerLng,
      zoom,
      w,
      h,
    );
    expect(x).toBeGreaterThan(w / 2 + 20);
    expect(x).toBeLessThan(w / 2 + 100);
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
