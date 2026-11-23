/**
 * Curated ADU permit guidance keyed by jurisdiction.
 *
 * The first three ids (`oak-street`, `corner-lot`, `compact-lot`) double as the
 * demo parcel presets, mapping to Seattle, Portland, and Austin respectively;
 * Coyote Brush aliases the existing San Diego entry. The remainder are real
 * city jurisdictions. `local-review` is the fallback for
 * addresses that aren't mapped yet.
 *
 * @module regulations-data
 */

/** Identifier for a jurisdiction with curated permit guidance. */
export type JurisdictionId =
  | "oak-street"      // Seattle (preset mapping)
  | "corner-lot"      // Portland (preset mapping)
  | "compact-lot"     // Austin (preset mapping)
  | "los-angeles"
  | "san-diego"
  | "san-jose"
  | "oakland"
  | "sacramento"
  | "denver"
  | "local-review";

/** A labeled link to an authoritative source backing a regulation guide. */
export interface Citation {
  /** Display text for the link. */
  label: string;
  /** Destination URL of the source. */
  url: string;
}

/** Permit guidance for a single jurisdiction. */
export interface RegulationGuide {
  /** The jurisdiction this guide applies to. */
  jurisdiction: JurisdictionId;
  /** Short title shown as the guide heading. */
  title: string;
  /** One-paragraph overview of the local ADU rules. */
  summary: string;
  /** Ordered checklist of permitting steps. */
  permitSteps: string[];
  /** Conditions that may block or complicate an ADU on a given lot. */
  blockers: string[];
  /** ISO date (`YYYY-MM-DD`) the guidance was last verified. */
  verifiedAt: string;
  /** Confidence in the guidance's currency and accuracy. */
  confidence: "high" | "medium" | "low";
  /** Source citations backing the guidance. */
  citations: Citation[];
}

