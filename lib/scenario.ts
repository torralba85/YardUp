import type { AIProjectBrief, AIProjectBriefResponse } from "./ai-types";
import { createAIProjectBriefKey } from "./ai-project-brief";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
  type ADUConfig,
  type FinancialAssumptions,
  type Parcel,
  type RentScenario,
} from "./feasibility";
import type { InspirationItem } from "./inspiration-data";
import {
  configForPlan,
  findPreapprovedPlan,
  modelMatchesPlan,
  normalizePlanReference,
  planOutline,
  type PreapprovedPlan,
  type PreapprovedPlanReference,
} from "./preapproved-plans";
import { normalizeLiveParcel, type SavedScenario } from "./saved-scenarios";
import {
  describePlacement,
  getDefaultAduPose,
  getScenePlacement,
  getSnapToFitPose,
  type PlacementEvidenceStatus,
} from "./scene-placement";
import { buildAduHeightModel, type Pose2D } from "./scene-model";

export const SCENARIO_VERSION = 2 as const;
/** Legacy config.height is wall height in feet, not total roof height. */
export const HEIGHT_CONVENTION = "wall" as const;

export interface CommittedDesign {
  version: typeof SCENARIO_VERSION;
  heightConvention: typeof HEIGHT_CONVENTION;
  config: ADUConfig;
  pose: Pose2D;
}

export interface ProjectBriefState {
  key: string;
  data: AIProjectBriefResponse | null;
  loading: boolean;
  error: string | null;
  /** Save time of a historical snapshot, not its AI generation time. */
  savedAt?: string;
}

export interface PlanSizingSnapshot {
  previous: ADUConfig;
  previousPose: Pose2D;
  applied: ADUConfig;
  appliedPose: Pose2D;
}

export interface PlanPlacementNote {
  outcome: "moved" | "none";
  pose: Pose2D;
  config: ADUConfig;
}

export interface StudioScenarioState {
  sceneKey: string;
  parcelId: string;
  config: ADUConfig;
  pose: Pose2D;
  assumptions: FinancialAssumptions;
  preapprovedPlan: PreapprovedPlanReference | null;
  planSizing: PlanSizingSnapshot | null;
  planPlacement: PlanPlacementNote | null;
}

export type ScenarioAction =
  | {
      type: "hydrate";
      sceneKey: string;
      parcelId: string;
      config: ADUConfig;
      pose: Pose2D;
      assumptions: FinancialAssumptions;
      preapprovedPlan: PreapprovedPlanReference | null;
    }
  | { type: "sync-lot"; sceneKey: string; parcel: Parcel }
  | { type: "select-preset"; parcel: Parcel & { id: string } }
  | { type: "set-config"; config: ADUConfig }
  | { type: "commit-pose"; pose: Pose2D }
  | { type: "set-assumptions"; assumptions: FinancialAssumptions }
  | { type: "select-plan"; reference: PreapprovedPlanReference; parcel: Parcel }
  | { type: "size-to-plan"; parcel: Parcel }
  | { type: "snap-plan-to-fit"; parcel: Parcel }
  | { type: "undo-plan-size" }
  | { type: "remove-plan" }
  | { type: "restore"; restored: ReturnType<typeof restoreScenario> }
  | { type: "reset" };

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const finiteRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

export function isValidAduConfig(value: unknown): value is ADUConfig {
  if (!isRecord(value)) return false;
  return (
    finiteRange(value.width, 1, 80) &&
    finiteRange(value.length, 1, 80) &&
    finiteRange(value.footprint, 1, 2000) &&
    Math.abs(value.width * value.length - value.footprint) <= 0.000001 &&
    finiteRange(value.height, 1, 30) &&
    ["shed", "gable", "flat"].includes(value.roof as string) &&
    ["cedar", "lap", "stucco", "board"].includes(value.finish as string) &&
    typeof value.includeOpenings === "boolean"
  );
}

