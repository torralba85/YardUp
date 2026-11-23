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
    summary: "Austin HOME Phase 1 allows up to three dwellings on eligible SF-1, SF-2, and SF-3 lots. Phase 2 allows one dwelling per small lot of at least 1,800 sf and under 5,750 sf.",
    permitSteps: [
      "Confirm zoning and minimum lot area for the proposed use. Two- and three-unit projects generally require at least 5,750 sf.",
      "For duplexes and two- or three-unit uses, check 40% building coverage, 45% impervious cover, and base-zone height limits. Check the separate standards for small-lot single-family use.",
      "Verify building-code (IRC/IBC) fire-rating and wall-opening spacing between structures (the prior 10-foot zoning separation rule was repealed).",
    ],
    blockers: [
      "Protected heritage trees (19 inches or greater in diameter).",
      "Floor-area ratio limits within the Subchapter F area and any applicable deed restrictions.",
    ],
    verifiedAt: "2026-11-23",
    confidence: "high",
    citations: [
      { label: "Austin HOME Amendments", url: "https://www.austintexas.gov/development-services/home-amendments" }
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
    summary: "San Diego Municipal Code § 141.0302 generally allows new attached and detached ADUs from 150 to 1,200 sf and JADUs up to 500 sf. Interior side and rear setbacks depend on fire zone, height, and adjoining use.",
    permitSteps: [
      "Check the Coastal Overlay Zone, fire hazard, and Transit Priority Area maps. Confirm which rules are certified for coastal parcels.",
      "Outside High and Very High Fire Hazard Severity Zones, there is generally no minimum interior side or rear setback. For ADUs over 16 ft along an adjoining residential property line, use 4 ft or the base-zone minimum, whichever is less.",
      "Submit architectural, structural, Title 24 energy, and soils documents per Development Services Information Bulletin 400 and check fees in IB-501.",
    ],
    blockers: [
      "In the Coastal Overlay Zone, check whether the project requires a Coastal Development Permit. Qualifying projects can receive a City-issued Coastal Development Permit, and some projects are exempt.",
      "High and Very High Fire Hazard Severity Zones require at least 4 ft for interior side and rear setbacks. The Fire Code Official may require greater setbacks. Check bonus-program eligibility separately in RS-1-1 through RS-1-4 and RS-1-8 through RS-1-11.",
    ],
    verifiedAt: "2026-11-23",
    confidence: "high",
    citations: [
      { label: "San Diego Development Services Information Bulletin 400", url: "https://www.sandiego.gov/development-services/forms-publications/information-bulletins/400" },
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
    summary: "Sacramento City Code § 17.228.105 offers local and state pathways. Choose one for the whole lot. No minimum off-street parking is required citywide.",
    permitSteps: [
      "Local option (§ 17.228.105(B)): up to two units, with a 1,200 sf combined cap for detached ADUs. Check the base-zone height limit and the City's 3-ft interior side and rear setbacks, which vary by story and distance from the front lot line.",
      "State option (§ 17.228.105(C)): on a single-unit lot, check eligibility for one conversion, one JADU, and one detached ADU up to 800 sf with 4-ft interior side and rear setbacks. Multifamily lots follow separate state rules.",
      "Check whether one of the City's free Shelf Ready plans fits the pathway you chose.",
      "Use the optional free zoning review (form CDD-0009) to check setbacks, historic-district rules, and EA-2/EA-3 overlay limits.",
      "Coordinate water, sewer (City or SASD), and SMUD electric service early, then submit building plans online.",
    ],
    blockers: [
      "Historic districts (31 districts with ADU design standards) and EA-2/EA-3 overlays (capped at one ADU).",
      "Levee setbacks, protected trees, and stormwater detention when adding over 500 sf of net new impervious area.",
    ],
    verifiedAt: "2026-11-23",
    confidence: "high",
    citations: [
      { label: "City of Sacramento ADU Resource Center", url: "https://adu.cityofsacramento.org/plan/step-1" },
      { label: "Sacramento Shelf Ready ADU Plans", url: "https://adu.cityofsacramento.org/Shelf-ready-plans" }
    ],
  },
  denver: {
    jurisdiction: "denver",
    title: "Denver ADU Starter Guide",
    summary: "Denver allows ADUs in districts that allow new single-unit dwellings. Check the zone district for permit and design standards.",
    permitSteps: [
      "Confirm residential zone district form standards. In Urban districts, detached ADUs generally sit in the rear 35% of the lot. The U-SU footprint cap is 864 sf on lots up to 7,000 sf and 1,000 sf on larger lots.",
      "In a single-unit zone district, an owner must live in the existing main house when applying for the ADU permit. This requirement does not apply when the main house and ADU are built together.",
      "Check district-specific setbacks and height limits. Urban side setbacks are 3 or 5 ft, depending on district and lot width. Rear alley setbacks depend on whether a garage door faces the alley.",
      "Prepare zoning and building permit application files for Denver Community Planning and Development (CPD).",
    ],
    blockers: [
      "Historic landmark districts, bulk-plane constraints, or HOA/covenant restrictions.",
      "Utility connection and alley access conflicts.",
    ],
    verifiedAt: "2026-11-23",
    confidence: "high",
    citations: [
      { label: "Denver CPD ADU Guide", url: "https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Community-Planning-and-Development/Plan-Review-Permits-and-Inspections/Single-Family-and-Duplex-Projects/Project-Checklists/ADU-Permits" }
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
