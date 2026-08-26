import type {
  AIADUConcept,
  AIParcelInsights,
  AIParcelInsightsInput,
  AIProjectBriefInput,
  AIProjectBriefResponse,
} from "./ai-types";
import type { ADUConfig, Parcel } from "./feasibility";
import { getGenerativeModel, Schema } from "firebase/ai";
import { ai, auth } from "./firebase";

export class AIRequestError extends Error {
  userMessage: string;

  constructor(userMessage: string) {
    super(userMessage);
    this.name = "AIRequestError";
    this.userMessage = userMessage;
  }
}

export async function requestProjectBrief(
  input: AIProjectBriefInput,
  idToken: string,
): Promise<AIProjectBriefResponse> {
  const res = await fetch("/api/ai/project-brief", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new AIRequestError(await readError(res));
  return (await res.json()) as AIProjectBriefResponse;
}

export async function requestADUConcept({
  image,
  parcel,
  config,
}: {
  image: File;
  parcel: Parcel & { zoning?: string; source?: string };
  config: ADUConfig;
}): Promise<AIADUConcept> {
  const user = auth.currentUser;
  if (!user) {
    throw new AIRequestError("Sign in to generate an AI style-match concept.");
  }

  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch {
    throw new AIRequestError("Your sign-in could not be verified. Please sign in again.");
  }

  const formData = new FormData();
  formData.set("image", image);
  formData.set("parcel", JSON.stringify(parcel));
  formData.set("config", JSON.stringify(config));
  formData.set("consent", "true");

  const res = await fetch("/api/ai/adu-concept", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });

  if (!res.ok) throw new AIRequestError(await readError(res));
  return (await res.json()) as AIADUConcept;
}

// Structured-output contract for requestParcelInsights; must mirror AIParcelInsights.
const INSIGHTS_SCHEMA = Schema.object({
  properties: {
    headline: Schema.string(),
    summary: Schema.string(),
    bestFit: Schema.string(),
    risks: Schema.array({
      items: Schema.object({
        properties: {
          label: Schema.string(),
          level: Schema.enumString({ enum: ["low", "medium", "high"] }),
          explanation: Schema.string(),
        },
        required: ["label", "level", "explanation"],
      }),
    }),
    recommendedNextSteps: Schema.array({
      items: Schema.string(),
    }),
    disclaimer: Schema.string(),
  },
  required: [
    "headline",
    "summary",
    "bestFit",
    "risks",
    "recommendedNextSteps",
    "disclaimer",
  ],
});

const INSIGHTS_SYSTEM_INSTRUCTION =
  "You are LotFoundry's ADU feasibility assistant. Interpret only the provided parcel, ADU, and feasibility data. Do not invent parcel facts, permit approvals, zoning rules, utility facts, taxes, or financing terms. Give concise homeowner-facing guidance and call out uncertainty.";

export async function requestParcelInsights(
  input: AIParcelInsightsInput,
): Promise<AIParcelInsights> {
  // Runs on Firebase AI Logic (client-side Gemini) instead of the server AI
  // routes to keep AI spend off the OpenAI bill, but it still consumes metered
  // Gemini quota — so it carries the same signed-in requirement as every other
  // live lookup.
  if (!auth.currentUser) {
    throw new AIRequestError("Sign in to generate AI parcel insights.");
  }

  const model = getGenerativeModel(ai, {
    model: "gemini-3.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: INSIGHTS_SCHEMA,
      maxOutputTokens: 900,
    },
    systemInstruction: INSIGHTS_SYSTEM_INSTRUCTION,
  });

  try {
    const result = await model.generateContent(JSON.stringify(input));
    return JSON.parse(result.response.text()) as AIParcelInsights;
  } catch (err) {
    // SDK errors can carry key/config details that must not reach the UI.
    console.error("[ai-api] parcel insights generation failed:", err);
    throw new AIRequestError("AI is unavailable right now. Please try again.");
  }
}

async function readError(res: Response): Promise<string> {
  const fallback = "AI is unavailable right now. Please try again.";
  try {
    const json = (await res.json()) as { error?: string };
    return json.error || fallback;
  } catch {
    return fallback;
  }
}
