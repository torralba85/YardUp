import type { DesignStyle, DesignStyleId } from "../domain/types";

export const designStyles: DesignStyle[] = [
  {
    id: "warm_modern",
    label: "Warm Modern",
    description: "Natural wood, simple massing, warm daylight, and quiet indoor-outdoor flow.",
    promptCue: "warm modern California ADU, natural wood soffits, large shaded glass, soft neutral interiors",
    tags: ["daylight", "wood", "rental-ready"],
  },
  {
    id: "farmhouse",
    label: "Farmhouse",
    description: "Clean gables, board-and-batten texture, and familiar residential proportions.",
    promptCue: "modern farmhouse backyard cottage, clean gable roof, board and batten siding, bright compact plan",
    tags: ["gable", "family", "classic"],
  },
  {
    id: "industrial",
    label: "Industrial",
    description: "Durable cladding, crisp openings, compact footprint, and efficient service walls.",
    promptCue: "compact industrial ADU, metal accents, concrete path, efficient open-plan interior",
    tags: ["durable", "urban", "efficient"],
  },
  {
    id: "coastal_minimal",
    label: "Coastal Minimal",
    description: "Light exterior tones, shade control, narrow-lot fit, and breezy indoor-outdoor use.",
    promptCue: "coastal minimal ADU, pale siding, shaded sliders, narrow lot, relaxed San Diego backyard",
    tags: ["shade", "long lot", "light"],
  },
  {
    id: "california_bungalow",
    label: "California Bungalow",
    description: "Low rooflines, porch entry, garden threshold, and compatibility with older homes.",
    promptCue: "California bungalow ADU, compact porch, low roofline, garden entry, warm stucco and trim",
    tags: ["porch", "garden", "contextual"],
  },
  {
    id: "clean_gable",
    label: "Clean Gable",
    description: "Permit-ready simplicity with a legible roof form and straightforward construction.",
    promptCue: "clean gable ADU, permit-ready proportions, simple roof, compact one bedroom plan",
    tags: ["permit-ready", "simple", "one bedroom"],
  },
];

export const designStyleLabels: Record<DesignStyleId, string> = designStyles.reduce(
  (acc, style) => ({ ...acc, [style.id]: style.label }),
  {} as Record<DesignStyleId, string>,
);

export function getDesignStyle(styleId: DesignStyleId): DesignStyle {
  return designStyles.find((style) => style.id === styleId) ?? designStyles[0];
}
