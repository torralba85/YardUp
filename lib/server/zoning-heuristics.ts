import { estimatedZoningCoverage } from "@/lib/zoning-designation";

/** A planning estimate, never a verified local rule. Unknown codes return null. */
export function deriveMaxCoverage(zoning?: string): number | null {
  return estimatedZoningCoverage(zoning ?? "");
}
