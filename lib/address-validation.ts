import { parseStreetAddressWithConfidence } from "@/lib/server/address-match";

/**
 * Mandatory Google Maps Platform usage attribution ID for AI Studio.
 * Reference: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete?utm_campaign=gmp_mcp_codeassist_v1_aistudio
 */
export const GMP_SOLUTION_ATTRIBUTION_ID = "gmp_mcp_codeassist_v1_aistudio";

/**
 * Follow-up actions derived from Google Maps Platform validation verdicts.
 * Reference: https://developers.google.com/maps/documentation/address-validation/requests-validate-address?utm_campaign=gmp_mcp_codeassist_v1_aistudio
 */
export enum ValidationAction {
  ACCEPT = "ACCEPT",
  CONFIRM = "CONFIRM",
  FIX = "FIX",
  ADD_SUBPREMISES = "ADD_SUBPREMISES",
}

export type ValidationGranularity =
  | "SUB_PREMISE"
  | "PREMISE"
  | "ROUTE"
  | "LOCALITY"
  | "OTHER";

export interface AddressComponentSummary {
  streetNumber?: string;
  route?: string;
  subpremise?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
}

export interface AddressValidationResult {
  status: "deliverable" | "needs_confirmation" | "incomplete";
  action: ValidationAction;
  deliverable: boolean;
  formattedAddress: string;
  placeId?: string;
  location?: { lat: number; lng: number };
  granularity: ValidationGranularity;
  components: AddressComponentSummary;
  missingComponents: string[];
  unconfirmedComponents: string[];
  standardizedSuggestion?: string;
  message: string;
  source: "places_new" | "address_validation" | "client_heuristic";
}

export interface ClientAddressReadiness {
  hasStreetNumber: boolean;
  hasStreetName: boolean;
  hasLocalityOrState: boolean;
  hasPostalCode: boolean;
  needsUnitNumber: boolean;
  isCompleteCandidate: boolean;
  missingLabels: string[];
  summaryLabel: string;
}

/**
 * Shape accepted from either Google Maps JS SDK `Place.addressComponents`
 * or Places API (New) REST `addressComponents`.
 */
export interface PlacesAddressComponentLike {
  longText?: string | null;
  shortText?: string | null;
  types: string[];
}

export interface PlacesValidationInput {
  rawQuery?: string;
  formattedAddress: string;
  placeId?: string;
  location?: { lat: number; lng: number } | null;
  addressComponents?: PlacesAddressComponentLike[] | null;
  types?: string[] | null;
}

const SUBPREMISE_HINT_REGEX =
  /\b(?:apt|apartment|unit|ste|suite|bldg|building|fl|floor|rm|room|lot|#)\s*$/i;

/**
 * Real-time client-side readiness check as the user types an address.
 * Runs synchronously with zero network overhead to guide the user toward
 * entering a complete, deliverable US property address.
 */
export function evaluateClientInputReadiness(rawInput: string): ClientAddressReadiness {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      hasStreetNumber: false,
      hasStreetName: false,
      hasLocalityOrState: false,
      hasPostalCode: false,
      needsUnitNumber: false,
      isCompleteCandidate: false,
      missingLabels: ["street number", "street name", "city & state"],
      summaryLabel: "Enter street number, street name, city, and state",
    };
  }

  const parsed = parseStreetAddressWithConfidence(trimmed);
  const leadingNumberMatch = /^\d+[A-Za-z]?(?:\s+|$)/.exec(trimmed);
  const hasStreetNumber = Boolean(parsed.address?.houseNumber || leadingNumberMatch);

  const afterNumber = leadingNumberMatch
    ? trimmed.slice(leadingNumberMatch[0].length).trim()
    : trimmed;
  const hasStreetName = Boolean(
    parsed.address?.street || (hasStreetNumber && afterNumber.length >= 2),
  );

  const hasPostalCode = Boolean(parsed.address?.zip || /\b\d{5}(?:-\d{4})?\b/.test(trimmed));
  const hasCommaLocality = trimmed.includes(",") && trimmed.split(",")[1]?.trim().length >= 2;
  const hasLocalityOrState = Boolean(
    parsed.address?.city || parsed.address?.state || hasPostalCode || hasCommaLocality,
  );
  const needsUnitNumber = SUBPREMISE_HINT_REGEX.test(trimmed);

  const missingLabels: string[] = [];
  if (!hasStreetNumber) missingLabels.push("street number");
  if (!hasStreetName) missingLabels.push("street name");
  if (!hasLocalityOrState) missingLabels.push("city & state");
  if (needsUnitNumber) missingLabels.push("unit number");

  const isCompleteCandidate =
    hasStreetNumber && hasStreetName && hasLocalityOrState && !needsUnitNumber;

  let summaryLabel = "Ready to verify deliverable property address";
  if (!hasStreetNumber) {
    summaryLabel = "Add a street number for property-level deliverability";
  } else if (!hasStreetName) {
    summaryLabel = "Continue typing the street name";
  } else if (needsUnitNumber) {
    summaryLabel = "Finish entering the unit or suite number";
  } else if (!hasLocalityOrState) {
    summaryLabel = "Add city and state or ZIP code to confirm locality";
  }

  return {
    hasStreetNumber,
    hasStreetName,
    hasLocalityOrState,
    hasPostalCode,
    needsUnitNumber,
    isCompleteCandidate,
    missingLabels,
    summaryLabel,
  };
}

