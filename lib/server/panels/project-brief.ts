import { NextResponse } from "next/server";
import type {
  AIParcelRisk,
  AIProjectBrief,
  AIProjectBriefInput,
  AIProjectBriefPreview,
  AIProjectBriefResponse,
  AIRiskLevel,
} from "@/lib/ai-types";
import { certificateKey } from "@/lib/certificate-key";
import type { AIPanelDefinition } from "@/lib/server/ai-pipeline";
import { hasCertificate } from "@/lib/server/certificate-purchases";
import { OpenAIProviderError } from "@/lib/server/openai";
import { getStageBenchmarks, lookupPermitTracks } from "@/lib/server/permit-rules";

const MAX_CITY_LEN = 120;
const MAX_ADDRESS_LEN = 240;
const MAX_STATE_LEN = 50;
const MAX_ZIP_LEN = 20;
const MAX_OUTPUT_STR_LEN = 4000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedNonEmptyString(value: unknown, maxLen = MAX_OUTPUT_STR_LEN): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLen;
}

function validateProjectBriefOutput(raw: unknown): AIProjectBrief {
  if (!isRecord(raw) || !isRecord(raw.permitTrack)) {
    throw new OpenAIProviderError("OpenAI returned an invalid project brief.");
  }
  const { permitTrack, risks, stages, recommendedNextSteps } = raw;
  const validRisks =
    Array.isArray(risks) &&
    risks.length >= 2 &&
    risks.length <= 5 &&
    risks.every(
      (r) =>
        isRecord(r) &&
        isBoundedNonEmptyString(r.label) &&
        ["low", "medium", "high"].includes(String(r.level)) &&
        isBoundedNonEmptyString(r.explanation),
    );
  const validStages =
    Array.isArray(stages) &&
    stages.length >= 1 &&
    stages.length <= 8 &&
    stages.every(
      (s) =>
        isRecord(s) &&
        isBoundedNonEmptyString(s.name) &&
        isBoundedNonEmptyString(s.description) &&
        typeof s.estWeeksLow === "number" &&
        Number.isFinite(s.estWeeksLow) &&
        typeof s.estWeeksHigh === "number" &&
        Number.isFinite(s.estWeeksHigh) &&
        ["clear", "review", "blocker"].includes(String(s.status)),
    );
  const validSteps =
    Array.isArray(recommendedNextSteps) &&
    recommendedNextSteps.length >= 3 &&
    recommendedNextSteps.length <= 5 &&
    recommendedNextSteps.every((step) => isBoundedNonEmptyString(step));

  if (
    !isBoundedNonEmptyString(raw.headline) ||
    !isBoundedNonEmptyString(raw.summary) ||
    !isBoundedNonEmptyString(raw.bestFit) ||
    !validRisks ||
    !isBoundedNonEmptyString(permitTrack.name) ||
    !["ministerial", "discretionary"].includes(String(permitTrack.type)) ||
    !isBoundedNonEmptyString(permitTrack.basis) ||
    !validStages ||
    typeof raw.totalEstWeeksLow !== "number" ||
    !Number.isFinite(raw.totalEstWeeksLow) ||
    typeof raw.totalEstWeeksHigh !== "number" ||
    !Number.isFinite(raw.totalEstWeeksHigh) ||
    !validSteps ||
    !isBoundedNonEmptyString(raw.disclaimer)
  ) {
    throw new OpenAIProviderError("OpenAI returned an invalid project brief.");
  }

  return raw as unknown as AIProjectBrief;
}

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
  "Write `summary` as a self-contained plain-language overview. Never name the statute or ordinance, individual review-stage names, or specific next-step actions inside `summary` — that detail belongs only in its dedicated fields.",
  "Return one deduplicated `recommendedNextSteps` list spanning parcel verification, design, and permitting. Keep the summary concrete, estimate-honest, and suitable for a builder or lender handoff.",
  "Always state in `disclaimer` that the AI interpretation and timeline are planning estimates, not permitting advice, an approval guarantee, or a guarantee of income.",
].join(" ");

