import type {
  AIPropertyAnalysis,
  AIPropertyAnalysisInput,
  AIPropertyAnalysisPreview,
  AIPropertyAnalysisResponse,
} from "@/lib/ai-types";
import { certificateKey } from "@/lib/certificate-key";
import type { AIPanelDefinition } from "@/lib/server/ai-pipeline";
import { hasCertificate } from "@/lib/server/certificate-purchases";
import { getStageBenchmarks, lookupPermitTracks } from "@/lib/server/permit-rules";

/** Tool-execution context: everything the permit tools need, derived server-side. */
interface PropertyAnalysisCtx {
  jurisdiction: string;
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    bestFit: { type: "string" },
    risks: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          level: { type: "string", enum: ["low", "medium", "high"] },
          explanation: { type: "string" },
        },
        required: ["label", "level", "explanation"],
        additionalProperties: false,
      },
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
    permitStages: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
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
      },
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
    "permitStages",
    "totalEstWeeksLow",
    "totalEstWeeksHigh",
    "recommendedNextSteps",
    "disclaimer",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = [
  "You are LotFoundry's property analyst. Produce ONE cohesive, plain-English analysis of this parcel's ADU opportunity: what the lot allows, what the concept could earn, and how permitting is likely to go.",
  "Interpret only the provided parcel, ADU, and feasibility data. Never invent parcel facts, zoning rules, utility facts, taxes, or financing terms.",
  "Call `lookup_permit_tracks` to get the candidate ADU permit tracks for this parcel's jurisdiction, then call `get_stage_benchmarks` with the id of the track you select.",
  "You MUST base the permit track name, its statutory basis, and EVERY week estimate ONLY on the tool results. Never invent a permit track, statute, ordinance, or timeline the tools did not return.",
  "Lead the summary with the income story — weave the rent, NOI, payback, and coverage numbers into the narrative.",
  "Merge property, zoning, economic, and permit-review concerns into ONE ranked `risks` list, most consequential first. Map the feasibility `zoningStatus` and `warnings` into both `risks` and the stage `status` fields (a coverage overage or height review makes the bearing stage `review` or `blocker`; otherwise `clear`).",
  "Set `totalEstWeeksLow`/`totalEstWeeksHigh` to the sum of the stage estimates.",
  "Give ONE unified `recommendedNextSteps` list, ordered by what unblocks the most. Keep language homeowner-facing and concrete; call out uncertainty.",
  "Always include a `disclaimer` that this is a planning estimate based on typical timelines, not permitting or financial advice, and not an approval or income guarantee.",
].join(" ");

/**
 * Redact a full analysis into the free preview tier: the narrative hook stays
 * (headline, summary, track name/type, total weeks, the top risk), while the
 * paid depth (risk list, staged timeline, statutory basis, next steps) is
 * replaced by honest counts for the locked-content card.
 */
export function redactAnalysisToPreview(
  analysis: AIPropertyAnalysis,
): AIPropertyAnalysisPreview {
  return {
    headline: analysis.headline,
    summary: analysis.summary,
    permitTrack: {
      name: analysis.permitTrack.name,
      type: analysis.permitTrack.type,
    },
    totalEstWeeksLow: analysis.totalEstWeeksLow,
    totalEstWeeksHigh: analysis.totalEstWeeksHigh,
    firstRisk: analysis.risks[0] ?? {
      label: "Feasibility review",
      level: "medium",
      explanation: "Unlock the full analysis for the ranked risk list.",
    },
    locked: {
      riskCount: analysis.risks.length,
      stageCount: analysis.permitStages.length,
      nextStepCount: analysis.recommendedNextSteps.length,
    },
    disclaimer: analysis.disclaimer,
  };
}

export const propertyAnalysisDef: AIPanelDefinition<
  AIPropertyAnalysisInput,
  AIPropertyAnalysis,
  PropertyAnalysisCtx
> = {
  id: "property-analysis",
  namespace: "ai-property-analysis",
  // Agentic (several model calls per request) but it replaces the two former
  // panels, so it inherits the tighter permit-pathway budget.
  rateLimit: { limit: 8, windowMs: 60_000 },
  maxOutputTokens: 1600,
  requiredToolSequence: ["lookup_permit_tracks", "get_stage_benchmarks"],
  // Guests may generate: the route tiers the response (preview vs full) by
  // certificate purchase instead of refusing outright.
  auth: "optional",
  systemPrompt: SYSTEM_PROMPT,
  outputSchema: OUTPUT_SCHEMA,
  validateInput: (raw) => {
    const input = raw as Partial<AIPropertyAnalysisInput> | null;
    if (!input?.parcel || !input.config || !input.result) {
      return { ok: false, error: "parcel, config, and result are required." };
    }
    if (typeof input.parcel.city !== "string" || input.parcel.city.trim().length === 0) {
      return { ok: false, error: "parcel.city is required to determine the jurisdiction." };
    }
    return { ok: true, value: input as AIPropertyAnalysisInput };
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
        "Return the candidate ADU permit tracks (ministerial vs discretionary) and their statutory basis for this parcel's jurisdiction. Call this first.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
      execute: async (_args, ctx) => ({ tracks: lookupPermitTracks(ctx.jurisdiction) }),
    },
    {
      name: "get_stage_benchmarks",
      description:
        "Return the typical review-stage durations (in weeks) for a permit track id returned by lookup_permit_tracks.",
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
  finalize: async (analysis, { uid, input }): Promise<AIPropertyAnalysisResponse> => {
    if (uid) {
      try {
        if (await hasCertificate(uid, certificateKey(input.parcel))) {
          return { tier: "full", analysis };
        }
      } catch (err) {
        // A purchase-ledger hiccup must not fail the whole analysis — degrade
        // to the preview tier and let the client retry for the full version.
        console.warn("[property-analysis] purchase check failed; serving preview:", err);
      }
    }
    return { tier: "preview", preview: redactAnalysisToPreview(analysis) };
  },
  errorMessages: {
    config: "AI is not configured yet. Add OPENAI_API_KEY on the server.",
    provider: "The property analysis request failed. Please try again.",
    syntax: "AI returned an unreadable response. Please try again.",
    unavailable: "AI is unavailable right now. Please try again.",
  },
};
