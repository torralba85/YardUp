import { defaultAduConfig, defaultFinancialAssumptions } from "@/lib/feasibility";
import { defaultPose } from "@/lib/scenario-design";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { SAMPLE_LIVE_PARCEL } from "./live-parcel";

export const EMAIL_SCENARIO: SavedScenario = {
  version: 2,
  heightConvention: "wall",
  id: "email-scenario-1",
  name: "141 N Almaden Blvd",
  createdAt: "2026-09-25T00:00:00.000Z",
  parcelId: "oak-street",
  liveParcel: SAMPLE_LIVE_PARCEL,
  config: defaultAduConfig,
  assumptions: defaultFinancialAssumptions,
  pose: defaultPose(SAMPLE_LIVE_PARCEL, defaultAduConfig),
};
