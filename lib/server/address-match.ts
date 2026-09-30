/**
 * Structured US street-address parsing and comparison, used to reconcile a
 * searched address against the situs (property) address a public parcel layer
 * publishes. Pure and dependency-light; server-only by placement.
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
  /** Situs street line, e.g. "1421 NE 88TH ST". */
  line: string;
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

const STATE_CODES = new Set(
  (
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO " +
    "MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
  ).split(" "),
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

/**
 * Parse a comma-separated US address such as
 * "1421 NE 88th St, Seattle, WA 98115, USA".
 *
 * Returns null unless the first part is a "<number> <street>" line. City,
 * state and ZIP are read from the trailing parts when present; anything that
 * cannot be read is left undefined rather than guessed.
 */
export function parseStreetAddress(text: string | undefined): StreetAddress | null {
  if (!text) return null;
  const [line, ...rest] = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!line) return null;
  const street = parseStreetLine(line);
  if (!street) return null;

  const parts = [...rest];
  while (
    parts.length > 0 &&
    /^(?:usa?|united states(?: of america)?)$/i.test(parts[parts.length - 1])
  ) {
    parts.pop();
  }

  // "WA 98115", "98115", or "WA, 98115": at most a ZIP part then a state part.
  let state: string | undefined;
  let zip: string | undefined;
  for (let pass = 0; pass < 2 && parts.length > 0; pass++) {
    const tail = /^(?:([A-Za-z]{2})(?:\s+(\d{5})(?:-\d{4})?)?|(\d{5})(?:-\d{4})?)$/.exec(
      parts[parts.length - 1],
    );
    if (!tail) break;
    if (tail[1]) {
      const code = tail[1].toUpperCase();
      if (!STATE_CODES.has(code) || state) break;
      state = code;
      zip = zip ?? tail[2];
    } else if (tail[3] && !zip) {
      zip = tail[3];
    } else {
      break;
    }
    parts.pop();
  }

  const city = parts.length > 0 ? normalizeCity(parts[parts.length - 1]) : "";
  return {
    ...street,
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zip ? { zip } : {}),
  };
}

/**
 * The comma-separated `outFields` value for an address-enriched layer: exactly
 * the allowlisted attributes and nothing else. Never `*`.
 */
export function situsOutFields(fields: SitusFieldNames): string {
  const names = [
    fields.id,
    fields.line,
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

  const rawId = read(fields.id);
  const id =
    typeof rawId === "string"
      ? rawId.trim()
      : typeof rawId === "number" && Number.isFinite(rawId) && rawId !== 0
        ? String(rawId)
        : "";
  const line = text(fields.line);
  if (!line) return null;

  const zip = /^(\d{5})/.exec(text(fields.zip) ?? "")?.[1];
  const stateText = text(fields.state)?.toUpperCase();
  const state = stateText && STATE_CODES.has(stateText) ? stateText : undefined;
  return {
    id,
    line,
    cities: fields.cities.flatMap((name) => text(name) ?? []),
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
    published.street !== requested.street
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
