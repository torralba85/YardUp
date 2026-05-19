import type { DesignConceptPayload, InspirationItem, Project } from "../types";

export async function buildDesignConcept(project: Project, inspiration?: InspirationItem): Promise<DesignConceptPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return makeLocalConcept(project, inspiration);
  }

  try {
    const remote = await callOpenAI(project, inspiration, apiKey);
    return sanitizeConcept(remote, project, inspiration);
  } catch {
    return makeLocalConcept(project, inspiration);
  }
}

export function makeLocalConcept(project: Project, inspiration?: InspirationItem): DesignConceptPayload {
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

async function callOpenAI(project: Project, inspiration: InspirationItem | undefined, apiKey: string): Promise<unknown> {
  const prompt = [
    "Return only JSON for an ADU concept. Fields: title, exteriorStyle, footprintType, targetSqFt, rooms, constraints, nextSteps, thumbnailPrompt.",
    `Jurisdiction: ${project.jurisdiction}. Lot: ${project.lotSqFt} sqft. Home: ${project.primaryHomeSqFt} sqft.`,
    project.lastEstimateInput ? `Target ADU size: ${project.lastEstimateInput.aduSqFt} sqft.` : "",
    inspiration ? `Inspired by: ${inspiration.title}, ${inspiration.style}, ${inspiration.sqft} sqft.` : "",
    "Do not include exact address or personal identifiers. Mention that constraints require city verification.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) {
    throw new Error("OpenAI response missing output_text");
  }

  return JSON.parse(payload.output_text);
}

function sanitizeConcept(remote: unknown, project: Project, inspiration?: InspirationItem): DesignConceptPayload {
  const fallback = makeLocalConcept(project, inspiration);
  if (!remote || typeof remote !== "object") return fallback;

  const candidate = remote as Partial<DesignConceptPayload>;
  return {
    title: safeString(candidate.title, fallback.title),
    exteriorStyle: safeString(candidate.exteriorStyle, fallback.exteriorStyle),
    footprintType: safeString(candidate.footprintType, fallback.footprintType),
    targetSqFt: safeNumber(candidate.targetSqFt, fallback.targetSqFt),
    rooms: safeStringArray(candidate.rooms, fallback.rooms),
    constraints: safeStringArray(candidate.constraints, fallback.constraints),
    nextSteps: safeStringArray(candidate.nextSteps, fallback.nextSteps),
    thumbnailPrompt: safeString(candidate.thumbnailPrompt, fallback.thumbnailPrompt),
  };
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : fallback;
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const clean = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 180));
  return clean.length ? clean.slice(0, 8) : fallback;
}
