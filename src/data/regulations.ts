import type { JurisdictionId, RegulationGuide } from "../domain/types";

export const regulationGuides: Record<JurisdictionId, RegulationGuide> = {
  "los-angeles": {
    jurisdiction: "los-angeles",
    title: "Los Angeles ADU starter guide",
    summary:
      "City of Los Angeles ADU review is handled through LADBS with state ADU law as the baseline. Confirm zoning, fire access, utility, and plan requirements before relying on feasibility.",
    permitSteps: [
      "Confirm the parcel is inside City of Los Angeles and not a different LA County jurisdiction.",
      "Select ADU type: detached, attached, garage conversion, JADU, or movable tiny house where allowed.",
      "Prepare site plan, floor plan, elevations, structural notes, energy documents, and utility details.",
      "Submit through LADBS or the current electronic plan review pathway.",
      "Resolve plan-check comments, pay fees, and schedule required inspections after permit issuance.",
    ],
    blockers: [
      "Hillside, fire severity, coastal, historic, or easement conditions can add constraints.",
      "Unpermitted prior work can affect scope and inspection requirements.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      { label: "LADBS ADU", url: "https://dbs.lacity.gov/adu" },
      { label: "LA City ADU portal", url: "https://adu.lacity.gov/about-adus" },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
  "san-diego": {
    jurisdiction: "san-diego",
    title: "San Diego ADU starter guide",
    summary:
      "San Diego publishes ADU resources through Planning and Development Services. The city has official guidance, permit bulletins, and open development approvals data for record research.",
    permitSteps: [
      "Confirm zoning and whether the site is in a special overlay, coastal area, or historic review area.",
      "Choose ADU or JADU scope and check whether city standard details or incentives apply.",
      "Prepare building permit plans and required development services forms.",
      "Submit through the city permitting system and respond to corrections.",
      "Track permit status and inspections through city resources.",
    ],
    blockers: [
      "Coastal, historic, or environmental overlays can affect timelines.",
      "Large datasets may need filtering before permit history can be trusted.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      {
        label: "San Diego ADU toolkit",
        url: "https://www.sandiego.gov/planning/work/housing/toolkit/accessory-dwelling-units",
      },
      {
        label: "San Diego development permits data",
        url: "https://data.sandiego.gov/datasets/development-permits/",
      },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
  "san-jose": {
    jurisdiction: "san-jose",
    title: "San Jose ADU starter guide",
    summary:
      "San Jose points homeowners to its ADU Universal Checklist, preapproved ADU resources, and city-specific permit center guidance.",
    permitSteps: [
      "Use the ADU Universal Checklist to confirm lot qualification and baseline standards.",
      "Confirm whether detached ADU, JADU, or tiny home on wheels rules apply.",
      "Review preapproved plan availability and building fee estimator guidance.",
      "Prepare application materials for the permit center.",
      "Check utility metering and inspection expectations before construction.",
    ],
    blockers: [
      "Condominium conversion, rental term, utility metering, and fire separation rules can change project feasibility.",
      "Parcel-specific conditions still need city confirmation.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      {
        label: "San Jose ADU page",
        url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus",
      },
      {
        label: "San Jose ADU FAQs",
        url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/adu-faqs",
      },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
  oakland: {
    jurisdiction: "oakland",
    title: "Oakland ADU starter guide",
    summary:
      "Oakland separates guidance by single-family and multi-family conditions. Category selection matters because converted space and new detached structures follow different paths.",
    permitSteps: [
      "Confirm whether the property is single-family or multi-family.",
      "Choose JADU, category one conversion, or category two new construction.",
      "Create or use an Online Permit Center account for records and submissions.",
      "Prepare the applicable worksheets, site plan, and building documents.",
      "Submit for planning/building review and track corrections through the permit portal.",
    ],
    blockers: [
      "Short-term rental limits, rear-yard conditions, and existing non-habitable space rules can affect project scope.",
      "Multi-family ADU counts and categories need careful review.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      {
        label: "Oakland single-family ADU",
        url: "https://www.oaklandca.gov/Planning-Building/Your-Residential-Projects-Permits/Single-Family-Accessory-Dwelling-Units-ADUs",
      },
      {
        label: "Oakland multi-family ADU",
        url: "https://www.oaklandca.gov/services/apply-for-multi-family-accessory-dwelling-units-adus",
      },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
  sacramento: {
    jurisdiction: "sacramento",
    title: "Sacramento ADU starter guide",
    summary:
      "Sacramento provides an ADU Resource Center and permit-ready plan resources. Site-specific planning and building review still apply.",
    permitSteps: [
      "Confirm parcel location inside City of Sacramento.",
      "Review ADU Resource Center guidance and permit-ready plan options.",
      "Check zoning, setbacks, utility, and building-code requirements.",
      "Prepare site-specific plans even when using a permit-ready design.",
      "Submit planning/building materials and complete inspections.",
    ],
    blockers: [
      "Permit-ready plans still require site-specific review.",
      "Local code section and utility conditions can affect final scope.",
    ],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      {
        label: "Sacramento ADUs",
        url: "https://www.cityofsacramento.gov/community-development/planning/housing/accessory-dwelling-units.html",
      },
      {
        label: "Sacramento preapproved ADU program",
        url: "https://www.cityofsacramento.gov/community-development/building/building-programs/preapproved-adu-program-ab1332",
      },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
};

export const jurisdictionLabels: Record<JurisdictionId, string> = {
  "los-angeles": "Los Angeles",
  "san-diego": "San Diego",
  "san-jose": "San Jose",
  oakland: "Oakland",
  sacramento: "Sacramento",
};

export function inferJurisdiction(address: string): JurisdictionId {
  const normalized = address.toLowerCase();
  if (normalized.includes("san diego")) return "san-diego";
  if (normalized.includes("san jose")) return "san-jose";
  if (normalized.includes("oakland")) return "oakland";
  if (normalized.includes("sacramento")) return "sacramento";
  return "los-angeles";
}
