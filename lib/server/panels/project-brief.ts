import type { AIProjectBrief, AIProjectBriefInput } from "@/lib/ai-types";
import type { AIPanelDefinition } from "@/lib/server/ai-pipeline";
import { getStageBenchmarks, lookupPermitTracks } from "@/lib/server/permit-rules";

interface ProjectBriefContext {
  jurisdiction: string;
}

const RISK_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string" },
    level: { type: "string", enum: ["low", "medium", "high"] },
    explanation: { type: "string" },
  },
  required: ["label", "level", "explanation"],
  additionalProperties: false,
};

const STAGE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    estWeeksLow: { type: "number" },
    estWeeksHigh: { type: "number" },
    status: { type: "string", enum: ["clear", "review", "blocker"] },
  },
  required: ["name", "description", "estWeeksLow", "estWeeksHigh", "status"],
  additionalProperties: false,
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    bestFit: { type: "string" },
    risks: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: RISK_SCHEMA,
    },
    permitTrack: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["ministerial", "discretionary"] },
        basis: { type: "string" },
      },
      required: ["name", "type", "basis"],
      additionalProperties: false,
    },
    stages: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: STAGE_SCHEMA,
    },
    totalEstWeeksLow: { type: "number" },
    totalEstWeeksHigh: { type: "number" },
    recommendedNextSteps: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string" },
    },
    disclaimer: { type: "string" },
  },
  required: [
    "headline",
    "summary",
    "bestFit",
    "risks",
    "permitTrack",
    "stages",
    "totalEstWeeksLow",
    "totalEstWeeksHigh",
    "recommendedNextSteps",
    "disclaimer",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = [
  "You are LotFoundry's ADU feasibility recorder. Produce one coherent homeowner-facing parcel and permit brief for inclusion in a Certificate of Feasibility.",
  "Interpret only the parcel, ADU, financial, and feasibility data supplied by the user. Never invent parcel facts, zoning rules, approvals, utility conditions, taxes, financing terms, or rent facts.",
  "Call `lookup_permit_tracks` first, select the most applicable returned track, then call `get_stage_benchmarks` with that exact track id.",
  "The permit track name, statutory basis, every stage, and every week estimate MUST come only from those tool results. Set the total low and high values to the exact sums of the selected stages.",
  "Merge parcel-fit and permit concerns into one concise `risks` list. Map feasibility warnings onto the relevant risks and stage statuses; do not repeat the same concern in different words.",
  "Return one deduplicated `recommendedNextSteps` list spanning parcel verification, design, and permitting. Keep the summary concrete, estimate-honest, and suitable for a builder or lender handoff.",
  "Always state in `disclaimer` that the AI interpretation and timeline are planning estimates, not permitting advice, an approval guarantee, or a guarantee of income.",
].join(" ");

export const projectBriefDef: AIPanelDefinition<
  AIProjectBriefInput,
  AIProjectBrief,
  ProjectBriefContext
> = {
  id: "project-brief",
  namespace: "ai-project-brief",
  rateLimit: { limit: 8, windowMs: 60_000 },
  maxOutputTokens: 1800,
  requiredToolSequence: ["lookup_permit_tracks", "get_stage_benchmarks"],
  systemPrompt: SYSTEM_PROMPT,
  outputSchema: OUTPUT_SCHEMA,
  validateInput: (raw) => {
    const input = raw as Partial<AIProjectBriefInput> | null;
    if (!input?.parcel || !input.config || !input.result) {
      return { ok: false, error: "parcel, config, and result are required." };
    }
    if (typeof input.parcel.city !== "string" || input.parcel.city.trim().length === 0) {
      return { ok: false, error: "parcel.city is required to determine the jurisdiction." };
    }
    return { ok: true, value: input as AIProjectBriefInput };
  },
  buildContext: (input) => {
    const city = input.parcel.city.trim();
    const address = input.parcel.address.trim();
    return {
      jurisdiction: city.includes(",") || !address ? city : `${city}, ${address}`,
    };
  },
  tools: [
    {
      name: "lookup_permit_tracks",
      description:
        "Return candidate ADU permit tracks and statutory bases for the parcel jurisdiction. Call this first.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      execute: async (_args, ctx) => ({ tracks: lookupPermitTracks(ctx.jurisdiction) }),
    },
    {
      name: "get_stage_benchmarks",
      description:
        "Return typical review stages and week ranges for a track id returned by lookup_permit_tracks.",
      parameters: {
        type: "object",
        properties: {
          trackId: { type: "string", description: "A track id from lookup_permit_tracks." },
        },
        required: ["trackId"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const { trackId } = args as { trackId?: string };
        return { stages: trackId ? getStageBenchmarks(trackId) : [] };
      },
    },
  ],
  errorMessages: {
    config: "AI is not configured yet. Add OPENAI_API_KEY on the server.",
    provider: "The parcel and timeline brief failed. Please try again.",
    syntax: "AI returned an unreadable brief. Please try again.",
    unavailable: "AI is unavailable right now. Please try again.",
  },
};
