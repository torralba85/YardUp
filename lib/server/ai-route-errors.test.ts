import { describe, expect, it } from "vitest";
import { OpenAIProviderRateLimitError } from "./ai-rate-limit";
import { createAIRouteErrorResponse } from "./ai-route-errors";

const messages = {
  config: "config",
  provider: "provider",
  syntax: "syntax",
  unavailable: "unavailable",
};

describe("createAIRouteErrorResponse", () => {
  it("preserves provider quota status and retry timing", async () => {
    const response = createAIRouteErrorResponse(
      new OpenAIProviderRateLimitError(429, 37, "limited"),
      "/api/ai/test",
      messages,
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(await response.json()).toEqual({
      error: "AI is busy right now. Please try again shortly.",
    });
  });

  it("returns the route's unavailable message when quota storage fails closed", async () => {
    const response = createAIRouteErrorResponse(
      new OpenAIProviderRateLimitError(503, 60, "backend unavailable"),
      "/api/ai/test",
      messages,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ error: "unavailable" });
  });
});
