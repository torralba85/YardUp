import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import { buildAIProjectBriefInput } from "@/lib/ai-project-brief";
import { certificateKey } from "@/lib/certificate-key";
import type { AIProjectBrief } from "@/lib/ai-types";
import { projectBriefDef, redactBriefToPreview } from "./project-brief";

const purchases = vi.hoisted(() => ({
  hasCertificate: vi.fn(),
}));

// The finalize tier check must not touch Firestore in unit tests.
vi.mock("@/lib/server/certificate-purchases", () => ({
  hasCertificate: purchases.hasCertificate,
}));

function validInput() {
  const parcel = parcelPresets[0];
  const result = calculateFeasibility(
    parcel,
    defaultAduConfig,
    defaultFinancialAssumptions,
  );
  return buildAIProjectBriefInput({ parcel, config: defaultAduConfig, result });
}

const fullBrief: AIProjectBrief = {
  headline: "A workable concept",
  summary: "Fits the recorded assumptions.",
  bestFit: "Keep the 600 sf concept.",
  risks: [
    { label: "Utility route", level: "medium", explanation: "Confirm the sewer path." },
    { label: "Coverage", level: "low", explanation: "Below the cap." },
    { label: "Height", level: "low", explanation: "Within the envelope." },
  ],
  permitTrack: {
    name: "Washington ministerial ADU review",
    type: "ministerial",
    basis: "Typical administrative review.",
  },
  stages: [
    { name: "Pre-app", description: "Check the set.", estWeeksLow: 1, estWeeksHigh: 2, status: "clear" },
    { name: "Plan review", description: "Review.", estWeeksLow: 4, estWeeksHigh: 7, status: "review" },
  ],
  totalEstWeeksLow: 5,
  totalEstWeeksHigh: 9,
  recommendedNextSteps: ["Confirm utilities.", "Prepare plans.", "Submit."],
  disclaimer: "Planning estimate only.",
};

describe("projectBriefDef", () => {
  it("accepts the unified payload and rejects missing parcel data", () => {
    expect(projectBriefDef.validateInput(validInput()).ok).toBe(true);
    expect(projectBriefDef.validateInput({ config: {}, result: {} }).ok).toBe(false);
  });

  it.each([undefined, 42, "   "])(
    "rejects an invalid parcel address before building context (%p)",
    (address) => {
      const input = validInput();
      expect(
        projectBriefDef.validateInput({
          ...input,
          parcel: { ...input.parcel, address },
        }).ok,
      ).toBe(false);
    },
  );

  it("rejects oversized parcel strings and validates LLM output shape", () => {
    const input = validInput();
    expect(
      projectBriefDef.validateInput({
        ...input,
        parcel: { ...input.parcel, city: "c".repeat(121) },
      }).ok,
    ).toBe(false);
    expect(
      projectBriefDef.validateInput({
        ...input,
        parcel: { ...input.parcel, address: "a".repeat(241) },
      }).ok,
    ).toBe(false);
    expect(projectBriefDef.validateOutput!(fullBrief)).toEqual(fullBrief);
    expect(() =>
      projectBriefDef.validateOutput!({ ...fullBrief, risks: [] }),
    ).toThrow(/invalid project brief/i);
  });

  it("requires the permit tools in a deterministic order", () => {
    expect(projectBriefDef.requiredToolSequence).toEqual([
      "lookup_permit_tracks",
      "get_stage_benchmarks",
    ]);
  });

  it("looks up the jurisdiction and its stage benchmarks", async () => {
    const ctx = projectBriefDef.buildContext(validInput());
    const lookup = projectBriefDef.tools.find((tool) => tool.name === "lookup_permit_tracks")!;
    const tracks = (await lookup.execute({}, ctx)) as {
      tracks: Array<{ id: string; type: string }>;
    };
    expect(tracks.tracks[0].type).toBe("ministerial");

    const benchmarks = projectBriefDef.tools.find(
      (tool) => tool.name === "get_stage_benchmarks",
    )!;
    const stages = (await benchmarks.execute({ trackId: tracks.tracks[0].id }, ctx)) as {
      stages: unknown[];
    };
    expect(stages.stages.length).toBeGreaterThan(0);
  });

  it("recovers the state from a full address when live parcel city is city-only", async () => {
    const input = validInput();
    const cityOnlyInput = {
      ...input,
      parcel: {
        ...input.parcel,
        address: "1600 Pennsylvania Avenue, Seattle, WA 98115",
        city: "Seattle",
      },
    };
    const ctx = projectBriefDef.buildContext(cityOnlyInput);
    const lookup = projectBriefDef.tools.find((tool) => tool.name === "lookup_permit_tracks")!;
    const out = (await lookup.execute({}, ctx)) as { tracks: Array<{ type: string }> };

    expect(out.tracks[0].type).toBe("ministerial");
  });

  it("uses parcel.state to form jurisdiction when state is available", async () => {
    const input = validInput();
    const sanJoseInput = {
      ...input,
      parcel: {
        ...input.parcel,
        address: "141 N Almaden Blvd",
        city: "San Jose",
        state: "CA",
        zip: "95110",
      },
    };
    const ctx = projectBriefDef.buildContext(sanJoseInput);
    expect(ctx.jurisdiction).toBe("San Jose, CA");

    const lookup = projectBriefDef.tools.find((tool) => tool.name === "lookup_permit_tracks")!;
    const out = (await lookup.execute({}, ctx)) as {
      tracks: Array<{ id: string; type: string }>;
    };

    expect(out.tracks[0].id).toBe("ca-state-adu-ministerial");
    expect(out.tracks[0].type).toBe("ministerial");
  });
});