/**
 * Extracts normalized postal components from Google Places API (New)
 * `addressComponents` array.
 */
export function extractPlacesComponents(
  addressComponents?: PlacesAddressComponentLike[] | null,
): AddressComponentSummary {
  const summary: AddressComponentSummary = {};
  if (!addressComponents || addressComponents.length === 0) {
    return summary;
  }

  for (const comp of addressComponents) {
    const types = comp.types ?? [];
    const shortVal = comp.shortText?.trim() || comp.longText?.trim() || undefined;
    const longVal = comp.longText?.trim() || comp.shortText?.trim() || undefined;
    if (!shortVal && !longVal) continue;

    if (types.includes("street_number")) {
      summary.streetNumber = shortVal;
    } else if (types.includes("route")) {
      summary.route = shortVal;
    } else if (types.includes("subpremise")) {
      summary.subpremise = shortVal;
    } else if (
      types.includes("locality") ||
      (!summary.locality && (types.includes("sublocality") || types.includes("postal_town")))
    ) {
      summary.locality = longVal;
    } else if (types.includes("administrative_area_level_1")) {
      summary.administrativeArea = shortVal;
    } else if (types.includes("postal_code")) {
      summary.postalCode = shortVal;
    } else if (types.includes("country")) {
      summary.country = shortVal;
    }
  }

  return summary;
}

/**
 * Evaluates a resolved Google Places API (New) Place record for property-level
 * deliverability and accuracy.
 */
export function evaluatePlacesAddress(
  input: PlacesValidationInput,
): AddressValidationResult {
  const formattedAddress = input.formattedAddress.trim();
  const hasExplicitComponents =
    Array.isArray(input.addressComponents) && input.addressComponents.length > 0;
  const extracted = extractPlacesComponents(input.addressComponents);

  // When addressComponents are not populated (e.g. minimal Place Details fields),
  // fall back to structured parsing of formattedAddress.
  const fallbackParsed = parseStreetAddressWithConfidence(formattedAddress).address;
  const components: AddressComponentSummary = {
    streetNumber: extracted.streetNumber ?? fallbackParsed?.houseNumber,
    route: extracted.route ?? fallbackParsed?.street,
    subpremise: extracted.subpremise,
    locality: extracted.locality ?? fallbackParsed?.city,
    administrativeArea: extracted.administrativeArea ?? fallbackParsed?.state,
    postalCode: extracted.postalCode ?? fallbackParsed?.zip,
    country: extracted.country ?? "US",
  };

  const types = input.types ?? [];
  const isSubpremise = Boolean(components.subpremise) || types.includes("subpremise");
  const isPremiseType =
    isSubpremise ||
    types.includes("street_address") ||
    types.includes("premise") ||
    (types.length === 0 && Boolean(components.streetNumber && components.route));
  const isRouteOnly =
    types.includes("route") || (!components.streetNumber && Boolean(components.route));
  const isLocalityOnly =
    !components.streetNumber &&
    !components.route &&
    Boolean(components.locality || components.administrativeArea);

  let granularity: ValidationGranularity = "OTHER";
  if (isSubpremise && components.streetNumber && components.route) {
    granularity = "SUB_PREMISE";
  } else if (isPremiseType && components.streetNumber && components.route) {
    granularity = "PREMISE";
  } else if (isRouteOnly) {
    granularity = "ROUTE";
  } else if (isLocalityOnly) {
    granularity = "LOCALITY";
  }

  const missingComponents: string[] = [];
  if (!components.streetNumber) missingComponents.push("street_number");
  if (!components.route) missingComponents.push("route");
  if (hasExplicitComponents && !components.locality) missingComponents.push("locality");
  if (hasExplicitComponents && !components.administrativeArea) {
    missingComponents.push("administrative_area_level_1");
  }
  if (hasExplicitComponents && !components.postalCode) {
    missingComponents.push("postal_code");
  }

  const rawTrimmed = input.rawQuery?.trim() ?? "";
  const needsSubpremise = SUBPREMISE_HINT_REGEX.test(rawTrimmed) && !components.subpremise;
  if (needsSubpremise) {
    missingComponents.push("subpremise");
  }

  // 1. Missing street number or route means the address is not a deliverable parcel.
  if (!components.streetNumber || !components.route || granularity === "ROUTE" || granularity === "LOCALITY" || granularity === "OTHER") {
    const missingDesc = !components.streetNumber
      ? "Missing street number — enter a specific house number on this street"
      : !components.route
        ? "Missing street name — enter a complete street address"
        : "Address is too broad — enter a specific street number and street name";

    return {
      status: "incomplete",
      action: ValidationAction.FIX,
      deliverable: false,
      formattedAddress,
      placeId: input.placeId,
      location: input.location ?? undefined,
      granularity,
      components,
      missingComponents,
      unconfirmedComponents: [],
      message: missingDesc,
      source: "places_new",
    };
  }

  // 2. Trailing unit keyword without a unit number.
  if (needsSubpremise) {
    return {
      status: "needs_confirmation",
      action: ValidationAction.ADD_SUBPREMISES,
      deliverable: true,
      formattedAddress,
      placeId: input.placeId,
      location: input.location ?? undefined,
      granularity,
      components,
      missingComponents,
      unconfirmedComponents: ["subpremise"],
      standardizedSuggestion: formattedAddress,
      message: "Add the apartment or unit number, or continue with the main property parcel",
      source: "places_new",
    };
  }

  // 3. Check if raw user query had a different house number than what Places matched.
  const rawParsed = rawTrimmed ? parseStreetAddressWithConfidence(rawTrimmed).address : null;
  const houseNumberMismatch =
    Boolean(rawParsed?.houseNumber) &&
    Boolean(components.streetNumber) &&
    rawParsed!.houseNumber.toUpperCase() !== components.streetNumber.toUpperCase();

  if (houseNumberMismatch) {
    return {
      status: "needs_confirmation",
      action: ValidationAction.CONFIRM,
      deliverable: true,
      formattedAddress,
      placeId: input.placeId,
      location: input.location ?? undefined,
      granularity,
      components,
      missingComponents,
      unconfirmedComponents: ["street_number"],
      standardizedSuggestion: formattedAddress,
      message: `Confirm standardized address: ${formattedAddress}`,
      source: "places_new",
    };
  }

  const zipSuffix = components.postalCode ? ` · ${components.postalCode}` : "";
  return {
    status: "deliverable",
    action: ValidationAction.ACCEPT,
    deliverable: true,
    formattedAddress,
    placeId: input.placeId,
    location: input.location ?? undefined,
    granularity,
    components,
    missingComponents: [],
    unconfirmedComponents: [],
    standardizedSuggestion: formattedAddress,
    message: `Verified deliverable property address${zipSuffix}`,
    source: "places_new",
  };
}

