import type { BedroomClass, MarketSource } from "./market-types";

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
