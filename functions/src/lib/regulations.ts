import { regulationGuides } from "../data/regulations";
import type { JurisdictionId, RegulationGuide } from "../types";

export function getSeededRegulationGuide(jurisdiction: JurisdictionId): RegulationGuide {
  return regulationGuides[jurisdiction];
}
