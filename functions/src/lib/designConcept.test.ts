import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildDesignConcept, makeLocalConcept } from "./designConcept";
import type { Project } from "../types";

const project: Project = {
  id: "starter-echo-park",
  name: "Echo Park ADU study",
  address: "1420 Baxter St, Los Angeles, CA",
  jurisdiction: "los-angeles",
  lotSqFt: 5200,
  primaryHomeSqFt: 1420,
  status: "estimated",
  createdAt: "2026-05-18T00:00:00.000Z",
  updatedAt: "2026-05-18T00:00:00.000Z",
  lastEstimateInput: {
    aduType: "detached",
    aduSqFt: 650,
    buildCostPerSqFt: 385,
    softCostRate: 0.18,
    contingencyRate: 0.12,
    monthlyRent: 3200,
    opExRate: 0.22,
    capRate: 0.055,
  },
};

describe("makeLocalConcept", () => {
  it("returns a client-compatible design concept without personal address text", () => {
    const concept = makeLocalConcept(project);

    expect(concept.title).toContain(project.name);
    expect(concept.targetSqFt).toBe(650);
    expect(concept.constraints.join(" ")).toContain("jurisdiction");
    expect(concept.thumbnailPrompt).not.toContain("1420 Baxter");
  });

  it("adapts inspiration style and size when provided", () => {
    const concept = makeLocalConcept(project, {
      id: "idea-1",
      title: "Garden studio",
      jurisdiction: "california",
      style: "Coastal minimal",
      budgetBand: "250k_400k",
      sqft: 780,
      imageUrl: "https://example.com/adu.jpg",
      tags: ["detached"],
      summary: "A compact model.",
    });

    expect(concept.title).toBe("Adapt Garden studio");
    expect(concept.exteriorStyle).toBe("Coastal minimal");
    expect(concept.footprintType).toBe("one-bedroom bar plan");
  });

  it("reflects planner preferences in local fallback concepts", () => {
    const concept = makeLocalConcept(project, undefined, {
      styleId: "industrial",
      styleLabel: "Industrial",
      modelId: "studio-340",
      modelName: "Garden Studio",
      constructionMethod: "prefab",
      targetSqFt: 340,
      placement: { xPercent: 70, yPercent: 68, rotation: 0 },
      fitSignals: [
        {
          id: "access-utility",
          label: "Access and utility",
          value: "Review needed",
          detail: "verify sewer lateral",
          status: "review",
        },
      ],
      hasSitePhoto: true,
    });

    expect(concept.title).toBe("Garden Studio in Industrial");
    expect(concept.constraints.join(" ")).toContain("verify sewer lateral");
    expect(concept.nextSteps.join(" ")).toContain("attached backyard photo");
    expect(concept.thumbnailPrompt).toContain("prefab ADU");
  });
});

describe("buildDesignConcept (Gemini integration)", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("falls back to the local concept when GEMINI_API_KEY is missing", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const concept = await buildDesignConcept(project);
    const local = makeLocalConcept(project);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(concept).toEqual(local);
  });

  it("falls back to the local concept when Gemini returns unparseable JSON", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";

    let capturedUrl = "";
    const fetchSpy = vi.fn(async (input: unknown) => {
      capturedUrl = String(input);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "this is not json {" }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const concept = await buildDesignConcept(project);
    const local = makeLocalConcept(project);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(capturedUrl).toContain("generativelanguage.googleapis.com");
    expect(capturedUrl).toContain("gemini-2.0-flash");
    expect(concept).toEqual(local);
  });

  it("sanitizes a valid Gemini JSON response into a concept payload", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const remote = {
      title: "Sunlit Studio",
      exteriorStyle: "Warm modern",
      footprintType: "compact studio rectangle",
      targetSqFt: 480,
      rooms: ["entry", "sleeping zone", "kitchen wall", "bath"],
      constraints: ["Verify setbacks with local jurisdiction."],
      nextSteps: ["Confirm utility tie-ins."],
      thumbnailPrompt: "Original ADU concept image, warm modern, supported-markets backyard.",
    };

    const fetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(remote) }] } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const concept = await buildDesignConcept(project);

    expect(concept.title).toBe("Sunlit Studio");
    expect(concept.targetSqFt).toBe(480);
    expect(concept.thumbnailPrompt).not.toContain("1420 Baxter");
  });

  it("falls back to the local concept when Gemini responds with an error status", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";

    const fetchSpy = vi.fn(async () =>
      new Response("rate limited", { status: 429 }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const concept = await buildDesignConcept(project);
    const local = makeLocalConcept(project);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(concept).toEqual(local);
  });
});
