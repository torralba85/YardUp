/**
 * Broad lot-coverage guess from a zoning code by substring match. It is a
 * placeholder, not a jurisdiction rule: `NR3` reads as R-3, `R-20` as R-2, and
 * every code it does not recognise (commercial, industrial, agricultural)
 * falls through to the 40% residential default. The parcel route labels the
 * result as derived, low-confidence evidence.
 */
export function deriveMaxCoverage(zoning?: string): number {
  if (!zoning) return 40;
  const z = zoning.toUpperCase();
  if (z.includes("R1") || z.includes("R-1")) return 40;
  if (z.includes("R2") || z.includes("R-2")) return 45;
  if (z.includes("R3") || z.includes("R-3")) return 50;
  if (z.includes("MF") || z.includes("RM")) return 55;
  return 40;
}
