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

export interface ScenarioState {
  parcelId: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
}

const validRoofs: RoofStyle[] = ["shed", "gable", "flat"];
const validFinishes: ExteriorFinish[] = ["cedar", "lap", "stucco", "board"];
const validRents: RentScenario[] = ["conservative", "market", "optimistic"];

const validParcelIds = new Set(parcelPresets.map((preset) => preset.id));
const validFootprints = new Set(footprintOptions.map((option) => option.value));

export const defaultScenarioState: ScenarioState = {
  parcelId: parcelPresets[0].id,
  config: defaultAduConfig,
  assumptions: defaultFinancialAssumptions,
};

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

export function mergeScenarioPartial(partial: Partial<ScenarioState>): ScenarioState {
  return {
    parcelId: partial.parcelId ?? defaultScenarioState.parcelId,
    config: partial.config ?? defaultScenarioState.config,
    assumptions: partial.assumptions ?? defaultScenarioState.assumptions,
  };
}
