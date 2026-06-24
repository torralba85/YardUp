import { type NextRequest, NextResponse } from "next/server";
import type { AIADUConcept } from "@/lib/ai-types";
import { checkAIRateLimit } from "@/lib/server/ai-rate-limit";
import { createAIRouteErrorResponse } from "@/lib/server/ai-route-errors";
import {
  createOpenAIResponse,
  extractGeneratedImageBase64,
  extractResponseText,
  OpenAIProviderError,
} from "@/lib/server/openai";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.5";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-5.5";

interface StyleAnalysis {
  architecturalStyle: string;
  styleSummary: string;
  matchedElements: string[];
  recommendedConfig: {
    roof: "shed" | "gable" | "flat";
    finish: "cedar" | "lap" | "stucco" | "board";
  };
  imagePrompt: string;
  disclaimer: string;
}

const STYLE_SCHEMA = {
  type: "object",
  properties: {
    architecturalStyle: { type: "string" },
    styleSummary: { type: "string" },
    matchedElements: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    recommendedConfig: {
      type: "object",
      properties: {
        roof: { type: "string", enum: ["shed", "gable", "flat"] },
        finish: { type: "string", enum: ["cedar", "lap", "stucco", "board"] },
      },
      required: ["roof", "finish"],
      additionalProperties: false,
    },
    imagePrompt: { type: "string" },
    disclaimer: { type: "string" },
  },
  required: [
    "architecturalStyle",
    "styleSummary",
    "matchedElements",
    "recommendedConfig",
    "imagePrompt",
    "disclaimer",
  ],
  additionalProperties: false,
};

export async function POST(request: NextRequest) {
  const limited = await checkAIRateLimit(request, {
    limit: 10,
    namespace: "ai-adu-concept",
    windowMs: 60_000,
  });
  if (limited) return limited;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form upload." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!isUploadedFile(image)) {
    return NextResponse.json({ error: "A home photo is required." }, { status: 400 });
  }
  if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
    return NextResponse.json(
      { error: "Upload a JPG, PNG, or WebP photo." },
      { status: 400 },
    );
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Photo must be 8 MB or smaller." },
      { status: 400 },
    );
  }

  const parcel = readJsonField(formData, "parcel");
  const config = readJsonField(formData, "config");
  if (!parcel || !config) {
    return NextResponse.json(
      { error: "parcel and config are required." },
      { status: 400 },
    );
  }

  try {
    const bytes = Buffer.from(await image.arrayBuffer());
    const imageUrl = `data:${image.type};base64,${bytes.toString("base64")}`;

    const styleResponse = await createOpenAIResponse({
      model: TEXT_MODEL,
      max_output_tokens: 900,
      input: [
        {
          role: "system",
          content:
            "You are LotFoundry's architectural style analyst. Analyze the uploaded home photo for visible style cues. Recommend an ADU roof and finish from the allowed product options. Do not identify private people, license plates, or exact addresses from the image.",
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Parcel and current ADU config: ${JSON.stringify({ parcel, config })}`,
            },
            { type: "input_image", image_url: imageUrl },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lotfoundry_style_analysis",
          schema: STYLE_SCHEMA,
          strict: true,
        },
      },
    });

    const styleText = extractResponseText(styleResponse);
    if (!styleText) throw new OpenAIProviderError("OpenAI returned no style output.");
    const style = JSON.parse(styleText) as StyleAnalysis;

    const imageResponse = await createOpenAIResponse(
      {
        model: IMAGE_MODEL,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Create a realistic homeowner-facing concept render of a detached backyard ADU that matches the uploaded home's visible style. Keep the primary home style cues, avoid people and vehicles, show a tasteful backyard setting, and make the ADU scale plausible. Use this design brief: " +
                  JSON.stringify(style),
              },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
        tools: [{ type: "image_generation" }],
      },
      90_000,
    );

    const imageBase64 = extractGeneratedImageBase64(imageResponse);
    if (!imageBase64) {
      throw new OpenAIProviderError("OpenAI returned no generated image.");
    }

    const result: AIADUConcept = {
      ...style,
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
    };

    return NextResponse.json(result);
  } catch (err) {
    return handleAIError(err);
  }
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.type === "string" &&
    typeof value.size === "number" &&
    typeof value.arrayBuffer === "function"
  );
}

function readJsonField(formData: FormData, key: string): unknown | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function handleAIError(err: unknown) {
  return createAIRouteErrorResponse(err, "/api/ai/adu-concept", {
    config: "AI is not configured yet. Add OPENAI_API_KEY on the server.",
    provider: "AI concept generation failed. Please try another photo.",
    syntax: "AI returned an unreadable style analysis. Please try again.",
    unavailable: "AI is unavailable right now. Please try again.",
  });
}
