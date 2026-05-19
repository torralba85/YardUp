import { regulationGuides } from "../data/regulations";
import type {
  DesignConcept,
  InspirationItem,
  JurisdictionId,
  Project,
  PropertyRecord,
  QuoteRequest,
  RegulationGuide,
} from "../domain/types";
import { callCloudFunction } from "./firebase";

export async function getRegulationGuide(jurisdiction: JurisdictionId): Promise<RegulationGuide> {
  const remote = await callCloudFunction<{ jurisdiction: JurisdictionId }, RegulationGuide>("getRegulationGuide", {
    jurisdiction,
  }).catch(() => null);

  return remote ?? regulationGuides[jurisdiction];
}

export async function generateDesignConcept(project: Project, inspiration?: InspirationItem): Promise<DesignConcept> {
  const remote = await callCloudFunction<
    { project: Project; inspiration?: InspirationItem },
    Omit<DesignConcept, "id" | "projectId" | "createdAt">
  >("generateDesignConcept", { project, inspiration }).catch(() => null);

  const now = new Date().toISOString();
  const base = remote ?? makeLocalConcept(project, inspiration);

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
): Omit<DesignConcept, "id" | "projectId" | "createdAt"> {
  const targetSqFt = inspiration?.sqft ?? project.lastEstimateInput?.aduSqFt ?? 650;
  const footprintType = targetSqFt > 700 ? "one-bedroom bar plan" : "compact studio rectangle";
  const style = inspiration?.style ?? "Warm modern";

  return {
    title: inspiration ? `Adapt ${inspiration.title}` : `${project.name} concept`,
    exteriorStyle: style,
    footprintType,
    targetSqFt,
    rooms:
      targetSqFt > 700
        ? ["entry", "living room", "kitchen wall", "bedroom", "bath", "laundry closet"]
        : ["entry", "sleeping zone", "kitchen wall", "bath", "storage wall"],
    constraints: [
      "Confirm setbacks, fire access, and utility routing with the local jurisdiction.",
      "Keep glazing and privacy tuned to the primary home and adjacent parcels.",
      "Treat this as a design starting point, not stamped plans.",
    ],
    nextSteps: [
      "Verify zoning and overlays.",
      "Sketch site placement against driveway and outdoor space.",
      "Ask a designer or architect to test code compliance.",
    ],
    thumbnailPrompt: `Original ADU concept image, ${style}, ${targetSqFt} square feet, ${footprintType}, California backyard, daylight, realistic architecture photography.`,
  };
}