export function isValidFinancialAssumptions(value: unknown): value is FinancialAssumptions {
  if (!isRecord(value) || !isRecord(value.costPerSqft)) return false;
  const costs = value.costPerSqft;
  return (
    ["cedar", "lap", "stucco", "board"].every((key) => finiteRange(costs[key], 100, 1000)) &&
    finiteRange(value.softCostMultiplier, 1, 3) &&
    finiteRange(value.operatingExpenseRatio, 0, 1) &&
    ["conservative", "market", "optimistic"].includes(value.rentScenario as string)
  );
}

export function isValidPose(value: unknown): value is Pose2D {
  return (
    isRecord(value) &&
    finiteRange(value.x, -10000, 10000) &&
    finiteRange(value.z, -10000, 10000) &&
    finiteRange(value.rotationDeg, -360, 360)
  );
}

/**
 * Re-exported so scenario hydration and the scene cannot drift apart on where a
 * new ADU starts. Both used to carry their own identical copy of the formula.
 */
export const defaultPose = getDefaultAduPose;

/** Only legacy area labels are repaired; dimensions are never invented for storage records. */
export function migrateDesign(value: unknown, parcel?: Parcel): CommittedDesign | null {
  if (!isRecord(value) || !isRecord(value.config)) return null;
  const legacy = value.version === undefined || value.version === 1;
  if (!legacy && value.version !== SCENARIO_VERSION) return null;
  const raw = value.config;
  const config = legacy
    ? {
        ...raw,
        footprint:
          typeof raw.width === "number" && typeof raw.length === "number"
            ? raw.width * raw.length
            : raw.footprint,
        roof: raw.roof ?? raw.roofStyle,
        finish: raw.finish ?? raw.exteriorFinish,
      }
    : raw;
  if (!isValidAduConfig(config)) return null;
  if (!legacy && value.heightConvention !== HEIGHT_CONVENTION) return null;
  const pose =
    legacy && value.pose === undefined
      ? defaultPose(parcel ?? getParcelById(typeof value.parcelId === "string" ? value.parcelId : ""), config)
      : value.pose;
  if (!isValidPose(pose)) return null;
  // Pick only supported fields: caller-supplied metadata cannot leak into public links.
  return {
    version: SCENARIO_VERSION,
    heightConvention: HEIGHT_CONVENTION,
    config: {
      width: config.width,
      length: config.length,
      footprint: config.footprint,
      height: config.height,
      roof: config.roof,
      finish: config.finish,
      includeOpenings: config.includeOpenings,
    },
    pose: { x: pose.x, z: pose.z, rotationDeg: ((pose.rotationDeg % 360) + 360) % 360 },
  };
}

// Links, email addresses and bare domains (two-plus characters, a dot, then letters).
const LINK_LIKE = /:\/\/|www\.|@|\b[a-z0-9-]{2,}\.[a-z]{2,24}\b/i;
// Control characters (including line breaks) and angle brackets.
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f<>]/;

/**
 * Text from the client that is printed into an outbound email, such as the
 * parcel address, must read like a place name: short, one line, and with no
 * links or addresses that would let the email carry someone else's message.
 */
export function isPlainPlaceText(value: string, maxLength: number): boolean {
  const text = value.trim();
  return (
    text.length > 0 &&
    text.length <= maxLength &&
    !UNSAFE_CHARACTERS.test(text) &&
    !LINK_LIKE.test(text)
  );
}

