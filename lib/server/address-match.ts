/**
 * Structured US street-address parsing and comparison, used to reconcile a
 * searched address against the situs (property) address a public parcel layer
 * publishes. Pure and dependency-light; also used by the client parcel handoff.
 *
 * Comparison is deliberately strict: house number, street name, directional and
 * street type must all agree after normalization, and a city, ZIP or state that
 * the layer publishes must not contradict the searched one. A near-miss is
 * treated as a different address, because a wrong parcel presented as the right
 * one is worse than an honest "no match".
 *
 * Directional and street-type normalization (NORTHEAST/NE, STREET/ST, ...) is
 * the only aliasing done here. Which attributes of a layer hold the situs
 * values is never guessed: each layer names them explicitly (see
 * {@link SitusFieldNames}).
 */
import { stripUnitDesignators } from "@/lib/server/geocode-query";

/** A searched or published street address reduced to comparable parts. */
export interface StreetAddress {
  /** Upper-case house number without leading zeros, e.g. "1421". */
  houseNumber: string;
  /** Canonical street tokens, e.g. "NE 88 ST" (directional/suffix/ordinal normalized). */
  street: string;
  /** Canonical city, when the address carries one, e.g. "SEATTLE". */
  city?: string;
  /** Two-letter state code, when the address carries one. */
  state?: string;
  /** 5-digit ZIP, when the address carries one. */
  zip?: string;
}

/**
 * The exact attribute names one address-enriched parcel layer publishes for the
 * values reconciliation needs. These are the *only* attributes ever requested
 * from such a layer (see {@link situsOutFields}): enriched county layers also
 * carry owner names and mailing addresses, which this code must never ask for.
 */
export interface SitusFieldNames {
  /** Official parcel identifier (APN/PIN). */
  id: string;
  /** Situs street line, or ordered address-part fields joined with spaces. */
  line: string | readonly string[];
  /** City-like attributes worth comparing (postal city, jurisdiction, ...). */
  cities: readonly string[];
  zip?: string;
  state?: string;
  /**
   * Lot-area attribute. Requested with the rest so a parcel found by address
   * reports the same official area a point hit does; it is never compared.
   */
  area?: string;
}

/** The identity and situs values a parcel layer publishes for one parcel. */
export interface SitusRecord {
  /** Official parcel identifier (APN/PIN); the layer's own key for the parcel. */
  id: string;
  /** The situs street line as published, e.g. "1421 NE 88TH ST". */
  line: string;
  /** Every city-like value the layer published (postal city, jurisdiction, ...). */
  cities: string[];
  /** 5-digit situs ZIP, when published. */
  zip?: string;
  /** Two-letter situs state, when published. */
  state?: string;
}

export type SitusVerdict = "match" | "locality-conflict" | "different-address";

export interface SitusComparison {
  verdict: SitusVerdict;
  /**
   * Whether the layer's own city or ZIP positively agreed with the searched
   * one. False means the layer publishes neither, so only the street line and
   * the geographic window vouch for the match.
   */
  localityConfirmed: boolean;
}

export const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const STATE_CODES = new Set(Object.keys(US_STATE_NAMES));
const STATE_NAMES_LONGEST_FIRST = Object.entries(US_STATE_NAMES).sort(
  ([, a], [, b]) => b.length - a.length,
);

const DIRECTIONALS: Record<string, string> = {
  NORTH: "N",
  SOUTH: "S",
  EAST: "E",
  WEST: "W",
  NORTHEAST: "NE",
  NORTHWEST: "NW",
  SOUTHEAST: "SE",
  SOUTHWEST: "SW",
};

/** Common USPS street-type spellings folded to their standard abbreviation. */
const STREET_TYPES: Record<string, string> = {
  ALLEY: "ALY",
  AV: "AVE",
  AVENUE: "AVE",
  BOULEVARD: "BLVD",
  CIRCLE: "CIR",
  COURT: "CT",
  COVE: "CV",
  CRESCENT: "CRES",
  DRIVE: "DR",
  EXPRESSWAY: "EXPY",
  FREEWAY: "FWY",
  HEIGHTS: "HTS",
  HIGHWAY: "HWY",
  LANE: "LN",
  PARKWAY: "PKWY",
  PLACE: "PL",
  PLAZA: "PLZ",
  ROAD: "RD",
  SQUARE: "SQ",
  STREET: "ST",
  TERRACE: "TER",
  TRAIL: "TRL",
  TURNPIKE: "TPKE",
};

