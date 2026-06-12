import type { ExteriorFinish, RoofStyle } from "./feasibility";

export interface InspirationItem {
  id: string;
  title: string;
  style: string;
  sqft: number;
  width: number;
  length: number;
  roof: RoofStyle;
  finish: ExteriorFinish;
  tags: string[];
  summary: string;
  budgetBand: string;
  imagePath: string;
}

export const inspirationItems: InspirationItem[] = [
  {
    id: "canyon-courtyard",
    title: "Courtyard Studio with Clerestory Light",
    style: "Warm Modern",
    sqft: 640,
    width: 20,
    length: 32,
    roof: "shed",
    finish: "cedar",
    tags: ["studio", "courtyard", "daylight"],
    summary: "A compact detached layout with a private entry court and high daylight clerestory windows.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/canyon-courtyard.png",
  },
  {
    id: "garage-laneway",
    title: "Garage Conversion with Garden Entry",
    style: "California Bungalow",
    sqft: 520,
    width: 20,
    length: 26,
    roof: "flat",
    finish: "board",
    tags: ["garage", "conversion", "compact"],
    summary: "A reuse-first concept for homeowners prioritizing speed, budget control, and rental utility.",
    budgetBand: "Under $250k",
    imagePath: "/inspiration/garage-laneway.png",
  },
  {
    id: "bay-window",
    title: "One-Bedroom with Bay-Facing Lounge",
    style: "Urban Craftsman",
    sqft: 780,
    width: 24,
    length: 32.5,
    roof: "gable",
    finish: "lap",
    tags: ["one bedroom", "premium", "work nook"],
    summary: "A larger rental-ready layout with a defined living room, bay windows, and a small work alcove.",
    budgetBand: "Over $400k",
    imagePath: "/inspiration/bay-window.png",
  },
  {
    id: "coastal-adu",
    title: "Coastal Long-Lot ADU",
    style: "Coastal Minimal",
    sqft: 700,
    width: 16,
    length: 44,
    roof: "flat",
    finish: "stucco",
    tags: ["detached", "long lot", "beach style"],
    summary: "A narrow footprint designed to preserve outdoor living space on tighter seaside lots.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/coastal-adu.png",
  },
  {
    id: "valley-jadu",
    title: "JADU Suite inside Existing Home",
    style: "Simple Contemporary",
    sqft: 400,
    width: 20,
    length: 20,
    roof: "flat",
    finish: "board",
    tags: ["jadu", "conversion", "existing space"],
    summary: "A modest suite conversion for family flexibility with a lower construction footprint.",
    budgetBand: "Under $250k",
    imagePath: "/inspiration/valley-jadu.png",
  },
  {
    id: "clean-gable",
    title: "Permit-Ready Inspired Cottage",
    style: "Clean Gable",
    sqft: 600,
    width: 20,
    length: 30,
    roof: "gable",
    finish: "lap",
    tags: ["one bedroom", "cottage", "gable"],
    summary: "A straightforward detached concept intended to align with permit-ready plan thinking.",
    budgetBand: "$250k - $400k",
    imagePath: "/inspiration/clean-gable.png",
  },
];

