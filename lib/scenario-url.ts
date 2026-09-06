import {
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  footprintOptions,
  getParcelById,
  parcelPresets,
  type ADUConfig,
  type ExteriorFinish,
  type FinancialAssumptions,
  type RentScenario,
  type RoofStyle,
} from "./feasibility";
import { defaultPose, HEIGHT_CONVENTION, isValidAduConfig, isValidFinancialAssumptions, isValidPose, SCENARIO_VERSION } from "./scenario-design";
import type { Pose2D } from "./scene-model";

/**
 * The minimal scenario state that can be encoded in, and restored from, the
 * studio URL's query string. This makes a configured study shareable via link.
 */
export interface ScenarioState {
  version?: 2;
  heightConvention?: "wall";
  pose?: Pose2D;
  /** Id of the selected parcel preset. */
  parcelId: string;
  /** The ADU design configuration. */
  config: ADUConfig;
  /** The financial assumptions (only `rentScenario` is round-tripped via URL). */
  assumptions: FinancialAssumptions;
}

const validRoofs: RoofStyle[] = ["shed", "gable", "flat"];
const validFinishes: ExteriorFinish[] = ["cedar", "lap", "stucco", "board"];
const validRents: RentScenario[] = ["conservative", "market", "optimistic"];

const validParcelIds = new Set(parcelPresets.map((preset) => preset.id));
const validFootprints = new Set(footprintOptions.map((option) => option.value));

/** The baseline scenario state used when no URL params are present. */
export const defaultScenarioState: ScenarioState = {
  version: SCENARIO_VERSION,
  heightConvention: HEIGHT_CONVENTION,
  pose: defaultPose(parcelPresets[0], defaultAduConfig),
  parcelId: parcelPresets[0].id,
  config: defaultAduConfig,
  assumptions: defaultFinancialAssumptions,
};

/**
 * Parse a URL query string into a partial scenario state, accepting only
 * values that pass validation against the known parcels, footprints, roofs,
 * finishes, and rent scenarios. Unknown or malformed params are ignored.
 *
 * @param searchParams - The query parameters to read (e.g. from `useSearchParams`).
 * @returns A partial state containing only the fields that were validly provided.
 */
export function parseScenarioParams(searchParams: URLSearchParams): Partial<ScenarioState> {
  const version = searchParams.get("v");
  if (version && version !== "1" && version !== "2") return {};
  if (version === "2") return parseCurrentParams(searchParams);
  const partial: Partial<ScenarioState> = {};

  const parcel = searchParams.get("parcel");
  if (parcel && validParcelIds.has(parcel)) {
    partial.parcelId = parcel;
  }

  const sizeParam = searchParams.get("size");
  const roofParam = searchParams.get("roof");
  const finishParam = searchParams.get("finish");
  const openingsParam = searchParams.get("openings");

  if (sizeParam || roofParam || finishParam || openingsParam) {
    let config = defaultAduConfig;

    if (sizeParam) {
      const size = Number(sizeParam);
      if (Number.isFinite(size) && validFootprints.has(size)) {
        config = configForFootprint(size, config);
      } else {
        config = configForFootprint(defaultAduConfig.footprint, config);
      }
    }

    if (roofParam && (validRoofs as string[]).includes(roofParam)) {
      config = { ...config, roof: roofParam as RoofStyle };
    }

    if (finishParam && (validFinishes as string[]).includes(finishParam)) {
      config = { ...config, finish: finishParam as ExteriorFinish };
    }

    if (openingsParam === "1" || openingsParam === "0") {
      config = { ...config, includeOpenings: openingsParam === "1" };
    }

    partial.config = config;
  }

  const rentParam = searchParams.get("rent");
  if (rentParam && (validRents as string[]).includes(rentParam)) {
    partial.assumptions = {
      ...defaultFinancialAssumptions,
      rentScenario: rentParam as RentScenario,
    };
  }

  return partial;
}

/**
 * Encode a scenario state into a URL query string for sharing or deep-linking.
 *
 * @param state - The complete scenario state to serialize.
 * @returns A query string (without leading `?`), e.g. `"parcel=oak-street&size=600&..."`.
 */
