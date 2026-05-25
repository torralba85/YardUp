import type { DesignConceptPayload, DesignConceptPreferences, InspirationItem, Project } from "../types";

export async function buildDesignConcept(
  project: Project,
  inspiration?: InspirationItem,
  preferences?: DesignConceptPreferences,
): Promise<DesignConceptPayload> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return makeLocalConcept(project, inspiration, preferences);
  }

  try {
    const remote = await callGemini(project, inspiration, preferences, apiKey);
    return sanitizeConcept(remote, project, inspiration, preferences);
  } catch {
    return makeLocalConcept(project, inspiration, preferences);
  }
}

export function makeLocalConcept(
  project: Project,
  inspiration?: InspirationItem,
  preferences?: DesignConceptPreferences,
): DesignConceptPayload {
  const targetSqFt = preferences?.targetSqFt ?? inspiration?.sqft ?? project.lastEstimateInput?.aduSqFt ?? 650;
  const footprintType =
    preferences?.modelName ??
    (targetSqFt > 700 ? "one-bedroom bar plan" : targetSqFt > 450 ? "compact one-bedroom rectangle" : "compact studio rectangle");
  const style = preferences?.styleLabel ?? inspiration?.style ?? "Warm modern";
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
    thumbnailPrompt: `Original ADU concept image, ${style}, ${targetSqFt} square feet, ${footprintType}, ${preferences?.constructionMethod ?? "site-built"} ADU, ${preferences?.hasSitePhoto ? "adapted to the attached backyard photo" : "supported-markets backyard"}, daylight, privacy-aware window placement, realistic architecture photography.`,
  };
}

async function callGemini(
  project: Project,
  inspiration: InspirationItem | undefined,
  preferences: DesignConceptPreferences | undefined,
  apiKey: string,
): Promise<unknown> {
  const prompt = [
    "Return only JSON for an ADU concept. Fields: title, exteriorStyle, footprintType, targetSqFt, rooms, constraints, nextSteps, thumbnailPrompt.",
    `Jurisdiction: ${project.jurisdiction}. Lot: ${project.lotSqFt} sqft. Home: ${project.primaryHomeSqFt} sqft.`,
    project.lastEstimateInput ? `Target ADU size: ${project.lastEstimateInput.aduSqFt} sqft.` : "",
    inspiration ? `Inspired by: ${inspiration.title}, ${inspiration.style}, ${inspiration.sqft} sqft.` : "",
    preferences?.modelName ? `Selected model: ${preferences.modelName}, ${preferences.targetSqFt ?? "unknown"} sqft, ${preferences.constructionMethod ?? "construction method unspecified"}.` : "",
    preferences?.styleLabel ? `Selected style: ${preferences.styleLabel}.` : "",
    preferences?.placement
      ? `Selected placement: ${Math.round(preferences.placement.xPercent)}% across and ${Math.round(
          preferences.placement.yPercent,
        )}% down the buildable area, rotated ${preferences.placement.rotation} degrees.`
      : "",
    preferences?.fitSignals?.length
      ? `Fit signals: ${preferences.fitSignals
          .map((signal) => `${signal.label} ${signal.status}: ${signal.detail}`)
          .join("; ")}.`
      : "",
    preferences?.hasSitePhoto ? "A backyard site photo is attached on the client; reference it generally without describing private address details." : "",
    "Do not include exact address or personal identifiers. Mention that constraints require city verification.",
  ]
    .filter(Boolean)
    .join("\n");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini response missing candidate text");
  }

  return JSON.parse(text);
}

function sanitizeConcept(
  remote: unknown,
  project: Project,
  inspiration?: InspirationItem,
  preferences?: DesignConceptPreferences,
): DesignConceptPayload {
  const fallback = makeLocalConcept(project, inspiration, preferences);
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
