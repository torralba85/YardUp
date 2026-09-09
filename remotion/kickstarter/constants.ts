/**
 * LotFoundry Kickstarter Campaign Video — Composition Constants & Configuration.
 * Conforms to the A LOT MORE design system with Kickstarter campaign branding.
 */

export const KICKSTARTER_FPS = 30;
export const KICKSTARTER_WIDTH = 1920;
export const KICKSTARTER_HEIGHT = 1080;

/** Scene lengths in frames (30fps). Overlaps handled in Series. */
export const KICKSTARTER_SCENES = {
  brand: 100,      // 0.0s – 3.3s: Kickstarter badge + LotFoundry identity
  hook: 150,       // 3.3s – 8.3s: "See what your backyard can earn"
  problem: 160,    // 8.3s – 13.6s: Old way ($5K, 8 weeks) vs LotFoundry
  flow: 210,       // 13.6s – 20.6s: 4 steps to a clear answer
  studio: 210,     // 20.6s – 27.6s: 3D interactive studio & zoning verification
  mission: 210,    // 27.6s – 34.6s: Why Kickstarter + 3 Backer Reward Tiers
  cta: 200,        // 34.6s – 41.2s: Back this project on Kickstarter
} as const;

export const OVERLAP_FRAMES = 12;

/**
 * Total duration calculation:
 * Sum of scene lengths minus 6 scene overlaps of 12 frames each.
 */
export const KICKSTARTER_DURATION_IN_FRAMES =
  KICKSTARTER_SCENES.brand +
  KICKSTARTER_SCENES.hook +
  KICKSTARTER_SCENES.problem +
  KICKSTARTER_SCENES.flow +
  KICKSTARTER_SCENES.studio +
  KICKSTARTER_SCENES.mission +
  KICKSTARTER_SCENES.cta -
  6 * OVERLAP_FRAMES; // 1240 - 72 = 1168 frames (~38.9s @ 30fps)

export const KICKSTARTER_PALETTE = {
  // Brand foundation
  carbon: "#161616",
  chalk: "#F5F5F0",
  card: "#212121",
  cardBorder: "#33332D",
  hairline: "#44443F",
  stone: "#B7B7AE",
  signalOrange: "#FF5B24",
  orangeHover: "#EE4B17",

  // Kickstarter identity
  kickstarterGreen: "#05CE78",
  kickstarterDarkGreen: "#028858",
  kickstarterPillBg: "rgba(5, 206, 120, 0.12)",
  kickstarterPillBorder: "rgba(5, 206, 120, 0.35)",

  // Financial & status
  verifiedGreen: "#176B4C",
  dangerRed: "#D83B20",
} as const;

export const BACKER_TIERS = [
  {
    tier: "Tier 1",
    pledge: "$25",
    title: "Founding Backer",
    perk: "Early Studio Beta Access + 5 Verified Parcel Unlocks",
  },
  {
    tier: "Tier 2",
    pledge: "$75",
    title: "Homeowner Studio Pro",
    perk: "Lifetime Feasibility Studio + Unlimited 3D Scenarios",
    featured: true,
  },
  {
    tier: "Tier 3",
    pledge: "$250",
    title: "Builder & Architect Partner",
    perk: "Verified Directory Badge + Direct Pre-Qualified Client Leads",
  },
] as const;

export const KICKSTARTER_STEPS = [
  {
    n: "01",
    title: "Enter Any Address",
    body: "Pulls GIS satellite parcel lines, county assessor data & local zoning laws.",
  },
  {
    n: "02",
    title: "Explore in 3D",
    body: "Place custom ADUs, test setbacks, height envelopes & solar path in real time.",
  },
  {
    n: "03",
    title: "Real Financial Pro-Forma",
    body: "Live market rent ($2,100–$2,600), build cost ($230K–$290K), NOI & payback schedule.",
  },
  {
    n: "04",
    title: "Certificate & Builder Match",
    body: "Download an official Feasibility Certificate and connect with verified local builders.",
  },
] as const;
