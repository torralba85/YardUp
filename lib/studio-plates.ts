// lib/studio-plates.ts
import type { VerdictLevel } from "@/lib/feasibility-verdict";

/** The four plates of the studio "field book", in survey order. */
export type StudioPlate = "lot" | "build" | "return" | "record";

export interface PlateMeta {
  id: StudioPlate;
  numeral: "I" | "II" | "III" | "IV";
  /** Plate name, e.g. "The Lot". */
  title: string;
  /** One-line job, e.g. "what you own". */
  job: string;
  /** Build is reachable but never required for a verdict. */
  optional?: boolean;
}

export const PLATES: PlateMeta[] = [
  { id: "lot", numeral: "I", title: "The Lot", job: "what you own" },
  { id: "build", numeral: "II", title: "The Build", job: "what could stand here", optional: true },
  { id: "return", numeral: "III", title: "The Return", job: "what it earns" },
  { id: "record", numeral: "IV", title: "The Record", job: "make it real" },
];

/** Status glyph state for a plate's index entry. */
export type PlateTick = "eligible" | "review" | "unlikely" | "pending" | "ready";

export function verdictTick(verdict: VerdictLevel): PlateTick {
  if (verdict === "Likely Feasible") return "eligible";
  if (verdict === "Unlikely") return "unlikely";
  return "review";
}

/**
 * Per-plate status. The Lot and The Return reflect the feasibility verdict
 * (eligibility vs. money, same underlying signal). The Build is optional —
 * "pending" until the user shapes a building. The Record is "ready" once a
 * report can be recorded, else "pending".
 */
export function derivePlateStatuses(input: {
  verdict: VerdictLevel;
  hasBuild: boolean;
  reportReady: boolean;
}): Record<StudioPlate, PlateTick> {
  const tick = verdictTick(input.verdict);
  return {
    lot: tick,
    build: input.hasBuild ? "eligible" : "pending",
    return: tick,
    record: input.reportReady ? "ready" : "pending",
  };
}
