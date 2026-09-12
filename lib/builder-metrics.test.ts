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

  it("computes spend from unlocked leads × $49 when no ledger is provided", () => {
    const metrics = computeBuilderMetrics([
      makeItem("1", "new", true, 200000, 250000),
      makeItem("2", "interested", true, 200000, 250000),
      makeItem("3", "new", false, 200000, 250000),
    ]);
    expect(metrics.spend).toBe(98);
  });

  it("fixes the $190 overstatement by summing the unlock ledger for credit pack purchases", () => {
    // 10 unlocked leads funded by a 10-pack credit purchase at $300
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem(`lead-${i}`, "interested", true, 200000, 250000),
    );
    const ledger = [
      {
        id: "tx-pack-10",
        builderId: "b1",
        type: "purchase" as const,
        creditsChange: 10,
        amountPaid: 300,
        referenceId: "sess_10pack",
        description: "10-Lead Pack",
        createdAt: "2026-09-11T00:00:00Z",
      },
      ...items.map((item) => ({
        id: `${item.request.id}_use`,
        builderId: "b1",
        type: "unlock" as const,
        creditsChange: -1,
        amountPaid: 0, // credit unlocks deliberately record zero amount
        referenceId: item.request.id,
        description: `Unlocked Lead ${item.request.id}`,
        createdAt: "2026-09-11T00:00:00Z",
      })),
    ];

    const metrics = computeBuilderMetrics(items, ledger);
    // Unlocked count is 10, but spend reflects actual $300 paid rather than 10 × $49 ($490)
    expect(metrics.unlockedCount).toBe(10);
    expect(metrics.spend).toBe(300);
  });

  it("sums mixed ledger entries (direct unlocks and credit packs) accurately", () => {
    const items = [
      makeItem("1", "interested", true, 200000, 250000),
      makeItem("2", "interested", true, 200000, 250000),
    ];
    const ledger = [
      {
        id: "tx-pack-5",
        builderId: "b1",
        type: "purchase" as const,
        creditsChange: 5,
        amountPaid: 175,
        referenceId: "sess_5pack",
        description: "5-Lead Pack",
        createdAt: "2026-09-11T00:00:00Z",
      },
      {
        id: "tx-direct-1",
        builderId: "b1",
        type: "unlock" as const,
        creditsChange: 0,
        amountPaid: 49,
        referenceId: "lead-direct",
        description: "Unlocked Lead direct",
        createdAt: "2026-09-11T00:00:00Z",
      },
      {
        id: "tx-credit-use",
        builderId: "b1",
        type: "unlock" as const,
        creditsChange: -1,
        amountPaid: 0,
        referenceId: "1",
        description: "Unlocked Lead 1",
        createdAt: "2026-09-11T00:00:00Z",
      },
    ];

    const metrics = computeBuilderMetrics(items, ledger);
    expect(metrics.spend).toBe(224); // 175 + 49 = 224
  });

  it("subtracts refunds when present on the ledger", () => {
    const items = [makeItem("1", "interested", true, 200000, 250000)];
    const ledger = [
      {
        id: "tx-pack-5",
        builderId: "b1",
        type: "purchase" as const,
        creditsChange: 5,
        amountPaid: 175,
        referenceId: "sess_5pack",
        description: "5-Lead Pack",
        createdAt: "2026-09-11T00:00:00Z",
      },
      {
        id: "tx-refund",
        builderId: "b1",
        type: "refund" as const,
        creditsChange: -5,
        amountPaid: 175,
        referenceId: "sess_5pack",
        description: "Refund 5-Lead Pack",
        createdAt: "2026-09-11T00:00:00Z",
      },
    ];

    const metrics = computeBuilderMetrics(items, ledger);
    expect(metrics.spend).toBe(0);
  });

  it("is all-zero for an empty inbox", () => {
    const metrics = computeBuilderMetrics([]);
    expect(metrics).toMatchObject({ total: 0, newLeadCount: 0, pipelineValue: 0, spend: 0 });
  });
});