/**
 * Subset of the Google Maps Platform Address Validation API `v1:validateAddress` response.
 */
export interface GoogleAddressValidationPayload {
  result?: {
    verdict?: {
      inputGranularity?: string;
      validationGranularity?: string;
      geocodeGranularity?: string;
      addressComplete?: boolean;
      hasUnconfirmedComponents?: boolean;
      hasInferredComponents?: boolean;
      hasReplacedComponents?: boolean;
    };
    address?: {
      formattedAddress?: string;
      postalAddress?: {
        regionCode?: string;
        postalCode?: string;
        administrativeArea?: string;
        locality?: string;
        addressLines?: string[];
      };
      addressComponents?: Array<{
        componentName?: { text?: string };
        componentType?: string;
        confirmationLevel?: string;
        inferred?: boolean;
        replaced?: boolean;
      }>;
      missingComponentTypes?: string[];
      unconfirmedComponentTypes?: string[];
      unresolvedTokens?: string[];
    };
    geocode?: {
      location?: { latitude?: number; longitude?: number };
      placeId?: string;
      placeTypes?: string[];
    };
    uspsData?: {
      standardizedAddress?: {
        firstAddressLine?: string;
        cityStateZipAddressLine?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        zipCodeExtension?: string;
      };
      dpvConfirmation?: string;
    };
  };
}

/**
 * Evaluates a response from `https://addressvalidation.googleapis.com/v1:validateAddress`
 * using the `suggestValidationAction` decision matrix (ACCEPT, CONFIRM, FIX, ADD_SUBPREMISES).
 */
