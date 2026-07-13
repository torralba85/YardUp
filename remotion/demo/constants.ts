/** LotFoundry product demo — marketing campaign composition. */
export const DEMO_FPS = 30;
export const DEMO_WIDTH = 1920;
export const DEMO_HEIGHT = 1080;

/**
 * Product walkthrough duration.
 * Sum of SCENES minus 7 scene overlaps of 12 frames each (Series offset).
 */
export const DEMO_DURATION_IN_FRAMES =
  90 + 150 + 150 + 210 + 240 + 240 + 180 + 210 - 7 * 12;

export const DEMO_PALETTE = {
  ink: "#0A1120",
  navy: "#121D33",
  card: "#16233C",
  mist: "#EAF0FA",
  slate: "#93A3C0",
  glow: "#F5B54A",
  money: "#7ED4A6",
  hairline: "#263450",
  sand: "#F2E5D5",
  espresso: "#261307",
  forest: "#2F4A38",
  mahogany: "#592A0F",
  clay: "#8C5B3F",
  parchment: "#FBF6EE",
} as const;

/** Scene lengths in frames (30fps). Transition overlaps handled in composition. */
export const SCENES = {
  brand: 90,
  hook: 150,
  problem: 150,
  flow: 210,
  money: 240,
  studio: 240,
  report: 180,
  cta: 210,
} as const;

export const MARKET = {
  rentBand: "$2,100–$2,600",
  rentMid: 2350,
  noi: 22400,
  paybackYears: 12,
  buildLow: 230000,
  buildHigh: 290000,
  buildBand: "$230K–$290K",
  markets: "Seattle · Portland · Austin",
} as const;
