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
