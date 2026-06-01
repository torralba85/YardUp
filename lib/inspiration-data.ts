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
  imageUrl: string;
  tags: string[];
  summary: string;
  budgetBand: string;
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
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    tags: ["studio", "courtyard", "daylight"],
    summary: "A compact detached layout with a private entry court and high daylight clerestory windows.",
    budgetBand: "$250k - $400k",
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
    imageUrl: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=80",
    tags: ["garage", "conversion", "compact"],
    summary: "A reuse-first concept for homeowners prioritizing speed, budget control, and rental utility.",
    budgetBand: "Under $250k",
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
    imageUrl: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    tags: ["one bedroom", "premium", "work nook"],
    summary: "A larger rental-ready layout with a defined living room, bay windows, and a small work alcove.",
    budgetBand: "Over $400k",
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
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    tags: ["detached", "long lot", "beach style"],
    summary: "A narrow footprint designed to preserve outdoor living space on tighter seaside lots.",
    budgetBand: "$250k - $400k",
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
    imageUrl: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80",
    tags: ["jadu", "conversion", "existing space"],
    summary: "A modest suite conversion for family flexibility with a lower construction footprint.",
    budgetBand: "Under $250k",
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
    imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
    tags: ["one bedroom", "cottage", "gable"],
    summary: "A straightforward detached concept intended to align with permit-ready plan thinking.",
    budgetBand: "$250k - $400k",
  },
];
