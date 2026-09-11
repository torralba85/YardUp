import { fonts } from "../demo/fonts";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * A LOT MORE design tokens (docs/design/design-system.md)
 */
export const PALETTE = {
  chalk: "#F5F5F0",
  carbon: "#161616",
  orange: "#FF5B24",
  orangeHover: "#EE4B17",
  orangeInk: "#C43708", // Contrast-safe orange text on light ground
  stone: "#B7B7AE",     // Stone text for dark surfaces
  lineDark: "#44443F",
  lineLight: "#E7E7DF",
  cardDark: "#1F1F1E",
  cardDarkElevated: "#292927",
  cardLight: "#FFFFFF",
  green: "#176B4C",     // Strictly reserved for eligible/verified status
  amber: "#D97706",
} as const;

export { fonts };

/**
 * Scene frame lengths @ 30fps.
 * Total: 4,460 frames = 148.67 seconds (~2m 28s).
 */
export const SCENE_DURATIONS = {
  scene01: 460, // 0 - 15.33s: The opportunity
  scene02: 330, // 15.33 - 26.33s: The problem (Zoning, Setbacks, Permits, etc.)
  scene03: 220, // 26.33 - 33.67s: Introducing LotFoundry
  scene04: 900, // 33.67 - 63.67s: Real product demonstration (11-step walkthrough)
  scene05: 370, // 63.67 - 76.00s: Important limitation (Disclaimer)
  scene06: 680, // 76.00 - 98.67s: Why Kickstarter (What Kickstarter funds)
  scene07: 310, // 98.67 - 109.00s: Funding goal ($6,000)
  scene08: 330, // 109.00 - 120.00s: Founder (Andrew Torralba)
  scene09: 400, // 120.00 - 133.33s: AI disclosure
  scene10: 460, // 133.33 - 148.67s: Closing (CTA)
} as const;

export const TOTAL_DURATION_IN_FRAMES = Object.values(SCENE_DURATIONS).reduce(
  (a, b) => a + b,
  0,
);

export interface CaptionSegment {
  startSec: number;
  endSec: number;
  text: string;
}

export const CAPTIONS: Record<string, CaptionSegment[]> = {
  scene01: [
    {
      startSec: 0.1,
      endSec: 5.2,
      text: "Many homeowners have space in their backyard they may never have considered using.",
    },
    {
      startSec: 5.3,
      endSec: 10.4,
      text: "An accessory dwelling unit could create space for family, a home office, or potential rental income.",
    },
    {
      startSec: 10.5,
      endSec: 15.0,
      text: "But figuring out whether one can actually work on your property can be complicated.",
    },
  ],
  scene02: [
    {
      startSec: 0.2,
      endSec: 4.6,
      text: "Zoning rules, setbacks, permits, construction costs, parcel information —",
    },
    {
      startSec: 4.7,
      endSec: 10.4,
      text: "before you ever speak with a builder, there are already dozens of questions to answer.",
    },
  ],
  scene03: [
    {
      startSec: 0.2,
      endSec: 6.7,
      text: "That is why I built LotFoundry — an ADU feasibility studio designed to make the first step easier.",
    },
  ],
  scene04: [
    {
      startSec: 0.2,
      endSec: 4.5,
      text: "Give LotFoundry a property and it creates a visual model of the lot.",
    },
    {
      startSec: 4.6,
      endSec: 9.8,
      text: "You can see the existing home, understand estimated setback areas, and explore where an ADU might fit.",
    },
    {
      startSec: 9.9,
      endSec: 14.5,
      text: "Change the size, reposition the concept, and compare different possibilities.",
    },
    {
      startSec: 14.6,
      endSec: 21.0,
      text: "LotFoundry can also provide preliminary construction estimates, rental estimates,",
    },
    {
      startSec: 21.1,
      endSec: 29.0,
      text: "basic financial projections, and a feasibility report you can use as a starting point for conversations with local professionals.",
    },
  ],
  scene05: [
    {
      startSec: 0.2,
      endSec: 5.8,
      text: "LotFoundry does not replace an architect, contractor, engineer, or local planning department.",
    },
    {
      startSec: 5.9,
      endSec: 11.8,
      text: "Property data and local regulations must always be verified before construction.",
    },
  ],
  scene06: [
    {
      startSec: 0.2,
      endSec: 5.0,
      text: "The core technology already exists as a working web prototype.",
    },
    {
      startSec: 5.1,
      endSec: 11.5,
      text: "This Kickstarter is funding the next step: rebuilding the experience for touch, optimizing the 3D tools for real phones,",
    },
    {
      startSec: 11.6,
      endSec: 16.5,
      text: "completing mobile accounts and saved projects, testing accessibility and performance,",
    },
    {
      startSec: 16.6,
      endSec: 21.8,
      text: "and preparing LotFoundry for submission to the App Store and Google Play.",
    },
  ],
  scene07: [
    {
      startSec: 0.2,
      endSec: 4.8,
      text: "The goal is six thousand dollars, with a deliberately focused scope:",
    },
    {
      startSec: 4.9,
      endSec: 9.7,
      text: "complete, test, and deliver the first public mobile release of LotFoundry.",
    },
  ],
  scene08: [
    {
      startSec: 0.2,
      endSec: 4.8,
      text: "I’m Andrew Torralba, the developer behind LotFoundry.",
    },
    {
      startSec: 4.9,
      endSec: 10.4,
      text: "I built the prototype myself, and I’ll be responsible for building, testing, and delivering the mobile release.",
    },
  ],
  scene09: [
    {
      startSec: 0.2,
      endSec: 5.5,
      text: "AI tools are used in parts of the development process and for illustrative concept imagery.",
    },
    {
      startSec: 5.6,
      endSec: 12.8,
      text: "Any AI-generated architectural concepts shown are illustrations, not photographs of completed projects.",
    },
  ],
  scene10: [
    {
      startSec: 0.2,
      endSec: 5.5,
      text: "I believe homeowners should be able to stand in their own backyard, pull out their phone,",
    },
    {
      startSec: 5.6,
      endSec: 9.8,
      text: "and get a useful answer to one simple question: could an ADU work here?",
    },
    {
      startSec: 9.9,
      endSec: 14.4,
      text: "If you believe that should be easier too, I’d love your support bringing LotFoundry to mobile.",
    },
  ],
};