export function serializeScenarioParams(state: ScenarioState): string {
  if (!isValidAduConfig(state.config) || !isValidFinancialAssumptions(state.assumptions)) {
    throw new Error("Cannot share an invalid scenario.");
  }
  const parcelId = validParcelIds.has(state.parcelId) ? state.parcelId : parcelPresets[0].id;
  const pose = state.pose ?? defaultPose(getParcelById(parcelId), state.config);
  if (!isValidPose(pose)) throw new Error("Cannot share an invalid placement.");
  const params = new URLSearchParams();
  params.set("v", "2");
  params.set("hc", HEIGHT_CONVENTION);
  params.set("parcel", parcelId);
  params.set("w", String(state.config.width));
  params.set("l", String(state.config.length));
  params.set("h", String(state.config.height));
  params.set("x", String(pose.x));
  params.set("z", String(pose.z));
  params.set("rotation", String(pose.rotationDeg));
  params.set("size", String(state.config.footprint));
  params.set("roof", state.config.roof);
  params.set("finish", state.config.finish);
  params.set("rent", state.assumptions.rentScenario);
  params.set("openings", state.config.includeOpenings ? "1" : "0");
  for (const finish of validFinishes) params.set(`cost_${finish}`, String(state.assumptions.costPerSqft[finish]));
  params.set("soft", String(state.assumptions.softCostMultiplier));
  params.set("opex", String(state.assumptions.operatingExpenseRatio));
  return params.toString();
}

function parseCurrentParams(params: URLSearchParams): Partial<ScenarioState> {
  const number = (key: string) => {
    const value = params.get(key);
    return value !== null && value.trim() !== "" ? Number(value) : NaN;
  };
  const partial: Partial<ScenarioState> = {};
  const parcelId = params.get("parcel");
  if (parcelId && validParcelIds.has(parcelId)) partial.parcelId = parcelId;
  const config = {
    width: number("w"), length: number("l"), height: number("h"), footprint: number("size"),
    roof: params.get("roof"), finish: params.get("finish"),
    includeOpenings: params.get("openings") === "1" ? true : params.get("openings") === "0" ? false : null,
  };
  const pose = { x: number("x"), z: number("z"), rotationDeg: number("rotation") };
  // The design is atomic: an invalid pose cannot be applied to valid dimensions silently.
  if (params.get("hc") === HEIGHT_CONVENTION && isValidAduConfig(config) && isValidPose(pose)) {
    partial.version = SCENARIO_VERSION;
    partial.heightConvention = HEIGHT_CONVENTION;
    partial.config = config;
    partial.pose = pose;
  }
  const assumptions = {
    costPerSqft: Object.fromEntries(validFinishes.map((finish) => [finish, number(`cost_${finish}`)])),
    softCostMultiplier: number("soft"), operatingExpenseRatio: number("opex"), rentScenario: params.get("rent"),
  };
  if (isValidFinancialAssumptions(assumptions)) partial.assumptions = assumptions;
  return partial;
}

/**
 * Whether parsed URL params describe an explicitly chosen, non-default
 * scenario — a shared link or a restored mid-session URL — rather than a
 * first visit.
 *
 * Requires an explicit valid `parcel` param: the studio rewrites the URL with
 * default params as soon as any visitor lands, so param presence alone proves
 * nothing, and config-only marketing links (`?size=800`) never carried a lot
 * choice. A scenario identical to the defaults is treated as a first visit
 * because the two are indistinguishable in the URL.
 *
 * @param partial - Parsed params (typically from {@link parseScenarioParams}).
 * @returns True when the params encode a deliberate, non-default scenario.
 */
export function isNonDefaultScenario(partial: Partial<ScenarioState>): boolean {
  if (!partial.parcelId) return false;
  return (
    serializeScenarioParams(mergeScenarioPartial(partial)) !==
    serializeScenarioParams(defaultScenarioState)
  );
}

/**
 * Fill a partial scenario state with defaults to produce a complete state.
 *
 * Missing `config`/`assumptions` are deep-cloned from the defaults so callers
 * can safely mutate the result without affecting the shared default objects.
 *
 * @param partial - The partial state (typically from {@link parseScenarioParams}).
 * @returns A complete {@link ScenarioState}.
 */
export function mergeScenarioPartial(partial: Partial<ScenarioState>): ScenarioState {
  const parcelId = partial.parcelId ?? defaultScenarioState.parcelId;
  const config = partial.config ?? { ...defaultScenarioState.config };
  return {
    version: SCENARIO_VERSION,
    heightConvention: HEIGHT_CONVENTION,
    pose: partial.pose ? { ...partial.pose } : defaultPose(getParcelById(parcelId), config),
    parcelId,
    config,
    assumptions: partial.assumptions ?? { ...defaultScenarioState.assumptions, costPerSqft: { ...defaultScenarioState.assumptions.costPerSqft } },
  };
}