const RISK_SEVERITY: Record<AIRiskLevel, number> = { high: 0, medium: 1, low: 2 };

/** The most severe risk, first-listed winning ties (the model's own ordering). */
function mostSevereRisk(risks: AIParcelRisk[]): AIParcelRisk | undefined {
  return risks.reduce<AIParcelRisk | undefined>(
    (worst, risk) =>
      !worst || RISK_SEVERITY[risk.level] < RISK_SEVERITY[worst.level] ? risk : worst,
    undefined,
  );
}

/**
 * Redact a full brief into the free preview tier: the narrative hook stays
 * (headline, summary, track name/type, total weeks, the most severe risk)
 * while the paid depth (full risk list, staged timeline, statutory basis,
 * best-fit readout, next steps) is replaced by honest counts for the locked
 * card. The schema does not enforce risk ordering, so severity is selected
 * here rather than trusting `risks[0]`.
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
    firstRisk: mostSevereRisk(brief.risks) ?? {
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
  allowAnonymous: true,
  authorize: async (input, { uid, isAnonymous }) => {
    if (!isAnonymous) return null;
    try {
      if (await hasCertificate(uid, certificateKey(input.parcel))) {
        return null;
      }
    } catch {
      // Fail closed for anonymous callers if the purchase check fails.
    }
    return NextResponse.json(
      { error: "Unlock this property certificate or sign in to generate property notes." },
      { status: 403 },
    );
  },
  rateLimit: { limit: 8, windowMs: 60_000, dailyLimit: 30 },
  maxOutputTokens: 4096,
  requiredToolSequence: ["lookup_permit_tracks", "get_stage_benchmarks"],
  systemPrompt: SYSTEM_PROMPT,
  outputSchema: OUTPUT_SCHEMA,
  validateInput: (raw) => {
    if (!isRecord(raw) || !isRecord(raw.parcel) || !isRecord(raw.config) || !isRecord(raw.result)) {
      return { ok: false, error: "parcel, config, and result are required." };
    }
    const { parcel } = raw;
    if (
      typeof parcel.city !== "string" ||
      parcel.city.trim().length === 0 ||
      parcel.city.trim().length > MAX_CITY_LEN
    ) {
      return { ok: false, error: "parcel.city is required to determine the jurisdiction." };
    }
    if (
      typeof parcel.address !== "string" ||
      parcel.address.trim().length === 0 ||
      parcel.address.trim().length > MAX_ADDRESS_LEN
    ) {
      return { ok: false, error: "parcel.address is required to identify the property." };
    }
    if (
      parcel.state !== undefined &&
      (typeof parcel.state !== "string" || parcel.state.trim().length > MAX_STATE_LEN)
    ) {
      return { ok: false, error: "parcel.state must be a valid state string." };
    }
    if (
      parcel.zip !== undefined &&
      (typeof parcel.zip !== "string" || parcel.zip.trim().length > MAX_ZIP_LEN)
    ) {
      return { ok: false, error: "parcel.zip must be a valid ZIP string." };
    }
    return {
      ok: true,
      value: {
        parcel: raw.parcel,
        config: raw.config,
        result: raw.result,
      } as unknown as AIProjectBriefInput,
    };
  },
  validateOutput: validateProjectBriefOutput,
  buildContext: (input) => {
    const state = input.parcel.state?.trim();
    const city = input.parcel.city.trim();
    const address = input.parcel.address.trim();
    let jurisdiction = "";
    if (state && !city.includes(",")) {
      jurisdiction = `${city}, ${state}`;
    } else if (city.includes(",") || !address) {
      jurisdiction = city;
    } else {
      jurisdiction = `${city}, ${address}`;
    }
    return { jurisdiction };
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
    provider: "Property notes failed to generate. Please try again.",
    syntax: "AI returned an unreadable brief. Please try again.",
    unavailable: "AI is unavailable right now. Please try again.",
  },
};