export function evaluateGoogleAddressValidationResponse(
  payload: GoogleAddressValidationPayload,
  rawQuery: string,
): AddressValidationResult | null {
  const result = payload?.result;
  if (!result?.address?.formattedAddress) return null;

  const verdict = result.verdict ?? {};
  const addr = result.address;
  const formattedAddress = addr.formattedAddress;
  const missingComponents = addr.missingComponentTypes ?? [];
  const unconfirmedComponents = addr.unconfirmedComponentTypes ?? [];
  const componentsList = addr.addressComponents ?? [];

  const summary: AddressComponentSummary = {
    locality: addr.postalAddress?.locality,
    administrativeArea: addr.postalAddress?.administrativeArea,
    postalCode: addr.postalAddress?.postalCode,
    country: addr.postalAddress?.regionCode ?? "US",
  };

  let hasSuspicious = false;
  let hasMajorInference = false;

  for (const comp of componentsList) {
    const type = comp.componentType ?? "";
    const text = comp.componentName?.text?.trim();
    if (text) {
      if (type === "street_number") summary.streetNumber = text;
      else if (type === "route") summary.route = text;
      else if (type === "subpremise") summary.subpremise = text;
      else if (type === "locality" && !summary.locality) summary.locality = text;
      else if (type === "administrative_area_level_1" && !summary.administrativeArea) {
        summary.administrativeArea = text;
      } else if (type === "postal_code" && !summary.postalCode) {
        summary.postalCode = text;
      }
    }
    if (comp.confirmationLevel === "UNCONFIRMED_AND_SUSPICIOUS") {
      hasSuspicious = true;
    }
    if (comp.inferred && type !== "postal_code" && type !== "postal_code_suffix" && type !== "country") {
      hasMajorInference = true;
    }
  }

  const rawGranularity = verdict.validationGranularity ?? "OTHER";
  const granularity: ValidationGranularity =
    rawGranularity === "SUB_PREMISE"
      ? "SUB_PREMISE"
      : rawGranularity === "PREMISE"
        ? "PREMISE"
        : rawGranularity === "ROUTE"
          ? "ROUTE"
          : "OTHER";

  const lat = result.geocode?.location?.latitude;
  const lng = result.geocode?.location?.longitude;
  const location =
    typeof lat === "number" && typeof lng === "number" ? { lat, lng } : undefined;

  const isMissingCritical = missingComponents.some(
    (t) => t !== "subpremise" && t !== "postal_code_suffix",
  );
  const dpvConfirmed = result.uspsData?.dpvConfirmation === "Y";

  // 1. Low-quality or incomplete addresses require fixing (FIX).
  if (
    granularity === "OTHER" ||
    granularity === "ROUTE" ||
    !summary.streetNumber ||
    !summary.route ||
    isMissingCritical ||
    hasSuspicious ||
    (addr.unresolvedTokens?.length ?? 0) > 0
  ) {
    const message = !summary.streetNumber
      ? "Missing street number — enter a valid house number"
      : !summary.route
        ? "Missing street name — enter a valid street address"
        : "Address could not be verified as a deliverable property — check street and city";
    return {
      status: "incomplete",
      action: ValidationAction.FIX,
      deliverable: false,
      formattedAddress,
      placeId: result.geocode?.placeId,
      location,
      granularity,
      components: summary,
      missingComponents,
      unconfirmedComponents,
      standardizedSuggestion: formattedAddress,
      message,
      source: "address_validation",
    };
  }

  // 2. Missing US subpremise (ADD_SUBPREMISES).
  if (
    (addr.postalAddress?.regionCode === "US" || addr.postalAddress?.regionCode === "PR") &&
    missingComponents.includes("subpremise")
  ) {
    return {
      status: "needs_confirmation",
      action: ValidationAction.ADD_SUBPREMISES,
      deliverable: true,
      formattedAddress,
      placeId: result.geocode?.placeId,
      location,
      granularity,
      components: summary,
      missingComponents,
      unconfirmedComponents,
      standardizedSuggestion: formattedAddress,
      message: "Multi-unit address detected — add a unit/apt number or confirm primary parcel",
      source: "address_validation",
    };
  }

  // 3. High-quality address with component replacement or major inference (CONFIRM).
  if (verdict.hasReplacedComponents || hasMajorInference) {
    return {
      status: "needs_confirmation",
      action: ValidationAction.CONFIRM,
      deliverable: true,
      formattedAddress,
      placeId: result.geocode?.placeId,
      location,
      granularity,
      components: summary,
      missingComponents,
      unconfirmedComponents,
      standardizedSuggestion: formattedAddress,
      message: `Confirm standardized address: ${formattedAddress}`,
      source: "address_validation",
    };
  }

  // 4. Deliverable and verified (ACCEPT).
  const zipBadge = summary.postalCode ? ` · ${summary.postalCode}` : "";
  const cassLabel = dpvConfirmed ? "USPS CASS deliverable" : "Verified deliverable address";
  return {
    status: "deliverable",
    action: ValidationAction.ACCEPT,
    deliverable: true,
    formattedAddress,
    placeId: result.geocode?.placeId,
    location,
    granularity,
    components: summary,
    missingComponents,
    unconfirmedComponents,
    standardizedSuggestion: formattedAddress,
    message: `${cassLabel}${zipBadge}`,
    source: "address_validation",
  };
}
