/**
 * Geographic → pixel coordinate projection for Google Maps Static images.
 *
 * Google Maps Static uses Web Mercator (EPSG:3857). This helper converts a
 * lat/lng to pixel coordinates within a Static Maps image of known size and
 * zoom level, using the same projection Google uses internally.
 *
 * Reference: https://developers.google.com/maps/documentation/javascript/coordinates
 */

const TILE_SIZE = 256;

/** Project lat/lng to world (pixel) coordinates at zoom 0. */
function project(lat: number, lng: number): { x: number; y: number } {
  const siny = Math.sin((lat * Math.PI) / 180);
  const clampedSiny = Math.min(Math.max(siny, -0.9999), 0.9999);

  return {
    x: TILE_SIZE * (0.5 + lng / 360),
    y: TILE_SIZE * (0.5 - Math.log((1 + clampedSiny) / (1 - clampedSiny)) / (4 * Math.PI)),
  };
}

/**
 * Convert a geographic coordinate to pixel position within a Static Maps image.
 *
 * @param lat - Latitude of the point to project
 * @param lng - Longitude of the point to project
 * @param centerLat - Latitude of the map center (as requested to Static Maps API)
 * @param centerLng - Longitude of the map center
 * @param zoom - Zoom level (e.g. 19)
 * @param imageWidth - Width of the image in CSS pixels
 * @param imageHeight - Height of the image in CSS pixels
 * @param scale - Maps Static scale (1 or 2 for retina). Default 2.
 * @returns { x, y } pixel position within the image element
 */
export function latLngToPixel(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  imageWidth: number,
  imageHeight: number,
  scale = 2,
): { x: number; y: number } {
  const numTiles = 1 << zoom; // 2^zoom

  const center = project(centerLat, centerLng);
  const point = project(lat, lng);

  // Pixel offset from center in world pixels at this zoom
  const dx = (point.x - center.x) * numTiles * TILE_SIZE;
  const dy = (point.y - center.y) * numTiles * TILE_SIZE;

  // The image coordinate origin is the top-left corner.
  // Google Static Maps returns `scale` physical pixels per CSS pixel.
  const cssScale = scale; // retina factor
  return {
    x: imageWidth / 2 + dx / cssScale,
    y: imageHeight / 2 + dy / cssScale,
  };
}

/**
 * Compute the bounding box for an array of lat/lng coordinates.
 */
export function boundingBox(coords: { lat: number; lng: number }[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}
