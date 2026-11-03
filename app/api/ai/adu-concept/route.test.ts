import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";

const { checkAIRateLimitMock, consumeOpenAIProviderQuotaMock, requireApiAuthMock } =
  vi.hoisted(() => ({
    checkAIRateLimitMock: vi.fn(),
    consumeOpenAIProviderQuotaMock: vi.fn(),
    requireApiAuthMock: vi.fn(),
  }));

vi.mock("@/lib/server/ai-rate-limit", () => ({
  checkAIRateLimit: checkAIRateLimitMock,
  consumeOpenAIProviderQuota: consumeOpenAIProviderQuotaMock,
  OpenAIProviderRateLimitError: class OpenAIProviderRateLimitError extends Error {},
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: requireApiAuthMock,
}));

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

function makeConceptRequest({
  consent = "true",
  imageBytes = JPEG_BYTES,
}: {
  consent?: string | null;
  imageBytes?: Uint8Array;
} = {}): NextRequest {
  const fields = new Map<string, FormDataEntryValue>([
    [
      "image",
      {
        type: "image/jpeg",
        size: imageBytes.byteLength,
        arrayBuffer: async () => imageBytes.slice().buffer,
      } as File,
    ],
    [
      "parcel",
      JSON.stringify({
        ...parcelPresets[0],
        lat: 32.7157,
        lng: -117.1611,
        apn: "123-456-78-00",
      }),
    ],
    ["config", JSON.stringify(defaultAduConfig)],
  ]);
  if (consent !== null) fields.set("consent", consent);

  return {
    headers: new Headers({ "x-forwarded-for": "203.0.113.60" }),
    formData: async () => ({ get: (key: string) => fields.get(key) ?? null }) as FormData,
  } as unknown as NextRequest;
}

beforeEach(() => {
  requireApiAuthMock.mockReset().mockResolvedValue({ uid: "user-1" });
  consumeOpenAIProviderQuotaMock.mockReset().mockResolvedValue(undefined);
  checkAIRateLimitMock.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/ai/adu-concept", () => {
  it("requires authentication before parsing or sending the photo", async () => {
    requireApiAuthMock.mockResolvedValue(
      NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const res = await POST(makeConceptRequest());

    expect(res.status).toBe(401);
    expect(consumeOpenAIProviderQuotaMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires explicit server-visible consent before sending the photo", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const res = await POST(makeConceptRequest({ consent: null }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Consent is required before sending a photo to OpenAI.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a file whose bytes do not match its declared image type", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const res = await POST(
      makeConceptRequest({ imageBytes: new TextEncoder().encode("not-a-jpeg") }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Photo contents do not match its file type." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the Responses image-generation tool with the documented model fallbacks and strips address/coordinates from parcel context", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("OPENAI_TEXT_MODEL", "");
    vi.stubEnv("OPENAI_IMAGE_MODEL", "");
    const { POST } = await import("./route");
    const styleAnalysis = {
      architecturalStyle: "Craftsman",
      styleSummary: "Warm wood trim and a low-pitch roof.",
      matchedElements: ["wood trim", "front porch", "earth-tone siding"],
      recommendedConfig: { roof: "gable", finish: "lap" },
      imagePrompt: "Craftsman backyard ADU",
      disclaimer: "Concept image only.",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          output_text: JSON.stringify(styleAnalysis),
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          output: [{ type: "image_generation_call", result: "aW1hZ2U=" }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(makeConceptRequest());

    const responseBody = await res.clone().json().catch(() => ({}));
    expect(res.status, JSON.stringify(responseBody)).toBe(200);
    expect(requireApiAuthMock).toHaveBeenCalledOnce();
    expect(consumeOpenAIProviderQuotaMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const styleRequestRaw = fetchMock.mock.calls[0][1].body as string;
    const styleRequestBody = JSON.parse(styleRequestRaw) as {
      model: string;
    };
    const imageRequestBody = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      model: string;
      tools: Array<{ type: string }>;
    };
    expect(styleRequestBody.model).toBe("gpt-5.6-sol");
    expect(imageRequestBody.model).toBe("gpt-5.6-sol");
    expect(imageRequestBody.tools).toEqual([{ type: "image_generation" }]);
    expect(styleRequestRaw).not.toContain(parcelPresets[0].address);
    expect(styleRequestRaw).not.toContain("32.7157");
    expect(styleRequestRaw).not.toContain("-117.1611");
    expect(styleRequestRaw).not.toContain("123-456-78-00");
    expect(styleRequestRaw).toContain(parcelPresets[0].city);
    for (const key of ["lotArea", "lotWidth", "lotLength", "existingHouseSqft"] as const) {
      expect(styleRequestRaw).toContain(
        JSON.stringify(`${JSON.stringify(key)}:${parcelPresets[0][key]}`).slice(1, -1),
      );
    }
  });

  it("rejects malformed provider output before requesting image generation", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        output_text: JSON.stringify({
          architecturalStyle: "Craftsman",
          styleSummary: "Warm wood trim.",
          matchedElements: ["only-one"],
          recommendedConfig: { roof: "gable", finish: "lap" },
          imagePrompt: "Craftsman backyard ADU",
          disclaimer: "Concept image only.",
        }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("./route");

    const res = await POST(makeConceptRequest());

    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(consumeOpenAIProviderQuotaMock).toHaveBeenCalledOnce();
  });
});
