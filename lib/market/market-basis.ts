import type { BedroomClass, MarketProvenance, MarketSource } from "./market-types";

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
      return area ? `HUD FMR · ${area} · ${bed}` : `HUD FMR · ${bed}`;
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
    market.source === "live" ? `Live comps · ${market.area}` : `HUD FMR · ${market.area}`,
  ];
  if (market.asOf) parts.push(market.asOf);
  if (market.comparableCount) parts.push(`${market.comparableCount} comps`);
  parts.push(CONFIDENCE_LABEL[market.confidence]);
  return parts.join(" · ");
}