/** Name words that appear both spelled out and abbreviated. */
const NAME_WORDS: Record<string, string> = {
  SAINT: "ST",
  MOUNT: "MT",
  FORT: "FT",
};

function normalizeHouseNumber(value: string): string {
  return value.toUpperCase().replace(/^0+(?=\d)/, "");
}

function streetTokens(text: string): string[] {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      const word =
        DIRECTIONALS[token] ?? STREET_TYPES[token] ?? NAME_WORDS[token] ?? token;
      // "88TH" and "88" are the same street; a layer may publish either.
      return word.replace(/^(\d+)(?:ST|ND|RD|TH)$/, "$1");
    });
}

/** Canonical city: upper case, no punctuation, "Saint"/"Mount"/"Fort" folded. */
export function normalizeCity(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((token) => NAME_WORDS[token] ?? token)
    .join(" ");
}

/** Number and street of one address line, or null when it is not "<number> <street>". */
function parseStreetLine(
  line: string,
): Pick<StreetAddress, "houseNumber" | "street"> | null {
  const match = /^\s*(\d+[A-Za-z]?)\s+(\S.*)$/.exec(stripUnitDesignators(line));
  if (!match) return null;
  const street = streetTokens(match[2]).join(" ");
  if (!street) return null;
  return { houseNumber: normalizeHouseNumber(match[1]), street };
}

interface AddressParts {
  line: string;
  city?: string;
  state?: string;
  zip?: string;
  streetReliable: boolean;
}

/** Remove trailing locality components before resolving the street/city boundary. */
function splitAddressParts(text: string): AddressParts {
  let body = stripUnitDesignators(text).trim()
    .replace(/(?:,\s*|\s+)(?:usa?|united states(?: of america)?)$/i, "").trim();
  const zipMatch = /(?:,\s*|\s+)(\d{5})(?:-\d{4})?$/.exec(body);
  const zip = zipMatch?.[1];
  if (zipMatch) body = body.slice(0, zipMatch.index).trim();

  let state: string | undefined;
  for (const [code, name] of STATE_NAMES_LONGEST_FIRST) {
    const match = new RegExp(`(?:,\\s*|\\s+)(${name}|${code})$`, "i").exec(body);
    if (!match) continue;
    // A street ending in NE has a postdirectional unless an explicit locality
    // boundary identifies a state. A trailing ZIP alone is not that boundary.
    if (!body.includes(",") && Object.values(DIRECTIONALS).includes(match[1].toUpperCase())) {
      const before = body.slice(0, match.index).trim();
      if (Object.values(STREET_TYPES).includes(streetTokens(before).at(-1) ?? "")) break;
    }
    state = code;
    body = body.slice(0, match.index).trim();
    break;
  }

  const parts = body.split(",").map((part) => part.trim()).filter(Boolean);
  const line = parts[0] ?? "";
  if (parts.length > 1) {
    return { line, city: parts.at(-1), state, zip, streetReliable: true };
  }

  const tokens = line.split(/\s+/);
  const suffixes = new Set([...Object.keys(STREET_TYPES), ...Object.values(STREET_TYPES)]);
  const ends = tokens.flatMap((word, i) => i >= 2 && suffixes.has(word.replace(/\./g, "").toUpperCase()) ? [i] : []);
  let streetEnd = ends.at(-1) ?? -1;
  if (Object.values(DIRECTIONALS).includes(tokens[streetEnd + 1]?.toUpperCase())) streetEnd += 1;
  if (streetEnd === tokens.length - 1 || tokens.length === 2) {
    return { line, state, zip, streetReliable: true };
  }
  if (ends.length === 1 && (state || zip) && streetEnd < tokens.length - 1) {
    return {
      line: tokens.slice(0, streetEnd + 1).join(" "),
      city: tokens.slice(streetEnd + 1).join(" "),
      state, zip, streetReliable: true,
    };
  }
  return { line, state, zip, streetReliable: false };
}

