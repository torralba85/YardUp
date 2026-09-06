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

/**
 * Formats whole and half-hour preview values for the scene control as a clock
 * time ("1:30 PM"), not a decimal hour.
 */
export function formatPreviewHour(hour: number): string {
  const safeHour = Number.isFinite(hour)
    ? Math.min(Math.max(hour, PREVIEW_START_HOUR), PREVIEW_END_HOUR)
    : 12;
  const period = safeHour >= 12 ? "PM" : "AM";
  const wholeHour = Math.floor(safeHour);
  const hour12 = wholeHour % 12 || 12;
  const minutes = Math.round((safeHour - wholeHour) * 60);
  if (minutes === 0) return `${hour12} ${period}`;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hour12}:${minStr} ${period}`;
}

/**
 * Named lighting presets. Golden Hour stays the default presentation register;
 * Neutral Inspection exists so the four exterior finishes can be compared under
 * even, uncoloured light (D7). Both are illustrative studio lighting — neither
 * is a geographic sun study, and neither should be labelled as one.
 */
export type LightingPresetId = "neutral" | "golden-hour";

export interface LightingPreset {
  id: LightingPresetId;
  name: string;
  description: string;
  sunPosition: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  fillPosition: [number, number, number];
  fillColor: string;
  fillIntensity: number;
}

export const LIGHTING_PRESETS: Record<LightingPresetId, LightingPreset> = {
  neutral: {
    id: "neutral",
    name: "Gallery Daylight",
    description: "Possibility Series gallery daylighting with clean architectural plane definition and high contrast clarity.",
    sunPosition: [25, 65, 35],
    sunColor: "#ffffff",
    sunIntensity: 1.15,
    ambientColor: "#F5F5F0",
    ambientIntensity: 0.65,
    fillPosition: [-30, 40, -25],
    fillColor: "#DADAD3",
    fillIntensity: 0.35,
  },
  "golden-hour": {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Warm, illustrative late afternoon preset emphasizing depth and architectural plane definition.",
    sunPosition: [55, 22, 28],
    sunColor: "#ffd59e",
    sunIntensity: 1.35,
    ambientColor: "#fed7aa",
    ambientIntensity: 0.45,
    fillPosition: [-40, 25, -20],
    fillColor: "#93c5fd",
    fillIntensity: 0.25,
  },
};

export function getLightingPreset(id: LightingPresetId): LightingPreset {
  return LIGHTING_PRESETS[id] ?? LIGHTING_PRESETS.neutral;
}
