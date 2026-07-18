import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";

function makeConceptRequest(): NextRequest {
  const formData = new FormData();
  formData.set("image", new File(["home-photo"], "home.jpg", { type: "image/jpeg" }));
  formData.set("parcel", JSON.stringify(parcelPresets[0]));
  formData.set("config", JSON.stringify(defaultAduConfig));

  return new NextRequest("http://localhost/api/ai/adu-concept", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.60" },
    body: formData,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/ai/adu-concept", () => {
  it("uses the Responses image-generation tool with the documented model fallbacks", async () => {
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
          output: [{ type: "image_generation_call", result: "generated-image-base64" }],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(makeConceptRequest());

    const responseBody = await res.clone().json().catch(() => ({}));
    expect(res.status, JSON.stringify(responseBody)).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const styleRequestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      model: string;
    };
    const imageRequestBody = JSON.parse(fetchMock.mock.calls[1][1].body as string) as {
      model: string;
      tools: Array<{ type: string }>;
    };
    expect(styleRequestBody.model).toBe("gpt-5.6-sol");
    expect(imageRequestBody.model).toBe("gpt-5.6-sol");
    expect(imageRequestBody.tools).toEqual([{ type: "image_generation" }]);
  });
});
