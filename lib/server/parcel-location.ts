/**
 * Pull structured state/ZIP/county from Regrid's field aliases, stripping the
 * "County" suffix so the value keys the market index's `ST/County` rows.
 */
export function extractRegridLocation(
  fields: Record<string, string | number | undefined>,
): { state: string; zip: string; county?: string } {
  const state = String(fields.state2 ?? fields.state ?? "").trim();
  const zip = String(fields.szip5 ?? fields.zip ?? "").trim();
  const rawCounty = String(fields.county ?? fields.scounty ?? "").trim();
  const county = rawCounty ? rawCounty.replace(/\s+County$/i, "") : undefined;
  return { state, zip, county };
}

/**
 * State code for each statewide layer registered in `COUNTY_GIS_SOURCES`.
 * `parcel-location.test.ts` fails if a statewide source is registered
 * without an entry here, so the two lists cannot drift apart.
 */
const STATEWIDE_SOURCE_STATES: Record<string, string> = {
  California: "CA",
  Washington: "WA",
  "New York": "NY",
  Ohio: "OH",
  Wisconsin: "WI",
  Florida: "FL",
  Vermont: "VT",
  Nevada: "NV",
};

/**
 * Recover a two-letter state from a statewide GIS layer's own label, for the
 * paths where the Census geocoder is unavailable. Census stays authoritative
 * wherever it answers; this only fills a gap it left.
 *
 * A county-level source names no state, so it yields "" and the caller keeps
 * whatever it already had.
 */
export function inferStateFromCountySource(county: string): string {
  const match = /^(.+) \(statewide\)$/.exec(county);
  if (!match) return "";
  return STATEWIDE_SOURCE_STATES[match[1]] ?? "";
}

/**
 * Drop a statewide layer's label so it never reaches the market index as a
 * county name: "Ohio (statewide)" is a source identity, not a county, and
 * keying financials on it silently downgrades them to national averages.
 */
export function stripStatewideLabel(county: string): string {
  return county.endsWith(" (statewide)") ? "" : county;
}
