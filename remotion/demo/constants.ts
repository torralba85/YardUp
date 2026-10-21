import { COLOR } from "../../lib/design-tokens";
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
  ink: COLOR["lot-ink"],
  navy: COLOR["lot-ink"],
  card: COLOR["lot-surface-dark"],
  mist: COLOR["lot-chalk"],
  slate: COLOR["lot-stone-on-dark"],
  glow: COLOR["lot-orange"],
  money: COLOR["lot-chalk"],
  hairline: COLOR["lot-line-dark"],
  sand: COLOR["lot-chalk"],
  espresso: COLOR["lot-ink"],
  forest: COLOR["status-eligible"],
  mahogany: COLOR["lot-ink"],
  clay: COLOR["lot-orange"],
  parchment: COLOR["lot-chalk"],
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
