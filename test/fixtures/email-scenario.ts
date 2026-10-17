import { defaultScenarioState } from "@/lib/scenario-url";
import { SAMPLE_LIVE_PARCEL } from "./live-parcel";
import type { SavedScenario } from "@/lib/saved-scenarios";

export const EMAIL_SCENARIO: SavedScenario = {
  ...defaultScenarioState,
  version: 2, heightConvention: "wall",
  id: "example", name: "My lot", createdAt: "2026-10-16T00:00:00Z",
  pose: { x: 7, z: -11, rotationDeg: 90 },
  liveParcel: { ...SAMPLE_LIVE_PARCEL, address: "123 Example Street", city: "San Diego", state: "CA" },
};
