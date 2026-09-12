import { LEAD_UNLOCK_PRICE_CENTS } from "./lead-unlock-pricing";
import type { BuilderInboxItem, BuilderLedgerEntry } from "./marketplace-types";

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
  /** Month spend — summed from the builder's unlock/purchase ledger when available, or estimated as unlocked leads × $49 fallback. */
  spend: number;
}

/**
 * Derive the builder dashboard's money-band and tab-count figures from the
 * inbox and optional financial ledger. Pipeline value leads with NEW leads only (2A):
 * it is the build value still in play, not money already won.
 *
 * When ledger entries are provided, spend is computed by summing the actual amounts paid
 * recorded on the ledger (purchases, unlocks, and refunds). Credit-funded unlocks record $0
 * on the unlock event because the spend occurred when the credit pack was purchased.
 *
 * If no ledger is provided, spend falls back to estimating unlockedCount × $49.
 */
export function computeBuilderMetrics(
  items: BuilderInboxItem[],
  ledger?: BuilderLedgerEntry[],
): BuilderMetrics {
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

  let spend: number;
  if (ledger !== undefined) {
    const ledgerSum = ledger.reduce((sum, entry) => {
      const amt = typeof entry.amountPaid === "number" ? entry.amountPaid : 0;
      return entry.type === "refund" && amt > 0 ? sum - amt : sum + amt;
    }, 0);
    if (ledger.length > 0) {
      spend = Math.max(0, ledgerSum);
    } else if (unlockedCount > 0) {
      spend = unlockedCount * UNLOCK_PRICE;
    } else {
      spend = 0;
    }
  } else {
    spend = unlockedCount * UNLOCK_PRICE;
  }

  return {
    total: items.length,
    newLeadCount,
    interestedCount,
    archivedCount,
    unlockedCount,
    pipelineValue: Math.round(pipelineValue),
    spend: Math.round(spend * 100) / 100,
  };
}
