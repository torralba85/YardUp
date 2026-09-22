/**
 * Secondary-unit designators: "Apt 4", "Ste 200", "Fl 2", "Unit B", "#3",
 * "2nd Floor". Nominatim indexes buildings, not the units inside them, so a
 * unit token makes it match nothing at all — live, "100 Pine St Fl 2, San
 * Francisco" returns zero candidates while "100 Pine St, San Francisco"
 * returns three.
 *
 * A designator must be followed by a period or whitespace, so words that only
 * start with one ("Fly Rd", "Units Way", "Ste Genevieve") are left alone. The
 * identifier is capped at four characters, so a state code before a ZIP
 * ("Miami, FL 33130") is never read as a floor.
 */
const UNIT_DESIGNATOR =
  /(?:\b(?:apt|apartment|unit|ste|suite|fl|floor|rm|room|bldg|building)(?:\.\s*|\s+)#?\s*|#\s*)(?:\d{1,4}[a-z]?|[a-z]\d{0,3})\b|\b\d{1,3}(?:st|nd|rd|th)\s+(?:fl|floor)\b/gi;

/**
 * The building address a geocoder can match: the query with secondary-unit
 * designators removed. Returns the query unchanged when stripping would leave
 * nothing to search for.
 */
export function stripUnitDesignators(query: string): string {
  const stripped = query
    .split(",")
    .map((part) => part.replace(UNIT_DESIGNATOR, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");
  return stripped || query;
}
