import { regulationGuides } from "../data/regulations";
import { getDesignStyle } from "../data/designStyles";
import type {
  DesignConceptPreferences,
  DesignConcept,
  InspirationItem,
  JurisdictionId,
  Project,
  PropertyRecord,
  QuoteRequest,
  RegulationGuide,
} from "../domain/types";
import { callCloudFunction } from "./firebase";
import { ensureFirebaseSession } from "./session";

export async function getRegulationGuide(jurisdiction: JurisdictionId): Promise<RegulationGuide> {
  const remote = await callCloudFunction<{ jurisdiction: JurisdictionId }, RegulationGuide>("getRegulationGuide", {
    jurisdiction,
  }).catch(() => null);

  return remote ?? regulationGuides[jurisdiction];
}

export async function generateDesignConcept(
  project: Project,
  inspiration?: InspirationItem,
  preferences?: DesignConceptPreferences,
): Promise<DesignConcept> {
  const remote = await callCloudFunction<
    { project: Project; inspiration?: InspirationItem; preferences?: DesignConceptPreferences },
    Omit<DesignConcept, "id" | "projectId" | "createdAt">
  >("generateDesignConcept", { project, inspiration, preferences }).catch(() => null);

  const now = new Date().toISOString();
  const base = remote ?? makeLocalConcept(project, inspiration, preferences);

  return {
    id: `concept-${project.id}-${Date.now()}`,
    projectId: project.id,
    createdAt: now,
    ...base,
  };
}

export async function searchPropertyHistory(project: Project): Promise<PropertyRecord[]> {
  const remote = await callCloudFunction<{ address: string; projectId: string }, { records: PropertyRecord[] }>(
    "searchPropertyHistory",
    {
      address: project.address,
      projectId: project.id,
    },
  ).catch(() => null);

  if (remote?.records?.length) {
    return remote.records;
  }

  return [
    {
      id: `history-${project.id}-local-1`,
      projectId: project.id,
      source: "Offline starter record",
      recordType: "Source unavailable",
      date: new Date().toISOString(),
      summary:
        "Permit history search needs a network connection and source integration. Use this state to explain that no official records were retrieved yet.",
      citationUrl: "https://www.hcd.ca.gov/building-standards/adu/handbook",
    },
  ];
}

export async function submitQuoteRequest(
  projectId: string,
  contractorId: string,
  packetItems: string[],
): Promise<QuoteRequest | null> {
  const hasSession = await ensureFirebaseSession();
  if (!hasSession) {
    return null;
  }

  return callCloudFunction<{ projectId: string; contractorId: string; packetItems: string[] }, QuoteRequest>(
    "submitQuoteRequest",
    {
      projectId,
      contractorId,
      packetItems,
    },
  ).catch(() => null);
}

function makeLocalConcept(
  project: Project,
  inspiration?: InspirationItem,
  preferences?: DesignConceptPreferences,
): Omit<DesignConcept, "id" | "projectId" | "createdAt"> {
  const targetSqFt = preferences?.targetSqFt ?? inspiration?.sqft ?? project.lastEstimateInput?.aduSqFt ?? 650;
  const footprintType =
    preferences?.modelName ??
    (targetSqFt > 700 ? "one-bedroom bar plan" : targetSqFt > 450 ? "compact one-bedroom rectangle" : "compact studio rectangle");
  const style =
    preferences?.styleLabel ??
    (preferences?.styleId ? getDesignStyle(preferences.styleId).label : undefined) ??
    inspiration?.style ??
    "Warm modern";
  const reviewSignals =
    preferences?.fitSignals?.filter((signal) => signal.status !== "good").map((signal) => `${signal.label}: ${signal.detail}`) ?? [];
  const placementText = preferences?.placement
    ? `Place the ADU around ${Math.round(preferences.placement.xPercent)}% across and ${Math.round(
        preferences.placement.yPercent,
      )}% down the buildable backyard zone.`
    : "Place the ADU in the rear buildable zone while preserving access.";

  return {
    title: preferences?.modelName
      ? `${preferences.modelName} in ${style}`
      : inspiration
        ? `Adapt ${inspiration.title}`
        : `${project.name} concept`,
    exteriorStyle: style,
    footprintType,
    targetSqFt,
    rooms:
      targetSqFt > 700
        ? ["entry", "living room", "kitchen wall", "bedroom", "bath", "laundry closet"]
        : ["entry", "sleeping zone", "kitchen wall", "bath", "storage wall"],
    constraints: [
      placementText,
      ...(reviewSignals.length ? reviewSignals : ["Fit signals are currently acceptable for a starter concept."]),
      "Confirm setbacks, fire access, and utility routing with the local jurisdiction.",
      "Keep glazing and privacy tuned to the primary home and adjacent parcels.",
      "Treat this as a design starting point, not stamped plans.",
    ],
    nextSteps: [
      preferences?.hasSitePhoto ? "Use the attached backyard photo to align windows, entry, and privacy screening." : "Attach a backyard photo before design review.",
      preferences?.modelName ? `Compare ${preferences.modelName} against at least one smaller fallback model.` : "Compare one smaller model before locking scope.",
      "Verify zoning and overlays.",
      "Sketch site placement against driveway and outdoor space.",
      "Ask a designer or architect to test code compliance.",
    ],
    thumbnailPrompt: `Original ADU concept image, ${style}, ${targetSqFt} square feet, ${footprintType}, ${preferences?.constructionMethod ?? "site-built"} ADU, ${preferences?.hasSitePhoto ? "adapted to the attached backyard photo" : "California backyard"}, daylight, privacy-aware window placement, realistic architecture photography.`,
  };
}
