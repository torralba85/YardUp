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