/** Keep only design data; never carry a paid brief, purchase intent, or user profile. */
export function parseEmailScenario(value: unknown): SavedScenario | null {
  if (
    !isRecord(value) ||
    !isValidAduConfig(value.config) ||
    !isValidFinancialAssumptions(value.assumptions) ||
    !isValidPose(value.pose)
  ) {
    return null;
  }
  if (typeof value.parcelId !== "string" || !parcelPresets.some((p) => p.id === value.parcelId)) {
    return null;
  }
  const preapprovedPlan = normalizePlanReference(value.preapprovedPlan);
  const liveParcel = value.liveParcel === undefined ? undefined : normalizeLiveParcel(value.liveParcel);
  if (liveParcel === null) return null;
  return {
    version: 2,
    heightConvention: "wall",
    id: "emailed-layout",
    name: "Emailed lot layout",
    createdAt: new Date().toISOString(),
    parcelId: value.parcelId,
    config: {
      width: value.config.width,
      length: value.config.length,
      height: value.config.height,
      footprint: value.config.footprint,
      roof: value.config.roof,
      finish: value.config.finish,
      includeOpenings: value.config.includeOpenings,
    },
    assumptions: {
      costPerSqft: {
        cedar: value.assumptions.costPerSqft.cedar,
        lap: value.assumptions.costPerSqft.lap,
        stucco: value.assumptions.costPerSqft.stucco,
        board: value.assumptions.costPerSqft.board,
      },
      softCostMultiplier: value.assumptions.softCostMultiplier,
      operatingExpenseRatio: value.assumptions.operatingExpenseRatio,
      rentScenario: value.assumptions.rentScenario,
    },
    pose: { x: value.pose.x, z: value.pose.z, rotationDeg: value.pose.rotationDeg },
    ...(liveParcel ? { liveParcel } : {}),
    ...(preapprovedPlan ? { preapprovedPlan } : {}),
  };
}