/** Normalize partial separators and state names only when the street boundary is reliable. */
export function delimitStreetAddress(text: string): string {
  const parts = splitAddressParts(text);
  if (!parts.streetReliable) return text;
  const country = /(?:,\s*|\s+)(usa?|united states(?: of america)?)\s*$/i.exec(text)?.[1];
  return [parts.line, parts.city, [parts.state, parts.zip].filter(Boolean).join(" "), country]
    .filter(Boolean).join(", ");
}

export interface StreetAddressParse {
  address: StreetAddress;
  /** True only for independently delimited or unambiguously parsed components. */
  confidence: Record<keyof StreetAddress, boolean>;
}

export function parseStreetAddressWithConfidence(text: string | undefined): StreetAddressParse | null {
  if (!text) return null;
  const parts = splitAddressParts(text);
  const street = parseStreetLine(parts.line);
  if (!street) return null;
  const city = parts.city ? normalizeCity(parts.city) : undefined;
  return {
    address: {
      ...street,
      ...(city ? { city } : {}),
      ...(parts.state ? { state: parts.state } : {}),
      ...(parts.zip ? { zip: parts.zip } : {}),
    },
    confidence: {
      houseNumber: true, street: parts.streetReliable, city: Boolean(city),
      state: Boolean(parts.state), zip: Boolean(parts.zip),
    },
  };
}

/**
 * Parse a US address such as "1421 NE 88th St, Seattle, WA 98115, USA".
 * Returns null unless the numbered street can be separated reliably from
 * locality. Use the confidence-aware parser to inspect ambiguous free text.
 */
export function parseStreetAddress(text: string | undefined): StreetAddress | null {
  const parsed = parseStreetAddressWithConfidence(text);
  return parsed?.confidence.street ? parsed.address : null;
}

/**
 * Whether two normalized street names are the same street. Sources split
 * compound names differently - San Diego County publishes GOLDRUSH WAY where
 * OSM and the Census publish GOLD RUSH WAY - so spacing alone never makes two
 * streets different.
 */
export function sameStreet(a: string, b: string): boolean {
  return a === b || a.replace(/ /g, "") === b.replace(/ /g, "");
}

