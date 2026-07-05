/**
 * Representative earning potential for the landing page. There is no entered
 * address on the landing, so these are *typical supported-market* midpoints
 * (not parcel-specific or guaranteed figures) — every surface that shows them
 * carries a "typical · supported markets" eyebrow to keep the estimate-honesty
 * contract. Single source of truth so the numbers can be tuned in one place.
 */
export const TYPICAL_MARKET = {
  rentBand: "$2,100–$2,600",
  noi: "$22,400",
  paybackYears: "12",
  buildBand: "$230K–$290K",
} as const;
