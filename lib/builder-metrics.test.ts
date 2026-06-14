import { describe, expect, it } from "vitest";
import { computeBuilderMetrics } from "./builder-metrics";
import type { BuilderInboxItem, BuilderResponseStatus } from "./marketplace-types";

function makeItem(
  id: string,
  status: BuilderResponseStatus,
  unlocked: boolean,
  buildBandLow: number,
  buildBandHigh: number,
): BuilderInboxItem {
  return {
    request: {
      id,
      ownerUid: "owner",
      preview: {
        neighborhood: "Seattle, WA",
        zip: "98115",
        state: "WA",
        lotSqft: 5000,
        config: {
          footprint: 600,
          width: 20,
          length: 30,
          height: 12,
          roof: "shed",
          finish: "cedar",
          includeOpenings: true,
        },
        aduSqft: 600,
        buildBandLow,
        buildBandHigh,
        rentBand: 2000,
        paybackYears: 15,
        zoningStatus: "Compliant",
        matchReasons: [],
        previewSerial: `LF-${id}`,
      },
      matchedBuilderIds: ["b1"],
      status: "submitted",
      ownerVerified: true,
      headStartUntil: null,
      createdAt: null,
      updatedAt: null,
    },
    response: { builderId: "b1", status, createdAt: null, updatedAt: null },
    unlocked,
  };
}

describe("computeBuilderMetrics", () => {
  it("counts each triage status and unlocked leads", () => {
    const metrics = computeBuilderMetrics([
      makeItem("1", "new", false, 200000, 250000),
      makeItem("2", "new", true, 300000, 350000),
      makeItem("3", "interested", true, 100000, 150000),
      makeItem("4", "not-a-fit", false, 100000, 150000),
    ]);

    expect(metrics.total).toBe(4);
    expect(metrics.newLeadCount).toBe(2);
    expect(metrics.interestedCount).toBe(1);
    expect(metrics.archivedCount).toBe(1);
    expect(metrics.unlockedCount).toBe(2);
  });

  it("sums pipeline value from NEW-lead build midpoints only", () => {
    const metrics = computeBuilderMetrics([
      makeItem("1", "new", false, 200000, 250000), // mid 225000
      makeItem("2", "new", false, 300000, 350000), // mid 325000
      makeItem("3", "interested", false, 999000, 999000), // excluded
    ]);
    expect(metrics.pipelineValue).toBe(550000);
  });

  it("computes spend from unlocked leads × $49", () => {
    const metrics = computeBuilderMetrics([
      makeItem("1", "new", true, 200000, 250000),
      makeItem("2", "interested", true, 200000, 250000),
      makeItem("3", "new", false, 200000, 250000),
    ]);
    expect(metrics.spend).toBe(98);
  });

  it("is all-zero for an empty inbox", () => {
    const metrics = computeBuilderMetrics([]);
    expect(metrics).toMatchObject({ total: 0, newLeadCount: 0, pipelineValue: 0, spend: 0 });
  });
});
