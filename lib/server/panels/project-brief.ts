import type {
  AIProjectBrief,
  AIProjectBriefInput,
  AIProjectBriefPreview,
  AIProjectBriefResponse,
} from "@/lib/ai-types";
import { certificateKey } from "@/lib/certificate-key";
import type { AIPanelDefinition } from "@/lib/server/ai-pipeline";
import { hasCertificate } from "@/lib/server/certificate-purchases";
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

/**
 * Redact a full brief into the free preview tier: the narrative hook stays
 * (headline, summary, track name/type, total weeks, the top risk) while the
 * paid depth (full risk list, staged timeline, statutory basis, best-fit
 * readout, next steps) is replaced by honest counts for the locked card.
 */
export function redactBriefToPreview(brief: AIProjectBrief): AIProjectBriefPreview {
  return {
    headline: brief.headline,
    summary: brief.summary,
    permitTrack: {
      name: brief.permitTrack.name,
      type: brief.permitTrack.type,
    },
    totalEstWeeksLow: brief.totalEstWeeksLow,
    totalEstWeeksHigh: brief.totalEstWeeksHigh,
    firstRisk: brief.risks[0] ?? {
      label: "Feasibility review",
      level: "medium",
      explanation: "Unlock the complete brief for the ranked risk list.",
    },
    locked: {
      riskCount: brief.risks.length,
      stageCount: brief.stages.length,
      nextStepCount: brief.recommendedNextSteps.length,
    },
    disclaimer: brief.disclaimer,
  };
}

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
    if (
      typeof input.parcel.address !== "string" ||
      input.parcel.address.trim().length === 0
    ) {
      return { ok: false, error: "parcel.address is required to identify the property." };
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
  finalize: async (brief, { uid, input }): Promise<AIProjectBriefResponse> => {
    try {
      if (await hasCertificate(uid, certificateKey(input.parcel))) {
        return { tier: "full", brief };
      }
    } catch (err) {
      // A purchase-ledger hiccup must not fail the whole brief — degrade to
      // the preview tier; a purchaser can regenerate for the full version.
      console.warn("[project-brief] purchase check failed; serving preview:", err);
    }
    return { tier: "preview", preview: redactBriefToPreview(brief) };
  },
  errorMessages: {
    config: "AI is not configured yet. Add OPENAI_API_KEY on the server.",
    provider: "The parcel and timeline brief failed. Please try again.",
    syntax: "AI returned an unreadable brief. Please try again.",
    unavailable: "AI is unavailable right now. Please try again.",
  },
};