/** Fill missing locality only after every reliably entered component agrees. */
export function enrichStreetAddress(requestedText: string, providerText: string): string {
  const requested = parseStreetAddressWithConfidence(requestedText);
  const provider = parseStreetAddress(providerText);
  if (!requested?.confidence.street || !provider) return requestedText;
  for (const key of ["houseNumber", "street", "city", "state", "zip"] as const) {
    const agrees = key === "street"
      ? sameStreet(requested.address.street, provider.street)
      : requested.address[key] === provider[key];
    if (requested.confidence[key] && !agrees) return requestedText;
  }
  const missing = ["city", "state", "zip"] as const;
  if (!missing.some((key) => !requested.address[key] && provider[key])) return requestedText;
  const entered = splitAddressParts(requestedText);
  const published = splitAddressParts(providerText);
  // Keep the entered street spelling; provider values supply only absent locality.
  return [entered.line, entered.city ?? published.city,
    [entered.state ?? published.state, entered.zip ?? published.zip].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");
}

/**
 * The comma-separated `outFields` value for an address-enriched layer: exactly
 * the allowlisted attributes and nothing else. Never `*`.
 */
export function situsOutFields(fields: SitusFieldNames): string {
  const lineFields =
    typeof fields.line === "string" ? [fields.line] : fields.line;
  const names = [
    fields.id,
    ...lineFields,
    ...fields.cities,
    fields.zip,
    fields.state,
    fields.area,
  ];
  return names
    .filter((name): name is string => typeof name === "string" && name !== "")
    .filter((name, index, all) => all.indexOf(name) === index)
    .join(",");
}

/**
 * Read a parcel's identity and situs values from a feature's attributes using
 * the layer's allowlisted field names, or null when the feature carries no
 * parcel identifier or no situs street line — without both, an address could
 * not be verified against it.
 */
export function readSitusRecord(
  attributes: Record<string, unknown> | undefined,
  fields: SitusFieldNames,
): SitusRecord | null {
  const record = readSitusFields(attributes, fields);
  return record?.id ? record : null;
}

/** Read published address facts independently of parcel identity, without inventing an ID. */
export function readSitusAddress(
  attributes: Record<string, unknown> | undefined,
  fields: SitusFieldNames,
): Omit<SitusRecord, "id"> | null {
  const record = readSitusFields(attributes, fields);
  if (!record) return null;
  const { id: _id, ...address } = record;
  void _id;
  return address;
}

function cleanSitusCity(raw: string): string {
  let city = raw.trim().replace(/(?:,\s*|\s+)\d{5}(?:-\d{4})?$/, "").trim();
  const stateSuffix = /^(.*?)[,\s]+([A-Za-z]{2})$/.exec(city);
  if (stateSuffix && STATE_CODES.has(stateSuffix[2].toUpperCase())) {
    city = stateSuffix[1].trim();
  }
  return city;
}

function readSitusFields(
  attributes: Record<string, unknown> | undefined,
  fields: SitusFieldNames,
): SitusRecord | null {
  if (!attributes || typeof attributes !== "object") return null;
  // Servers echo field names in their own case; look them up case-insensitively.
  const byName = new Map<string, unknown>();
  for (const [key, value] of Object.entries(attributes)) {
    byName.set(key.toUpperCase(), value);
  }
  const read = (name: string | undefined): unknown =>
    name ? byName.get(name.toUpperCase()) : undefined;
  const text = (name: string | undefined): string | undefined => {
    const value = read(name);
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const tokenText = (name: string | undefined): string | undefined => {
    const value = read(name);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return String(value);
    }
    return undefined;
  };

  const rawId = read(fields.id);
  const id =
    typeof rawId === "string"
      ? rawId.trim()
      : typeof rawId === "number" && Number.isFinite(rawId) && rawId !== 0
        ? String(rawId)
        : "";
  const line =
    typeof fields.line === "string"
      ? text(fields.line)
      : fields.line
          .map((part) => tokenText(part))
          .filter((part): part is string => Boolean(part))
          .join(" ") || undefined;
  if (!line) return null;

  const zip = /^(\d{5})/.exec(tokenText(fields.zip) ?? "")?.[1];
  const stateText = text(fields.state)?.toUpperCase();
  const state = stateText && STATE_CODES.has(stateText) ? stateText : undefined;
  return {
    id,
    line,
    cities: fields.cities.flatMap((name) => {
      const val = text(name);
      const cleaned = val ? cleanSitusCity(val) : "";
      return cleaned ? [cleaned] : [];
    }),
    ...(zip ? { zip } : {}),
    ...(state ? { state } : {}),
  };
}

/**
 * Compare a searched address with one parcel's published situs. The street line
 * must agree exactly (after normalization); a published city or ZIP that
 * disagrees with the searched one is a conflict, not a tolerable difference.
 */
export function compareSitus(
  requested: StreetAddress,
  situs: Omit<SitusRecord, "id">,
): SitusComparison {
  const published = parseStreetLine(situs.line);
  if (
    !published ||
    published.houseNumber !== requested.houseNumber ||
    !sameStreet(published.street, requested.street)
  ) {
    return { verdict: "different-address", localityConfirmed: false };
  }

  let localityConfirmed = false;
  // A state is too coarse to confirm anything, but a different one is a conflict.
  if (requested.state && situs.state && requested.state !== situs.state) {
    return { verdict: "locality-conflict", localityConfirmed: false };
  }
  if (requested.zip && situs.zip) {
    if (requested.zip !== situs.zip) {
      return { verdict: "locality-conflict", localityConfirmed: false };
    }
    localityConfirmed = true;
  }
  if (requested.city && situs.cities.length > 0) {
    if (!situs.cities.some((city) => normalizeCity(city) === requested.city)) {
      return { verdict: "locality-conflict", localityConfirmed: false };
    }
    localityConfirmed = true;
  }
  return { verdict: "match", localityConfirmed };
}
