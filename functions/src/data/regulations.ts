import type { JurisdictionId, RegulationGuide } from "../types";

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
      "San Diego publishes ADU resources through Planning and Development Services. Confirm overlays and use city permit resources before relying on feasibility.",
    permitSteps: [
      "Confirm zoning and whether the site is in a special overlay, coastal area, or historic review area.",
      "Choose ADU or JADU scope and check whether city standard details or incentives apply.",
      "Prepare building permit plans and required development services forms.",
      "Submit through the city permitting system and respond to corrections.",
      "Track permit status and inspections through city resources.",
    ],
    blockers: ["Coastal, historic, or environmental overlays can affect timelines."],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      {
        label: "San Diego ADU toolkit",
        url: "https://www.sandiego.gov/planning/work/housing/toolkit/accessory-dwelling-units",
      },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
  "san-jose": {
    jurisdiction: "san-jose",
    title: "San Jose ADU starter guide",
    summary:
      "San Jose points homeowners to its ADU checklist, preapproved ADU resources, and city-specific permit center guidance.",
    permitSteps: [
      "Use the ADU Universal Checklist to confirm lot qualification and baseline standards.",
      "Confirm whether detached ADU, JADU, or tiny home on wheels rules apply.",
      "Review preapproved plan availability and building fee estimator guidance.",
      "Prepare application materials for the permit center.",
      "Check utility metering and inspection expectations before construction.",
    ],
    blockers: ["Parcel-specific conditions still need city confirmation."],
    verifiedAt: "2026-05-18",
    confidence: "high",
    citations: [
      {
        label: "San Jose ADU page",
        url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus",
      },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
  oakland: {
    jurisdiction: "oakland",
    title: "Oakland ADU starter guide",
    summary:
      "Oakland separates guidance by single-family and multi-family conditions. Category selection matters before plan preparation.",
    permitSteps: [
      "Confirm whether the property is single-family or multi-family.",
      "Choose JADU, conversion, or new construction category.",
      "Use the Online Permit Center for records and submissions.",
      "Prepare applicable worksheets, site plan, and building documents.",
      "Track corrections through the permit portal.",
    ],
    blockers: ["Multi-family ADU counts and categories need careful review."],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      {
        label: "Oakland single-family ADU",
        url: "https://www.oaklandca.gov/Planning-Building/Your-Residential-Projects-Permits/Single-Family-Accessory-Dwelling-Units-ADUs",
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
    blockers: ["Permit-ready plans still require site-specific review."],
    verifiedAt: "2026-05-18",
    confidence: "medium",
    citations: [
      {
        label: "Sacramento ADUs",
        url: "https://www.cityofsacramento.gov/community-development/planning/housing/accessory-dwelling-units.html",
      },
      { label: "California HCD ADU Handbook", url: "https://www.hcd.ca.gov/building-standards/adu/handbook" },
    ],
  },
};
