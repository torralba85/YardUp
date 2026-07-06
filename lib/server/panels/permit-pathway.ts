import type { AIPermitPathway, AIPermitPathwayInput } from "@/lib/ai-types";
import type { AIPanelDefinition } from "@/lib/server/ai-pipeline";
import { getStageBenchmarks, lookupPermitTracks } from "@/lib/server/permit-rules";

/** Tool-execution context: everything the permit tools need, derived server-side. */
interface PermitPathwayCtx {
  jurisdiction: string;
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    track: {
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
    reviewFlags: {
      type: "array",
      minItems: 0,
      maxItems: 5,
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
    totalEstWeeksLow: { type: "number" },
    totalEstWeeksHigh: { type: "number" },
    recommendedNextSteps: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "string" },
    },
    disclaimer: { type: "string" },
  },
  required: [
    "headline",
    "summary",
    "track",
    "stages",
    "reviewFlags",
    "totalEstWeeksLow",
    "totalEstWeeksHigh",
    "recommendedNextSteps",
    "disclaimer",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = [
  "You are LotFoundry's ADU permitting guide. Explain the likely permit pathway and timeline for the provided parcel.",
  "Call `lookup_permit_tracks` to get the candidate permit tracks for this parcel's jurisdiction, then call `get_stage_benchmarks` with the id of the track you select.",
  "You MUST base the track name, its statutory basis, and EVERY week estimate ONLY on the tool results. Never invent a permit track, statute, ordinance, or timeline that the tools did not return.",
  "Map the feasibility `zoningStatus` and `warnings` into `reviewFlags` (a coverage overage or height review becomes a flagged stage/flag). Set each stage `status` to `review` or `blocker` when a warning bears on that stage; otherwise `clear`.",
  "Set `totalEstWeeksLow`/`totalEstWeeksHigh` to the sum of the stage estimates. Keep language homeowner-facing and concrete.",
  "Always include a `disclaimer` that this is a planning estimate based on typical timelines, not permitting advice or an approval guarantee.",
].join(" ");

export const permitPathwayDef: AIPanelDefinition<
  AIPermitPathwayInput,
  AIPermitPathway,
  PermitPathwayCtx
> = {
  id: "permit-pathway",
  namespace: "ai-permit-pathway",
  // Tighter than single-shot panels: the agentic loop makes several model
  // calls per request, so each request costs more.
  rateLimit: { limit: 8, windowMs: 60_000 },
  maxOutputTokens: 1200,
  systemPrompt: SYSTEM_PROMPT,
  outputSchema: OUTPUT_SCHEMA,
  validateInput: (raw) => {
    const input = raw as Partial<AIPermitPathwayInput> | null;
    if (!input?.parcel || !input.config || !input.result) {
      return { ok: false, error: "parcel, config, and result are required." };
    }
    if (typeof input.parcel.city !== "string" || input.parcel.city.trim().length === 0) {
      return { ok: false, error: "parcel.city is required to determine the jurisdiction." };
    }
    return { ok: true, value: input as AIPermitPathwayInput };
  },
  buildContext: (input) => ({ jurisdiction: input.parcel.city }),
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
  errorMessages: {
    config: "AI is not configured yet. Add OPENAI_API_KEY on the server.",
    provider: "The permit pathway request failed. Please try again.",
    syntax: "AI returned an unreadable response. Please try again.",
    unavailable: "AI is unavailable right now. Please try again.",
  },
};
