import { describe, expect, it } from "vitest";

import { contractorProfiles } from "../data/contractors";
import { getMatchedContractors, isCommerciallyEligible, isDeliveredQuote } from "./marketplace";

describe("marketplace coverage and delivery", () => {
  it("does not show direct builder matches until the market is covered", () => {
    expect(getMatchedContractors(contractorProfiles, "local-review")).toEqual([]);
    expect(getMatchedContractors(contractorProfiles, "san-diego").map((builder) => builder.id)).toContain("golden-state-modular");
    expect(getMatchedContractors(contractorProfiles, "san-diego").map((builder) => builder.id)).not.toContain("apex-adu-builders");
    expect(getMatchedContractors(contractorProfiles, "denver").map((builder) => builder.id)).toContain("rocky-mountain-adus");
  });

  it("only treats delivered consented packets as commercially eligible", () => {
    expect(
      isCommerciallyEligible({
        id: "saved-1",
        projectId: "p1",
        contractorId: "c1",
        packetItems: ["ROI model"],
        status: "saved",
        commercialStatus: "not_eligible",
        createdAt: "2026-05-25T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isCommerciallyEligible({
        id: "submitted-1",
        projectId: "p1",
        contractorId: "c1",
        packetItems: ["ROI model"],
        status: "submitted",
        homeownerConsentAt: "2026-05-25T00:00:00.000Z",
        commercialStatus: "not_eligible",
        createdAt: "2026-05-25T00:00:00.000Z",
      }),
    ).toBe(false);

    const delivered = {
      id: "sent-1",
      projectId: "p1",
      contractorId: "c1",
      packetItems: ["ROI model"],
      status: "sent" as const,
      homeownerConsentAt: "2026-05-25T00:00:00.000Z",
      deliveredAt: "2026-05-25T00:00:00.000Z",
      commercialStatus: "eligible_for_builder_fee" as const,
      createdAt: "2026-05-25T00:00:00.000Z",
    };

    expect(isDeliveredQuote(delivered)).toBe(true);
    expect(isCommerciallyEligible(delivered)).toBe(true);
    expect(isCommerciallyEligible({ ...delivered, deliveredAt: undefined })).toBe(false);
  });
});
