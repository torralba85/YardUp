import { LEAD_UNLOCK_PRICE_CENTS } from "./lead-unlock-pricing";
import type { BuilderInboxItem } from "./marketplace-types";

/** Flat unlock price in dollars, derived from the shared cents constant. */
const UNLOCK_PRICE = LEAD_UNLOCK_PRICE_CENTS / 100;

/** Aggregated figures shown on the builder dashboard (money band + tab counts). */
export interface BuilderMetrics {
  /** Total number of inbox leads. */
  total: number;
  /** Leads with status `new`. */
  newLeadCount: number;
  /** Leads marked `interested`. */
  interestedCount: number;
  /** Leads marked `not-a-fit` (archived). */
  archivedCount: number;
  /** Leads that have been unlocked (paid for). */
  unlockedCount: number;
  /** Sum of build-band midpoints across NEW leads — the money-band figure (2A). */
  pipelineValue: number;
  /** Estimated month spend — unlocked leads × unlock price. */
  spend: number;
}

/**
 * Derive the builder dashboard's money-band and tab-count figures from the
 * inbox. Pipeline value leads with NEW leads only (2A): it is the build value
 * still in play, not money already won.
 */
export function computeBuilderMetrics(items: BuilderInboxItem[]): BuilderMetrics {
  let newLeadCount = 0;
  let interestedCount = 0;
  let archivedCount = 0;
  let unlockedCount = 0;
  let pipelineValue = 0;

  for (const item of items) {
    const status = item.response.status;
    if (status === "new") {
      newLeadCount += 1;
      const { buildBandLow, buildBandHigh } = item.request.preview;
      pipelineValue += (buildBandLow + buildBandHigh) / 2;
    } else if (status === "interested") {
      interestedCount += 1;
    } else if (status === "not-a-fit") {
      archivedCount += 1;
    }
    if (item.unlocked) unlockedCount += 1;
  }

  return {
    total: items.length,
    newLeadCount,
    interestedCount,
    archivedCount,
    unlockedCount,
    pipelineValue: Math.round(pipelineValue),
    spend: unlockedCount * UNLOCK_PRICE,
  };
}
