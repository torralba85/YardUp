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

export interface Citation {
  label: string;
  url: string;
}

export interface RegulationGuide {
  jurisdiction: JurisdictionId;
  title: string;
  summary: string;
  permitSteps: string[];
  blockers: string[];
  verifiedAt: string;
  confidence: "high" | "medium" | "low";
  citations: Citation[];
}

export const regulationGuides: Record<JurisdictionId, RegulationGuide> = {
  "oak-street": {
    jurisdiction: "oak-street",
    title: "Seattle ADU Starter Guide",
    summary: "Seattle Community Planning and Development rules permit detached accessory dwelling units (DADUs) in residential zones where lot coverage allows.",
    permitSteps: [
      "Confirm lot size is at least 3,200 sf for detached ADUs.",
      "Verify setbacks: ADUs must be at least 5 feet from side and rear property lines.",
      "Limit maximum ADU size to 1,000 sf.",
      "Review utility connection expectations for separate plumbing.",
    ],
    blockers: [
      "Historic landmark districts or steep slope overlays.",
      "Utility easement conflicts along rear property lines.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "Seattle DADU Portal", url: "https://www.seattle.gov/sdci" }
    ],
  },
  "corner-lot": {
    jurisdiction: "corner-lot",
    title: "Portland ADU Starter Guide",
    summary: "Portland rules allow up to two ADUs per lot. Setbacks, building height, and design matches are reviewed by Portland Bureau of Development Services.",
    permitSteps: [
      "Determine if the ADU will be attached, detached, or a basement conversion.",
      "Confirm detached ADU matches the style of the main house if exceeding 15 feet in height.",
      "Submit complete architectural and site boundary layouts to BDS.",
    ],
    blockers: [
      "Design overlays in historic conservation zones.",
      "Tree preservation rules limiting footprint placement.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "Portland BDS ADU Guide", url: "https://www.portland.gov/bds" }
    ],
  },
  "compact-lot": {
    jurisdiction: "compact-lot",
    title: "Austin ADU Starter Guide",
    summary: "Austin zoning laws permit secondary dwelling units (ADUs) on residential lots meeting lot size and impervious cover standards.",
    permitSteps: [
      "Ensure lot size is at least 5,750 sf for R-1 lots (unless small-lot rules apply).",
      "Check maximum building coverage (40%) and impervious cover (45%) limits.",
      "Verify 10-foot separation from the main dwelling structure.",
    ],
    blockers: [
      "Protected heritage trees (19 inches or greater in diameter).",
      "McMansion ordinance height limit compliance.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "Austin Planning Department", url: "https://www.austintexas.gov/planning" }
    ],
  },
  "los-angeles": {
    jurisdiction: "los-angeles",
    title: "Los Angeles ADU Starter Guide",
    summary: "LADBS processes ADUs under statewide California exemptions. Standards allow for streamlined approvals.",
    permitSteps: [
      "Verify single-family or multi-family parcel designation.",
      "Check eligibility for detached ADU (up to 1,200 sf) or attached ADU (up to 50% of main house size).",
      "Verify minimum 4-foot side and rear setbacks.",
    ],
    blockers: [
      "Very High Fire Hazard Severity Zones requiring special construction materials.",
      "Hillside grading or coastal development review overlays.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      { label: "LADBS ADU Portal", url: "https://dbs.lacity.gov/adu" }
    ],
  },
  "san-diego": {
    jurisdiction: "san-diego",
    title: "San Diego ADU Starter Guide",
    summary: "San Diego publishes ADU resources through Planning and Development Services, focusing on zoning incentives.",
    permitSteps: [
      "Identify transit priority areas for parking requirement exemptions.",
      "Confirm if building under San Diego preapproved standard plans.",
      "Submit architectural, structural, and energy compliance documents.",
    ],
    blockers: [
      "Coastal overlay zones requiring CA Coastal Commission review.",
      "Historic overlays requiring planning approvals.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "San Diego ADU Toolkit", url: "https://www.sandiego.gov/planning" }
    ],
  },
  "san-jose": {
    jurisdiction: "san-jose",
    title: "San Jose ADU Starter Guide",
    summary: "San Jose utilizes the ADU Universal Checklist to streamline review and preapproved builder configurations.",
    permitSteps: [
      "Cross-check lot with the ADU Universal Checklist.",
      "Verify maximum detached ADU size limits (up to 1,000 sf).",
      "Prepare plans for planning division submission.",
    ],
    blockers: [
      "Condominium conversion rules or rental restrictions.",
      "Utility metering conflicts.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      { label: "San Jose ADU Portal", url: "https://www.sanjoseca.gov" }
    ],
  },
  oakland: {
    jurisdiction: "oakland",
    title: "Oakland ADU Starter Guide",
    summary: "Oakland reviews ADUs based on single-family vs. multi-family structure categories.",
    permitSteps: [
      "Verify lot type (single-family vs. duplex/multi-family).",
      "Confirm setback exemptions (typically 4-foot rear/side).",
      "Prepare site boundary and elevation plans.",
    ],
    blockers: [
      "Rear yard coverage limits or short-term rental bans.",
      "Easement or utility accessibility limitations.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      { label: "Oakland Planning Services", url: "https://www.oaklandca.gov" }
    ],
  },
  sacramento: {
    jurisdiction: "sacramento",
    title: "Sacramento ADU Starter Guide",
    summary: "Sacramento hosts preapproved ADU design programs to expedite permitting.",
    permitSteps: [
      "Check if using Sacramento preapproved standard plans.",
      "Verify lot setbacks and utility easement access.",
      "Submit site-specific planning permit application.",
    ],
    blockers: [
      "Historic landmark district reviews.",
      "Utility easement conflicts.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      { label: "Sacramento Planning Division", url: "https://www.cityofsacramento.gov" }
    ],
  },
  denver: {
    jurisdiction: "denver",
    title: "Denver ADU Starter Guide",
    summary: "Denver permits ADUs in residential zones that explicitly allow accessory structures.",
    permitSteps: [
      "Check if residential zone contains 'G' suffix (ADU permitted).",
      "Verify 5-foot rear setbacks and 5-foot side setbacks.",
      "Prepare zoning and building permit application files.",
    ],
    blockers: [
      "Zoning code designation does not allow accessory structures.",
      "Utility connection conflicts in alleys.",
    ],
    verifiedAt: "2026-05-25",
    confidence: "high",
    citations: [
      { label: "Denver CPD ADU Guide", url: "https://www.denvergov.org" }
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
    verifiedAt: "2026-05-25",
    confidence: "low",
    citations: [],
  },
};

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
  return "local-review";
}
