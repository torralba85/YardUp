import type { ConnectionSnapshot, AdvisorIntake } from "./marketplace-types";
import { parcelConfidence } from "./parcel-confidence";
import { bedroomClassForFootprint } from "./market/bedroom";
import { isValidLiveParcelData, migrateSavedScenario } from "./saved-scenarios";
import type { LiveParcelData } from "./parcel-types";
import { getDefaultAduPose } from "./scene-placement";
import { getParcelById } from "./feasibility";

/** Only included in the homeowner-consented, gated contact payload. */
export function buildAdvisorIntake(snapshot: ConnectionSnapshot): AdvisorIntake {
  const { parcel, config, result } = snapshot;
  const live = parcel as Partial<LiveParcelData>;
  return {
    lotSqft: parcel.lotArea,
    existingFootprintSqft: parcelConfidence(parcel).footprintKnown ? parcel.existingHouseSqft : null,
    zoning: live.zoning || null,
    fireHazard: live.fireHazard?.zone ?? "unknown",
    slope: "Not measured",
    dimensions: `${config.width} × ${config.length} ft; ${config.height} ft walls`,
    roof: config.roof,
    bedroomClass: bedroomClassForFootprint(config.footprint),
    buildBandLow: Math.floor(result.costLow / 25000) * 25000,
    buildBandHigh: Math.ceil(result.costHigh / 25000) * 25000,
  };
}

/** JSON keeps nested GIS arrays out of Firestore's array representation. */
export function buildIntakeScenarioJson(snapshot: ConnectionSnapshot): string | undefined {
  const live = isValidLiveParcelData(snapshot.parcel) ? snapshot.parcel : undefined;
  if (!live && ("source" in snapshot.parcel || getParcelById(snapshot.parcelKey).address !== snapshot.parcel.address)) return undefined;
  const candidate = {
    id: "builder-intake", name: "Shared builder concept", createdAt: new Date().toISOString(),
    version: 2, heightConvention: "wall", parcelId: snapshot.parcelKey,
    ...(live ? { liveParcel: live } : {}),
    config: snapshot.config, assumptions: snapshot.assumptions,
    pose: snapshot.result.placementPose ?? getDefaultAduPose(snapshot.parcel, snapshot.config),
  };
  const normalized = migrateSavedScenario(candidate);
  if (!normalized) return undefined;
  const json = JSON.stringify(normalized);
  // Leave room for the report and other fields within the Firestore document.
  return new TextEncoder().encode(json).length <= 400_000 ? json : undefined;
}
