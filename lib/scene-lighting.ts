const PREVIEW_START_HOUR = 7;
const PREVIEW_END_HOUR = 19;
const SUN_RADIUS = 75;
const MIN_SUN_HEIGHT = 14;

/**
 * Returns a stable, illustrative light position for the 3D scene preview.
 * This intentionally does not claim geographic solar accuracy: it has no
 * parcel bearing, date, latitude, or longitude inputs.
 */
export function getIllustrativeSunPosition(hour: number): [number, number, number] {
  const safeHour = Number.isFinite(hour)
    ? Math.min(Math.max(hour, PREVIEW_START_HOUR), PREVIEW_END_HOUR)
    : 12;
  const hourAngle = ((safeHour - 12) / 6) * (Math.PI / 2);
  const x = Math.sin(hourAngle) * SUN_RADIUS;
  const y = Math.max(Math.cos(hourAngle) * SUN_RADIUS, MIN_SUN_HEIGHT);
  const z = Math.cos(hourAngle) * 35 + 20;
  return [x, y, z];
}

/** Formats whole and half-hour preview values for the scene control. */
export function formatPreviewHour(hour: number): string {
  const safeHour = Number.isFinite(hour)
    ? Math.min(Math.max(hour, PREVIEW_START_HOUR), PREVIEW_END_HOUR)
    : 12;
  const period = safeHour >= 12 ? "PM" : "AM";
  const hour12 = safeHour % 12 || 12;
  return `${hour12.toFixed(1).replace(".0", "")} ${period}`;
}
