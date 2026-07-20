import {
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  footprintOptions,
  parcelPresets,
  type ADUConfig,
  type ExteriorFinish,
  type FinancialAssumptions,
  type RentScenario,
  type RoofStyle,
} from "./feasibility";

/**
 * The minimal scenario state that can be encoded in, and restored from, the
 * studio URL's query string. This makes a configured study shareable via link.
 */
export interface ScenarioState {
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
  const params = new URLSearchParams();
  params.set("parcel", state.parcelId);
  params.set("size", String(state.config.footprint));
  params.set("roof", state.config.roof);
  params.set("finish", state.config.finish);
  params.set("rent", state.assumptions.rentScenario);
  params.set("openings", state.config.includeOpenings ? "1" : "0");
  return params.toString();
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
  return {
    parcelId: partial.parcelId ?? defaultScenarioState.parcelId,
    config: partial.config ?? { ...defaultScenarioState.config },
    assumptions: partial.assumptions ?? { ...defaultScenarioState.assumptions, costPerSqft: { ...defaultScenarioState.assumptions.costPerSqft } },
  };
}
