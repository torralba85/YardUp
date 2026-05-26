import type { ContractorProfile, JurisdictionId, QuoteRequest } from "./types";

export function getMatchedContractors(contractors: ContractorProfile[], jurisdiction: JurisdictionId) {
  if (jurisdiction === "local-review") {
    return [];
  }

  return contractors.filter((contractor) => contractor.supportedJurisdictions.includes(jurisdiction));
}

export function isDeliveredQuote(request: QuoteRequest) {
  return request.status === "sent";
}

export function isCommerciallyEligible(request: QuoteRequest) {
  return (
    request.status === "sent" &&
    request.commercialStatus === "eligible_for_builder_fee" &&
    Boolean(request.homeownerConsentAt) &&
    Boolean(request.deliveredAt)
  );
}


export function resolveContractorTier(contractorId: string): "starter" | "growth" | "premium" {
  if (contractorId === "apex-adu-builders") return "premium";
  if (contractorId === "golden-state-modular") return "growth";
  if (contractorId === "ecostudio-construction") return "starter";
  return "starter";
}

export function getIntroductionFee(tier: "starter" | "growth" | "premium" | undefined): number {
  if (!tier) return 0;
  if (tier === "premium") return 149;
  if (tier === "growth") return 99;
  if (tier === "starter") return 49;
  return 0;
}

export function deliverQuoteRequest(request: QuoteRequest): QuoteRequest {
  const tier = resolveContractorTier(request.contractorId);
  const fee = getIntroductionFee(tier);
  return {
    ...request,
    status: "sent",
    deliveredAt: new Date().toISOString(),
    commercialStatus: "eligible_for_builder_fee",
    introductionFee: fee,
    billingTier: tier,
  };
}