/** The full set of permit guides, indexed by {@link JurisdictionId}. */
export const regulationGuides: Record<JurisdictionId, RegulationGuide> = {
  "oak-street": {
    jurisdiction: "oak-street",
    title: "Seattle ADU Starter Guide",
    summary: "Seattle Department of Construction and Inspections (SDCI) rules permit up to two ADUs per residential lot (attached or detached) with no owner-occupancy or off-street parking mandate.",
    permitSteps: [
      "Confirm practical lot area and coverage (lots under ~3,200 sf often face tight setback and coverage limits for detached ADUs).",
      "Verify setbacks: detached ADUs generally require 5 feet from side and rear property lines (0 feet along an abutting alley).",
      "Limit maximum DADU size to 1,000 sf (up to 1,200 sf for 3+ bedrooms where applicable) and check Neighborhood Residential height caps.",
      "Review utility connection expectations for separate plumbing and electrical service.",
    ],
    blockers: [
      "Historic landmark districts or steep slope / environmentally critical area overlays.",
      "Utility easement conflicts along rear property lines.",
    ],
    verifiedAt: "2026-11-21",
    confidence: "high",
    citations: [
      { label: "Seattle SDCI ADU Portal", url: "https://www.seattle.gov/sdci/permits/common-projects/accessory-dwelling-units" }
    ],
  },
  "corner-lot": {
    jurisdiction: "corner-lot",
    title: "Portland ADU Starter Guide",
    summary: "Portland rules allow up to two ADUs per single-dwelling lot (at most one attached). Setbacks, building height, and design match rules are reviewed by Portland Permitting & Development (PP&D, formerly BDS).",
    permitSteps: [
      "Determine whether the ADU will be attached, detached, or a basement/interior conversion.",
      "Keep detached ADUs at or under 15 feet tall inside required setbacks, or meet Portland's design-match standards if exceeding 15 feet (up to 20 feet).",
      "Submit complete architectural and site boundary layouts to Portland Permitting & Development.",
    ],
    blockers: [
      "Design overlays in historic conservation zones.",
      "Tree preservation rules limiting footprint placement.",
    ],
    verifiedAt: "2026-11-21",
    confidence: "high",
    citations: [
      { label: "Portland Permitting & Development ADU Guide", url: "https://www.portland.gov/ppd/residential-permitting/accessory-dwelling-units" }
    ],
  },
  "compact-lot": {
    jurisdiction: "compact-lot",
    title: "Austin ADU Starter Guide",
    summary: "Under Austin's HOME Initiative, standard single-family residential lots (SF-1, SF-2, SF-3) allow up to three units by right, with small-lot subdivisions down to 1,800 sf and no zoning-mandated 10-foot separation between structures.",
    permitSteps: [
      "Confirm single-family zoning eligibility (SF-1/SF-2/SF-3) and whether you are adding units on an existing lot or using HOME small-lot rules.",
      "Check maximum building coverage (40%) and impervious cover (45%) limits.",
      "Verify building-code (IRC/IBC) fire-rating and wall-opening spacing between structures (the prior 10-foot zoning separation rule was repealed).",
    ],
    blockers: [
      "Protected heritage trees (19 inches or greater in diameter).",
      "Subchapter F (McMansion) tent/height and compatibility rules.",
    ],
    verifiedAt: "2026-11-21",
    confidence: "high",
    citations: [
      { label: "Austin Planning Department", url: "https://www.austintexas.gov/planning" }
    ],
  },
  "los-angeles": {
    jurisdiction: "los-angeles",
    title: "Los Angeles ADU Starter Guide",
    summary: "LADBS processes ADUs ministerially under California state law (Gov. Code §§ 66310–66342) and local standards, with a 60-day decision clock and no local impact fees at 750 sf of interior livable space or less.",
    permitSteps: [
      "Verify single-family or multi-family parcel designation and check for state-law stacking (conversion + detached up to 800 sf + JADU).",
      "Check eligibility for a detached ADU (up to 1,200 sf) or attached ADU (up to 50% of primary dwelling, min. 850–1,000 sf guaranteed).",
      "Verify minimum 4-foot side and rear setbacks and 750 sf interior-space impact-fee threshold.",
    ],
    blockers: [
      "Very High Fire Hazard Severity Zones requiring special construction materials and access review.",
      "Hillside grading or Coastal Zone development review overlays.",
    ],
    verifiedAt: "2026-11-21",
    confidence: "medium",
    citations: [
      { label: "LADBS ADU Portal", url: "https://dbs.lacity.gov/adu" }
    ],
  },
  "san-diego": {
    jurisdiction: "san-diego",
    title: "San Diego ADU Starter Guide",
    summary: "City of San Diego SDMC § 141.0302 permits detached and attached ADUs from 150 to 1,200 sf (JADUs up to 500 sf), with 0-foot side and rear setbacks up to 16 feet tall outside High/Very High Fire Hazard Severity Zones (4 feet over 16 feet or in fire zones).",
    permitSteps: [
      "Check Coastal Overlay Zone, High/Very High Fire Hazard Severity Zone, and Transit Priority Area maps first (2025–2026 amendments apply outside the Coastal Zone until certified).",
      "Confirm setbacks (0 ft side/rear up to 16 ft outside fire zones; 4 ft over 16 ft or in fire zones) and whether you will use City-accepted preapproved standard plans.",
      "Submit architectural, structural, Title 24 energy, and soils documents per Development Services Information Bulletin 400 and check fees in IB-501.",
    ],
    blockers: [
      "Coastal Overlay Zone parcels remain under prior certified rules and require Coastal Commission review.",
      "High/Very High Fire Hazard Severity Zones enforce 4-foot minimum setbacks at any height, and RS-1-1 through RS-1-4 / RS-1-8 through RS-1-11 bonus-program restrictions apply outside High/Highest Opportunity Areas.",
    ],
    verifiedAt: "2026-11-03",
    confidence: "high",
    citations: [
      { label: "San Diego DSD Companion & Junior Units", url: "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units" },
      { label: "San Diego Municipal Code § 141.0302", url: "https://docs.sandiego.gov/municode/MuniCodeChapter14/Ch14Art01Division03.pdf" }
    ],
  },
  "san-jose": {
    jurisdiction: "san-jose",
    title: "San Jose ADU Starter Guide",
    summary: "Choose City standards (§20.80.175) or State standards (§20.80.176); never mix them. City detached limits: 1,000 sq ft on lots up to 9,000 sq ft, 1,200 sq ft on larger lots. State new-ADU limit: 800 sq ft. No parking required.",
    permitSteps: [
      "Complete Bulletin 210; confirm City boundaries, permitted home, site hazards and the chosen standards.",
      "Check setbacks and height. City detached siting: rear yard, or 45 ft from the front property line with a 4 ft interior side setback; maximum 40% rear-yard coverage (pools excluded), with 6 ft separation from the main home. Neither rule can block an 800 sq ft ADU with 4 ft side and rear setbacks.",
      "Show every side within 150 ft of the street curb along a 4 ft clear path, and exterior walls within 600 ft of a hydrant; request a water-company letter showing 1,000 gpm at 20 psi.",
      "Submit the building-permit application through SJPermits and plans through SJePlans; resolve reviews, pay applicable fees and pass inspections.",
    ],
    blockers: [
      "Fire access or hydrant shortfalls may require a fire variance; easements, flood, geohazard and WUI conditions need site review.",
      "ADU rentals must be at least 30 days; separate sale requires condominium conversion.",
    ],
    // Bulletin 210 (updated 09/16/2026), the City ADU pages and Municipal Code
    // §20.80.175, read in Chrome (the City's site refuses automated readers);
    // see content/adu/ca/san-jose.ts.
    verifiedAt: "2026-11-03",
    confidence: "high",
    citations: [
      { label: "San Jose Bulletin 210 — ADU Universal Checklist", url: "https://www.sanjoseca.gov/home/showpublisheddocument/39038/638572568385100000" },
      { label: "San Jose ADU Project Process", url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/adu-plan-review-permit-process" },
      { label: "San Jose ADU FAQs — fire, rentals and sales", url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/adu-faqs" },
    ],
  },
  oakland: {
    jurisdiction: "oakland",
    title: "Oakland ADU Starter Guide",
    summary: "Oakland reviews ADUs ministerially under California state law (Gov. Code §§ 66310–66342) based on single-family vs. multi-family lot categories, with 4-foot side/rear setbacks and no local impact fees at 750 sf of interior livable space or less.",
    permitSteps: [
      "Verify lot type (single-family vs. duplex/multi-family) and state-law stacking rules.",
      "Confirm 4-foot side and rear setbacks and 800 sf interior-space exemption from lot coverage and FAR.",
      "Prepare site boundary, elevation, and Title 24 energy plans for Oakland Planning & Building.",
    ],
    blockers: [
      "High Fire Severity Zones, hillside/slope overlays, or short-term rental restrictions.",
      "Easement or utility accessibility limitations.",
    ],
    verifiedAt: "2026-11-21",
    confidence: "medium",
    citations: [
      { label: "Oakland Planning Services", url: "https://www.oaklandca.gov" }
    ],
  },
  sacramento: {
    jurisdiction: "sacramento",
    title: "Sacramento ADU Starter Guide",
    summary: "Sacramento City Code § 17.228.105 offers two non-mixable rulebooks: the local option (up to 2 units, 1,200 sf detached, 3-foot setbacks, zone height) or the state option (3 units including an 800 sf detached ADU, 4-foot setbacks). No minimum off-street parking is required citywide.",
    permitSteps: [
      "Choose either the City local option (§ 17.228.105(B)) or the state option (§ 17.228.105(C)) for the whole lot, or pick one of the City's free Shelf Ready plans.",
      "Use the optional free zoning review (form CDD-0009) to check setbacks, historic-district rules, and EA-2/EA-3 overlay limits.",
      "Coordinate water, sewer (City or SASD), and SMUD electric service early, then submit building plans online.",
    ],
    blockers: [
      "Historic districts (31 districts with ADU design standards) and EA-2/EA-3 overlays (capped at one ADU).",
      "Levee setbacks, protected trees, and stormwater detention when adding over 500 sf of net new impervious area.",
    ],
    verifiedAt: "2026-10-28",
    confidence: "high",
    citations: [
      { label: "City of Sacramento ADU Resource Center", url: "https://adu.cityofsacramento.org/plan/step-1.html" },
      { label: "Sacramento Shelf Ready ADU Plans", url: "https://adu.cityofsacramento.org/Shelf-ready-plans" }
    ],
  },
  denver: {
    jurisdiction: "denver",
    title: "Denver ADU Starter Guide",
    summary: "Under Denver's citywide ADU reform and Colorado HB 24-1152, ADUs are permitted by right in all residential zone districts without owner-occupancy or off-street parking minimums.",
    permitSteps: [
      "Confirm residential zone district form standards (detached ADUs typically sit in the rear 35% of the lot, capped at 864 sf on lots ≤7,000 sf or 1,000 sf on larger lots).",
      "Verify 5-foot side and rear setbacks (alley setbacks may allow 0–5 feet depending on door swing and building form) and 24-foot / 2-story height limits.",
      "Prepare zoning and building permit application files for Denver Community Planning and Development (CPD).",
    ],
    blockers: [
      "Historic landmark districts, bulk-plane constraints, or HOA/covenant restrictions.",
      "Utility connection and alley access conflicts.",
    ],
    verifiedAt: "2026-11-21",
    confidence: "high",
    citations: [
      { label: "Denver CPD ADU Guide", url: "https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Community-Planning-and-Development/Denver-Zoning-Code/Accessory-Dwelling-Units" }
    ],
  },
  "local-review": {
    jurisdiction: "local-review",
    title: "Local Rules Verification Needed",
    summary: "LotFoundry can estimate financials here, but local zoning and permit database details are not linked yet.",
    permitSteps: [
      "Verify permitting guidelines with your local planning department.",
      "Check local setback, coverage, and height limits.",
      "Consult a licensed design professional.",
    ],
    blockers: [
      "Local municipal zoning policies not fully mapped in the system.",
    ],
    verifiedAt: "2026-11-21",
    confidence: "low",
    citations: [],
  },
};

/**
 * Infer the best-matching jurisdiction from a free-form address string.
 *
 * Real city names are matched first so that a searched address always wins over
 * the demo street aliases (e.g. "1 Oak Street, Los Angeles" resolves to
 * `los-angeles`, not the Seattle `oak-street` preset). Returns `local-review`
 * when nothing matches.
 *
 * @param address - The address or city text to classify (case-insensitive).
 * @returns The matched {@link JurisdictionId}, or `"local-review"` as fallback.
 */
export function inferJurisdiction(address: string): JurisdictionId {
  const normalized = address.toLowerCase();
  // Real city names first — the demo street aliases below must never shadow
  // a searched address's actual jurisdiction (e.g. "1 Oak Street, Los Angeles").
  if (normalized.includes("seattle")) return "oak-street";
  if (normalized.includes("portland")) return "corner-lot";
  if (normalized.includes("austin")) return "compact-lot";
  if (normalized.includes("los angeles")) return "los-angeles";
  if (normalized.includes("san diego")) return "san-diego";
  if (normalized.includes("san jose")) return "san-jose";
  if (normalized.includes("oakland")) return "oakland";
  if (normalized.includes("sacramento")) return "sacramento";
  if (normalized.includes("denver")) return "denver";
  // Demo preset street aliases (preset `address` fields carry no city).
  if (normalized.includes("oak street")) return "oak-street";
  if (normalized.includes("linden")) return "corner-lot";
  if (normalized.includes("mesa court")) return "compact-lot";
  if (normalized.includes("coyote brush")) return "san-diego";
  return "local-review";
}
