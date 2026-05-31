import { buildReportText } from "./report";
import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "./feasibility";
import type { Parcel } from "./parcel-types";
import type {
  BuilderProfile,
  ConnectionSnapshot,
  OwnerContact,
  ServiceArea,
} from "./marketplace-types";

export interface OwnerContactFormInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

export type OwnerContactValidation =
  | { ok: true; contact: OwnerContact }
  | { ok: false; error: string };

export function normalizeServiceArea(city: string, state: string): ServiceArea {
  const normalizedCity = city.trim().replace(/\s+/g, " ");
  const normalizedState = state.trim().slice(0, 2).toUpperCase();

  return {
    city: toTitleCase(normalizedCity),
    state: normalizedState,
    key: `${normalizedCity.toLowerCase()}-${normalizedState.toLowerCase()}`,
  };
}

export function parseParcelCityState(value: string): ServiceArea | null {
  const [cityPart, statePart] = value.split(",");
  if (!cityPart || !statePart) return null;

  const state = statePart.trim().split(/\s+/)[0];
  if (!state) return null;

  return normalizeServiceArea(cityPart, state);
}

export function getMatchedBuilders(
  builders: BuilderProfile[],
  parcelCity: string,
): BuilderProfile[] {
  const area = parseParcelCityState(parcelCity);
  if (!area) return [];

  return builders.filter(
    (builder) =>
      builder.active &&
      builder.serviceAreas.some((serviceArea) => serviceArea.key === area.key),
  );
}

export function validateOwnerContact(
  input: OwnerContactFormInput,
): OwnerContactValidation {
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const message = input.message.trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "A valid email is required." };
  }
  if (!input.consent) {
    return { ok: false, error: "Consent is required before sharing with builders." };
  }

  return {
    ok: true,
    contact: {
      name,
      email,
      phone: phone || null,
      message: message || null,
    },
  };
}

export function buildConnectionSnapshot(input: {
  parcelKey: string;
  parcel: Parcel;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
}): ConnectionSnapshot {
  const area = parseParcelCityState(input.parcel.city);

  return {
    parcel: input.parcel,
    parcelKey: input.parcelKey,
    parcelAddress: input.parcel.address,
    parcelCity: area?.city ?? input.parcel.city,
    parcelState: area?.state ?? "",
    config: input.config,
    assumptions: input.assumptions,
    result: input.result,
    reportText: buildReportText({
      parcel: input.parcel,
      config: input.config,
      result: input.result,
    }),
  };
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
