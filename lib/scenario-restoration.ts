import { calculateFeasibility, getParcelById, type ADUConfig, type FinancialAssumptions, type Parcel, type RentScenario } from "./feasibility";
import { defaultPose } from "./scenario-design";
import { buildAduHeightModel, type Pose2D } from "./scene-model";
import { getScenePlacement } from "./site-fit";
import { createAIProjectBriefKey } from "./ai-project-brief";
import type { AIProjectBriefResponse } from "./ai-types";
import type { SavedScenario } from "./saved-scenarios";
import type { InspirationItem } from "./inspiration-data";

export interface ProjectBriefState {
  key: string;
  data: AIProjectBriefResponse | null;
  loading: boolean;
  error: string | null;
  /** Save time of a historical snapshot, not its AI generation time. */
  savedAt?: string;
}

/** The same Feasibility and placement findings used for current and restored studies. */
export function calculateScenarioFeasibility(
  parcel: Parcel & { expectedRent?: Record<RentScenario, number> }, config: ADUConfig, assumptions: FinancialAssumptions, pose: Pose2D,
) {
  // Demo presets resolve their own bedroom-specific market data; retain live-parcel overrides.
  const base = calculateFeasibility(parcel, config, assumptions, "source" in parcel ? parcel.expectedRent : undefined);
  const placement = getScenePlacement(parcel, config, pose);
  const totalHeight = buildAduHeightModel(config)?.totalHeight;
  return {
    ...base, placement, placementPose: pose,
    heightReviewRequired: base.heightReviewRequired || Boolean(totalHeight && totalHeight > 16),
    warnings: [
      ...base.warnings,
      ...(placement.status !== "fits" ? placement.reasons.map((reason) => reason.message) : []),
      ...(totalHeight && totalHeight > 16 && config.height <= 16
        ? [`Modeled total roof height is ${totalHeight.toFixed(1)} ft; verify the local height limit.`]
        : []),
    ],
  };
}

/** Replace a study with one Scenario's saved snapshot; absent optional content is cleared. */
export function restoreScenario(scenario: SavedScenario) {
  const preset = getParcelById(scenario.parcelId);
  const parcel = scenario.liveParcel ?? preset;
  const pose = scenario.pose ?? defaultPose(parcel, scenario.config);
  const result = calculateScenarioFeasibility(parcel, scenario.config, scenario.assumptions, pose);
  const briefState: ProjectBriefState | null = scenario.projectBrief ? {
    key: createAIProjectBriefKey({ parcel, config: scenario.config, result }),
    data: { tier: "full", brief: scenario.projectBrief },
    loading: false, error: null, savedAt: scenario.createdAt,
  } : null;
  const match = scenario.styleMatchConcept;
  const concept: InspirationItem | null = match ? {
    id: `style-match-${scenario.id}`,
    title: `Matched ${match.styleName} Concept`, style: match.styleName,
    sqft: scenario.config.footprint, width: scenario.config.width, length: scenario.config.length,
    roof: scenario.config.roof, finish: scenario.config.finish,
    tags: ["style-matched", match.styleName.toLowerCase()],
    summary: `A custom ADU concept style-matched to your home (${match.matchPercentage}% match).`,
    budgetBand: "$250k - $400k", imagePath: match.conceptUrl,
    isStyleMatched: true, photoUrl: match.photoUrl,
    matchPercentage: match.matchPercentage, traits: match.traits, isAttached: false,
  } : null;
  return {
    preset, liveParcel: scenario.liveParcel ?? null,
    parcelId: scenario.parcelId, config: scenario.config, assumptions: scenario.assumptions,
    pose, poseKey: scenario.liveParcel ? `${parcel.address}|${parcel.city}` : scenario.parcelId,
    briefState, concept,
  };
}
