/**
 * Rent scenario multipliers applied to a HUD FMR anchor. Conservative is the
 * FMR itself; the Studio applies the same spreads to a live parcel's anchor.
 * Kept in its own module so the rent data (`content/adu/ca/rent.ts`) and the
 * market aggregate can both use it without importing each other.
 */
export const RENT_SCENARIO_SPREADS = {
  conservative: 1,
  market: 1.12,
  optimistic: 1.25,
} as const;