describe("redactBriefToPreview", () => {
  it("keeps the narrative hook and replaces the paid depth with honest counts", () => {
    const preview = redactBriefToPreview(fullBrief);

    expect(preview.headline).toBe(fullBrief.headline);
    expect(preview.summary).toBe(fullBrief.summary);
    expect(preview.permitTrack).toEqual({
      name: fullBrief.permitTrack.name,
      type: fullBrief.permitTrack.type,
    });
    expect(preview.totalEstWeeksLow).toBe(5);
    expect(preview.totalEstWeeksHigh).toBe(9);
    expect(preview.firstRisk).toEqual(fullBrief.risks[0]);
    expect(preview.locked).toEqual({ riskCount: 3, stageCount: 2, nextStepCount: 3 });
    expect(preview.disclaimer).toBe(fullBrief.disclaimer);

    // The paid depth must not leak into the preview payload.
    const serialized = JSON.stringify(preview);
    expect(serialized).not.toContain(fullBrief.permitTrack.basis);
    expect(serialized).not.toContain(fullBrief.bestFit);
    expect(serialized).not.toContain("Plan review");
    expect(serialized).not.toContain("Prepare plans.");
  });

  it("surfaces the most severe risk even when the model lists it later", () => {
    // The output schema does not enforce risk ordering — a high risk buried
    // mid-list must still be the one the preview shows.
    const preview = redactBriefToPreview({
      ...fullBrief,
      risks: [
        { label: "Coverage", level: "medium", explanation: "Near the cap." },
        { label: "Sewer capacity", level: "high", explanation: "Lateral may need upsizing." },
        { label: "Height", level: "low", explanation: "Within the envelope." },
      ],
    });
    expect(preview.firstRisk.label).toBe("Sewer capacity");

    // Equal severity: the model's own first ordering wins.
    const tied = redactBriefToPreview({
      ...fullBrief,
      risks: [
        { label: "First medium", level: "medium", explanation: "A." },
        { label: "Second medium", level: "medium", explanation: "B." },
      ],
    });
    expect(tied.firstRisk.label).toBe("First medium");
  });

  it("substitutes a safe first risk when the brief has none", () => {
    const preview = redactBriefToPreview({ ...fullBrief, risks: [] });
    expect(preview.firstRisk.label).toBe("Feasibility review");
    expect(preview.locked.riskCount).toBe(0);
  });
});

describe("projectBriefDef.finalize", () => {
  beforeEach(() => {
    purchases.hasCertificate.mockReset();
  });

  it("returns the full tier for a verified certificate purchaser", async () => {
    purchases.hasCertificate.mockResolvedValue(true);
    const input = validInput();

    const response = await projectBriefDef.finalize!(fullBrief, { uid: "buyer-1", input });

    expect(purchases.hasCertificate).toHaveBeenCalledWith(
      "buyer-1",
      certificateKey(input.parcel),
    );
    expect(response).toEqual({ tier: "full", brief: fullBrief });
  });

  it("returns the redacted preview for a signed-in non-purchaser", async () => {
    purchases.hasCertificate.mockResolvedValue(false);

    const response = await projectBriefDef.finalize!(fullBrief, {
      uid: "browser-1",
      input: validInput(),
    });

    expect(response).toEqual({ tier: "preview", preview: redactBriefToPreview(fullBrief) });
  });

  it("degrades to the preview tier when the purchase ledger read fails", async () => {
    purchases.hasCertificate.mockRejectedValue(new Error("firestore down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = (await projectBriefDef.finalize!(fullBrief, {
      uid: "buyer-2",
      input: validInput(),
    })) as { tier: string };

    expect(response.tier).toBe("preview");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("projectBriefDef.authorize", () => {
  beforeEach(() => {
    purchases.hasCertificate.mockReset();
  });

  it("allows anonymous checkout sessions only when they hold a certificate for the parcel", async () => {
    const input = validInput();
    purchases.hasCertificate.mockResolvedValueOnce(true);
    await expect(
      projectBriefDef.authorize!(input, { uid: "anon-1", isAnonymous: true }),
    ).resolves.toBeNull();

    purchases.hasCertificate.mockResolvedValueOnce(false);
    const denied = await projectBriefDef.authorize!(input, {
      uid: "anon-2",
      isAnonymous: true,
    });
    expect(denied?.status).toBe(403);

    purchases.hasCertificate.mockRejectedValueOnce(new Error("firestore down"));
    const failedClosed = await projectBriefDef.authorize!(input, {
      uid: "anon-3",
      isAnonymous: true,
    });
    expect(failedClosed?.status).toBe(403);
  });

  it("allows registered non-anonymous members without requiring a prior purchase", async () => {
    const input = validInput();
    await expect(
      projectBriefDef.authorize!(input, { uid: "member-1", isAnonymous: false }),
    ).resolves.toBeNull();
    expect(purchases.hasCertificate).not.toHaveBeenCalled();
  });
});
