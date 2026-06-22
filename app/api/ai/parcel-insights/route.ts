import { type NextRequest, NextResponse } from "next/server";
import type { AIParcelInsights, AIParcelInsightsInput } from "@/lib/ai-types";
import { checkRateLimit } from "@/lib/server/rate-limit";
import {
  createOpenAIResponse,
  extractResponseText,
  OpenAIConfigError,
  OpenAIProviderError,
} from "@/lib/server/openai";

export const runtime = "nodejs";

const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.5";

const INSIGHTS_SCHEMA = {
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
    "recommendedNextSteps",
    "disclaimer",
  ],
  additionalProperties: false,
};

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, {
    limit: 20,
    namespace: "ai-parcel-insights",
    windowMs: 60_000,
  });
  if (limited) return limited;

  let input: AIParcelInsightsInput;
  try {
    input = (await request.json()) as AIParcelInsightsInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!input?.parcel || !input?.config || !input?.result) {
    return NextResponse.json(
      { error: "parcel, config, and result are required." },
      { status: 400 },
    );
  }

  try {
    const response = await createOpenAIResponse({
      model: TEXT_MODEL,
      max_output_tokens: 900,
      input: [
        {
          role: "system",
          content:
            "You are LotFoundry's ADU feasibility assistant. Interpret only the provided parcel, ADU, and feasibility data. Do not invent parcel facts, permit approvals, zoning rules, utility facts, taxes, or financing terms. Give concise homeowner-facing guidance and call out uncertainty.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lotfoundry_parcel_insights",
          schema: INSIGHTS_SCHEMA,
          strict: true,
        },
      },
    });

    const text = extractResponseText(response);
    if (!text) throw new OpenAIProviderError("OpenAI returned no text output.");

    return NextResponse.json(JSON.parse(text) as AIParcelInsights);
  } catch (err) {
    return handleAIError(err);
  }
}

function handleAIError(err: unknown) {
  if (err instanceof OpenAIConfigError) {
    return NextResponse.json(
      { error: "AI is not configured yet. Add OPENAI_API_KEY on the server." },
      { status: 501 },
    );
  }

  if (err instanceof SyntaxError) {
    return NextResponse.json(
      { error: "AI returned an unreadable response. Please try again." },
      { status: 502 },
    );
  }

  if (err instanceof OpenAIProviderError) {
    return NextResponse.json(
      { error: "AI request failed. Please try again." },
      { status: 502 },
    );
  }

  console.error("[/api/ai/parcel-insights] Unexpected error:", err);
  return NextResponse.json(
    { error: "AI is unavailable right now. Please try again." },
    { status: 500 },
  );
}