/** The same Feasibility and placement findings used for current and restored studies. */
export function calculateScenarioFeasibility(
  parcel: Parcel & { expectedRent?: Record<RentScenario, number> },
  config: ADUConfig,
  assumptions: FinancialAssumptions,
  pose: Pose2D,
) {
  // Demo presets resolve their own bedroom-specific market data; retain live-parcel overrides.
  const base = calculateFeasibility(parcel, config, assumptions, "source" in parcel ? parcel.expectedRent : undefined);
  const placement = getScenePlacement(parcel, config, pose);
  const totalHeight = buildAduHeightModel(config)?.totalHeight;
  return {
    ...base,
    placement,
    placementPose: pose,
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
  const briefState: ProjectBriefState | null = scenario.projectBrief
    ? {
        key: createAIProjectBriefKey({ parcel, config: scenario.config, result }),
        data: { tier: "full", brief: scenario.projectBrief as AIProjectBrief },
        loading: false,
        error: null,
        savedAt: scenario.createdAt,
      }
    : null;
  const match = scenario.styleMatchConcept;
  const concept: InspirationItem | null = match
    ? {
        id: `style-match-${scenario.id}`,
        title: `Matched ${match.styleName} Concept`,
        style: match.styleName,
        sqft: scenario.config.footprint,
        width: scenario.config.width,
        length: scenario.config.length,
        roof: scenario.config.roof,
        finish: scenario.config.finish,
        tags: ["style-matched", match.styleName.toLowerCase()],
        summary: `A custom ADU concept style-matched to your home (${match.matchPercentage}% match).`,
        budgetBand: "$250k - $400k",
        imagePath: match.conceptUrl,
        isStyleMatched: true,
        photoUrl: match.photoUrl,
        matchPercentage: match.matchPercentage,
        traits: match.traits,
        isAttached: false,
      }
    : null;
  return {
    preset,
    liveParcel: scenario.liveParcel ?? null,
    parcelId: scenario.parcelId,
    config: scenario.config,
    assumptions: scenario.assumptions,
    pose,
    poseKey: scenario.liveParcel ? `${parcel.address}|${parcel.city}` : scenario.parcelId,
    briefState,
    concept,
    preapprovedPlan: scenario.preapprovedPlan ?? null,
  };
}

const samePose = (a: Pose2D, b: Pose2D) =>
  a.x === b.x && a.z === b.z && a.rotationDeg === b.rotationDeg;

const sameSize = (a: ADUConfig, b: ADUConfig) =>
  a.width === b.width && a.length === b.length;

function placeForPlan(parcel: Parcel, plan: PreapprovedPlan, next: ADUConfig, from: Pose2D) {
  const outline = plan.footprint?.shape === "irregular" ? planOutline(plan, next) : undefined;
  for (const candidate of outline ? [outline, next] : [next]) {
    if (getScenePlacement(parcel, candidate, from).status === "fits") {
      return { pose: from, outcome: "kept" as const };
    }
    const snapped = getSnapToFitPose(parcel, candidate, from);
    if (snapped) return { pose: snapped, outcome: "moved" as const };
  }
  const status = getScenePlacement(parcel, next, from).status;
  return {
    pose: from,
    outcome: status === "blocked" || status === "invalid" ? ("none" as const) : ("kept" as const),
  };
}

/** Result of sizing the Scenario model to a Pre-approved Plan on the active lot. */
export function evaluatePlanSizing(
  parcel: Parcel,
  state: StudioScenarioState,
  reference: PreapprovedPlanReference,
): { nextState: StudioScenarioState; placementOutcome: "kept" | "moved" | "none" | "unknown" } {
  const plan = findPreapprovedPlan(reference);
  if (!plan) {
    return {
      nextState: { ...state, preapprovedPlan: reference },
      placementOutcome: "unknown",
    };
  }
  const applied = configForPlan(plan, state.config);
  const placed = placeForPlan(parcel, plan, applied, state.pose);
  if (sameSize(applied, state.config) && placed.outcome === "kept") {
    return {
      nextState: { ...state, preapprovedPlan: reference },
      placementOutcome: placed.outcome,
    };
  }
  const nextPose = !samePose(placed.pose, state.pose) && isValidPose(placed.pose) ? placed.pose : state.pose;
  return {
    nextState: {
      ...state,
      preapprovedPlan: reference,
      config: applied,
      pose: nextPose,
      planSizing: {
        previous: state.config,
        previousPose: state.pose,
        applied,
        appliedPose: placed.pose,
      },
      planPlacement:
        placed.outcome === "kept"
          ? null
          : { outcome: placed.outcome, pose: placed.pose, config: applied },
    },
    placementOutcome: placed.outcome,
  };
}

export function createScenarioState(): StudioScenarioState {
  const initialParcel = parcelPresets[0];
  return {
    sceneKey: initialParcel.id,
    parcelId: initialParcel.id,
    config: defaultAduConfig,
    pose: defaultPose(initialParcel, defaultAduConfig),
    assumptions: defaultFinancialAssumptions,
    preapprovedPlan: null,
    planSizing: null,
    planPlacement: null,
  };
}

export function scenarioReducer(
  state: StudioScenarioState,
  action: ScenarioAction,
): StudioScenarioState {
  switch (action.type) {
    case "hydrate":
      return {
        sceneKey: action.sceneKey,
        parcelId: action.parcelId,
        config: action.config,
        pose: action.pose,
        assumptions: action.assumptions,
        preapprovedPlan: action.preapprovedPlan,
        planSizing: null,
        planPlacement: null,
      };
    case "sync-lot":
      if (state.sceneKey === action.sceneKey) return state;
      return {
        ...state,
        sceneKey: action.sceneKey,
        pose: defaultPose(action.parcel, state.config),
        preapprovedPlan: null,
        planSizing: null,
        planPlacement: null,
      };
    case "select-preset":
      return {
        ...state,
        sceneKey: action.parcel.id,
        parcelId: action.parcel.id,
        pose: defaultPose(action.parcel, state.config),
        preapprovedPlan: null,
        planSizing: null,
        planPlacement: null,
      };
    case "set-config":
      return { ...state, config: action.config };
    case "commit-pose":
      return isValidPose(action.pose) ? { ...state, pose: action.pose } : state;
    case "set-assumptions":
      return { ...state, assumptions: action.assumptions };
    case "select-plan":
      return evaluatePlanSizing(action.parcel, state, action.reference).nextState;
    case "size-to-plan":
      if (!state.preapprovedPlan) return state;
      return evaluatePlanSizing(action.parcel, state, state.preapprovedPlan).nextState;
    case "snap-plan-to-fit": {
      if (!state.preapprovedPlan) return state;
      const plan = findPreapprovedPlan(state.preapprovedPlan);
      if (!plan) return state;
      const placed = placeForPlan(action.parcel, plan, state.config, state.pose);
      const nextPose = !samePose(placed.pose, state.pose) && isValidPose(placed.pose) ? placed.pose : state.pose;
      return {
        ...state,
        pose: nextPose,
        planPlacement:
          placed.outcome === "kept"
            ? null
            : { outcome: placed.outcome, pose: placed.pose, config: state.config },
      };
    }
    case "undo-plan-size": {
      if (!state.planSizing) return state;
      const { previous, previousPose } = state.planSizing;
      return {
        ...state,
        config: {
          ...state.config,
          width: previous.width,
          length: previous.length,
          footprint: previous.footprint,
        },
        pose: isValidPose(previousPose) ? previousPose : state.pose,
        planSizing: null,
        planPlacement: null,
      };
    }
    case "remove-plan":
      return { ...state, preapprovedPlan: null, planSizing: null, planPlacement: null };
    case "restore":
      return {
        sceneKey: action.restored.poseKey,
        parcelId: action.restored.parcelId,
        config: action.restored.config,
        pose: action.restored.pose,
        assumptions: action.restored.assumptions,
        preapprovedPlan: action.restored.preapprovedPlan,
        planSizing: null,
        planPlacement: null,
      };
    case "reset":
      return createScenarioState();
  }
}

/**
 * Pure read view scoped to the active lot so external lot switches never render
 * a prior lot's pose or pre-approved plan while the reducer catches up.
 */
export function resolveScenarioForLot(
  state: StudioScenarioState,
  sceneKey: string,
  parcel: Parcel,
): StudioScenarioState {
  if (state.sceneKey === sceneKey) return state;
  return {
    ...state,
    sceneKey,
    pose: defaultPose(parcel, state.config),
    preapprovedPlan: null,
    planSizing: null,
    planPlacement: null,
  };
}

/** Derived summary and undo/placement state for the active Pre-approved Plan. */
export function describePlanControls(
  state: StudioScenarioState,
  parcel: Parcel,
): {
  planInUse: PreapprovedPlan | undefined;
  planOutlineFit: PlacementEvidenceStatus | undefined;
  planSizeUndo: PlanSizingSnapshot | null;
  planPlacementNote: { tone: "info" | "review"; text: string } | undefined;
} {
  const planInUse = state.preapprovedPlan ? findPreapprovedPlan(state.preapprovedPlan) : undefined;
  let planOutlineFit: PlacementEvidenceStatus | undefined;
  if (planInUse && planInUse.footprint?.shape === "irregular" && modelMatchesPlan(planInUse, state.config)) {
    const outline = planOutline(planInUse, state.config);
    if (outline) {
      planOutlineFit = describePlacement(getScenePlacement(parcel, outline, state.pose), parcel);
    }
  }
  const planSizeUndo =
    state.planSizing &&
    state.preapprovedPlan &&
    sameSize(state.planSizing.applied, state.config) &&
    samePose(state.planSizing.appliedPose, state.pose)
      ? state.planSizing
      : null;
  const planPlacementNote =
    state.planPlacement &&
    state.preapprovedPlan &&
    sameSize(state.planPlacement.config, state.config) &&
    samePose(state.planPlacement.pose, state.pose)
      ? state.planPlacement.outcome === "moved"
        ? { tone: "info" as const, text: "Moved to a spot on this lot where it fits the modeled setbacks." }
        : {
            tone: "review" as const,
            text: "It doesn't fit within the modeled setbacks anywhere we searched on this lot. Before ruling it out, confirm your property lines and setbacks with your local planning office: a survey, a corrected boundary or a setback exception can change the answer.",
          }
      : undefined;
  return { planInUse, planOutlineFit, planSizeUndo, planPlacementNote };
}
