import { describe, expect, it } from "vitest";

import { contractorProfiles } from "../data/contractors";
import { getMatchedContractors, isCommerciallyEligible, isDeliveredQuote, resolveContractorTier, getIntroductionFee, deliverQuoteRequest } from "./marketplace";

describe("marketplace coverage and delivery", () => {
  it("does not show direct builder matches until the market is covered", () => {
    expect(getMatchedContractors(contractorProfiles, "local-review")).toEqual([]);
    expect(getMatchedContractors(contractorProfiles, "san-diego").map((builder) => builder.id)).toContain("golden-state-modular");
    expect(getMatchedContractors(contractorProfiles, "san-diego").map((builder) => builder.id)).not.toContain("apex-adu-builders");
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


describe("builder pricing tiers and commission/fee logic", () => {
  it("resolves the billing tier correctly by contractor id", () => {
    expect(resolveContractorTier("apex-adu-builders")).toBe("premium");
    expect(resolveContractorTier("golden-state-modular")).toBe("growth");
    expect(resolveContractorTier("ecostudio-construction")).toBe("starter");
    expect(resolveContractorTier("unknown")).toBe("starter");
  });

  it("calculates introduction fees based on billing tier", () => {
    expect(getIntroductionFee("premium")).toBe(149);
    expect(getIntroductionFee("growth")).toBe(99);
    expect(getIntroductionFee("starter")).toBe(49);
    expect(getIntroductionFee(undefined)).toBe(0);
  });

  it("transitions a submitted quote request to sent and assigns correct commercial eligibility", () => {
    const mockRequest = {
      id: "quote-p1-c1",
      projectId: "p1",
      contractorId: "apex-adu-builders",
      status: "submitted" as const,
      packetItems: ["ROI model"],
      createdAt: "2026-05-25T12:00:00.000Z",
      homeownerConsentAt: "2026-05-25T12:00:00.000Z",
      commercialStatus: "not_eligible" as const,
    };

    const delivered = deliverQuoteRequest(mockRequest);

    expect(delivered.status).toBe("sent");
    expect(delivered.commercialStatus).toBe("eligible_for_builder_fee");
    expect(delivered.introductionFee).toBe(149);
    expect(delivered.billingTier).toBe("premium");
    expect(delivered.deliveredAt).toBeDefined();
  });
});
