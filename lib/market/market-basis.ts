import type { BedroomClass, MarketProvenance, MarketSource } from "./market-types";

/**
 * Plain words for the federal benchmark. "HUD FMR" read as jargon to
 * homeowners (2026-11-27 audit); the source stays named, the acronym goes.
 */
const HUD_LABEL = "HUD fair market rent";

/**
 * "HUD FY2027 FMR (effective 2026-10-01)" → "fiscal 2027 figures, effective
 * 2026-10-01". Any other vintage string passes through unchanged.
 */
function plainVintage(asOf: string): string {
  const match = asOf.match(/^HUD FY(\d{4}) FMR(?: \(effective (\d{4}-\d{2}-\d{2})\))?(.*)$/);
  if (!match) return asOf;
  const [, year, effective, rest] = match;
  return `fiscal ${year} figures${effective ? `, effective ${effective}` : ""}${rest}`;
}

const BEDROOM_LABEL: Record<BedroomClass, string> = {
  studio: "studio",
  "1br": "1-bed",
  "2br": "2-bed",
};

/**
 * One-line citation for a rent figure, shown wherever rent appears (studio
 * metrics, income lens, builder lead card). Built from the resolved source.
 */
export function marketBasisLabel(input: {
  source: MarketSource;
  area?: string;
  bedroom: BedroomClass;
}): string {
  const bed = BEDROOM_LABEL[input.bedroom];
  const area = input.area?.trim();
  switch (input.source) {
    case "live":
      return area ? `Live comps · ${area} · ${bed}` : `Live comps · ${bed}`;
    case "hud-zip":
    case "hud-county":
    case "state":
    case "national":
      return area ? `${HUD_LABEL} · ${area} · ${bed}` : `${HUD_LABEL} · ${bed}`;
    case "preset":
      return "Curated demo estimate";
    case "heuristic":
    default:
      return "Rough lot-size estimate";
  }
}

const CONFIDENCE_LABEL: Record<MarketProvenance["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

/**
 * Full provenance citation for the financial figures — source + area, data
 * vintage, and confidence — shown beside metrics and recorded into exports.
 */
export function marketProvenanceLine(market: MarketProvenance): string {
  if (market.source === "preset") {
    return "Curated demo estimate · Not a market source";
  }
  if (market.source === "heuristic") {
    return "Rough lot-size estimate · Not a market source";
  }
  const parts = [
    market.source === "live" ? `Live comps · ${market.area}` : `${HUD_LABEL} · ${market.area}`,
  ];
  if (market.asOf) parts.push(plainVintage(market.asOf));
  if (market.comparableCount) parts.push(`${market.comparableCount} comps`);
  parts.push(CONFIDENCE_LABEL[market.confidence]);
  if (
    market.components &&
    (market.components.constructionCost.status !== "observed" ||
      market.components.operatingExpenses.status !== "observed")
  ) {
    parts.push("Costs and expenses are planning assumptions");
  }
  return parts.join(" · ");
}
