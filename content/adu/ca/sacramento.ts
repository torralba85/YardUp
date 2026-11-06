/**
 * City of Sacramento ADU jurisdiction content.
 *
 * Primary sources: Sacramento City Code §17.228.105 (as amended by
 * Ord. 2026-0001), read on the City's code library on 2026-10-28; the City's
 * ADU Resource Center (Step 1 zoning table, Step 3 utilities, Step 4 fees,
 * Step 5 submittal and review times, Shelf Ready plans); and the City's
 * parking-revisions page, which records that the 2040 General Plan ended
 * minimum off-street vehicle parking citywide.
 *
 * Sacramento makes the owner choose between two rulebooks for the whole lot:
 * the City's local option (§17.228.105(B)) or the state option
 * (§17.228.105(C) and Gov. Code §66323). The two may not be combined, so the
 * page leads with that choice. The code's JADU owner-occupancy text
 * (§17.228.105(B)(3)(b)) is stricter than current state law, which requires
 * owner-occupancy only when the JADU shares sanitation; the page says so.
 *
 * @module adu/ca/sacramento
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const sacramento: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Sacramento",
  slug: "sacramento",
  county: "Sacramento County",
  asOf: "2026-10-28",
  published: "2026-10-29",
  metaTitle: "Sacramento ADU Rules (2026): Size, Setbacks & Cost",
  metaDescription:
    "Sacramento ADU rules: a 1,200 sq ft detached ADU with 3 ft setbacks, or three units under the state option. No parking minimums. See cost, rent, payback.",
  introAnswer: [
    "Yes. The City of Sacramento lets you choose between two rulebooks for the ADUs on your lot. Under the City's local option (City Code §17.228.105(B)), a single-family lot can have two ADUs, or one ADU and a junior ADU, and a detached ADU can be up to 1,200 square feet. Under the state option (§17.228.105(C) and Gov. Code §66323), you can have three: a conversion, a junior ADU and a new detached ADU of up to 800 square feet.",
    "You cannot mix the two options on one lot, so the choice sets your size, height and setbacks. The local option uses the zone's height limit (35 feet in R-1) and needs side and rear setbacks of only 3 feet. The state option caps a detached ADU at 18 feet, or 20 feet to match the house's roof pitch, with 4-foot setbacks.",
    "Parking won't decide the design. Sacramento's 2040 General Plan, adopted in February 2024, ended minimum off-street parking requirements for every property in the city.",
  ],
  metaSizeNote: "up to 1,200 sq ft detached under the City's local option",
  metaSetbackNote: "3 ft side and rear setbacks",
  metaParkingNote: "no parking minimums",
  glance: [
    { label: "Two rulebooks", value: "Choose the City's local option or the state option for the whole lot", note: "City Code §17.228.105(A): the two options may not be combined" },
    { label: "Units allowed — local option", value: "2 ADUs, or 1 ADU + 1 JADU, or 2 JADUs on a single-unit lot", note: "A duplex or multi-unit lot may have up to 2 ADUs (§17.228.105(B)(1)(a))" },
    { label: "Units allowed — state option", value: "1 conversion ADU + 1 JADU + 1 detached ADU of up to 800 sq ft", note: "Multi-unit lots: up to 8 detached ADUs (never more than the existing units) plus conversions of non-livable space (§17.228.105(C))" },
    { label: "Max size — detached", value: "Local option: 1,200 sq ft. State option: 800 sq ft", note: "Under the local option, two detached ADUs share the 1,200 sq ft between them" },
    { label: "Max size — attached", value: "50% of the house, or 850 sq ft (0–1 bedroom) / 1,000 sq ft (2+ bedrooms), whichever is greater", note: "Local option, §17.228.105(B)(2)(b)" },
    { label: "Max size — JADU", value: "500 sq ft, within the walls of the house or an attached garage" },
    { label: "Max height", value: "Local option: the zone's limit (35 ft in R-1). State option: 18 ft, or 20 ft to match the house's roof pitch" },
    { label: "Side and rear setbacks", value: "Local option: 3 ft, or the zone's setback if smaller; none for a ground floor more than 60 ft from the front property line. State option: 4 ft", note: "Upper floors always keep the 3 ft setback under the local option; street-side setbacks always apply" },
    { label: "Front setback", value: "The zone's front setback", note: "One ADU of up to 800 sq ft may sit in it when the side and rear yards can't fit an 800 sq ft ADU" },
    { label: "Parking required", value: "None", note: "Sacramento's 2040 General Plan ended off-street minimum parking requirements citywide" },
    { label: "Short-term rental", value: "Local option: allowed under the City's short-term rental rules. State option: rentals of 30 days or more", note: "Since 2026, state law bars short-term rental of any JADU (Gov. Code §66333(g))" },
    { label: "EA-2 and EA-3 overlay zones", value: "One ADU per lot", note: "City Code §17.312.060" },
  ],
  cityDiffers: [
    {
      heading: "Two rulebooks: choose one for the whole lot",
      paragraphs: [
        "Most California cities write one ADU ordinance and let state law fill the gaps. Sacramento's code instead gives you two complete options and says they may not be combined. The local option in §17.228.105(B) is the more generous one on size and setbacks: a detached ADU of up to 1,200 square feet, an attached ADU of half the house or 850 to 1,000 square feet, the zone's own height limit, and 3-foot side and rear setbacks. Its limit is the count, two units on a single-unit lot, in any mix of attached ADUs, detached ADUs and junior ADUs.",
        "The state option in §17.228.105(C) follows Government Code §66323. It allows three units on a single-unit lot, but in fixed forms: one ADU converted from space inside the house or an existing accessory structure, one JADU, and one new detached ADU of up to 800 square feet and 18 feet, or 20 feet when the roof pitch matches the house. In exchange, no other objective development or design standard in the zoning code applies, so lot coverage, open space and design standards drop away. Units approved under this option may not be rented for less than 30 days.",
        "Under the local option, the zone's lot coverage and open-space rules still apply, except to ADUs that cover less than 800 square feet in total, and the ADU must meet the objective design standards for the lot. If a standard blocks your plan, the code lets you ask for a deviation through site plan and design review under chapter 17.808.",
      ],
    },
    {
      heading: "Setbacks depend on how far back the ADU sits",
      paragraphs: [
        "Under the local option, the key measurement is 60 feet from the front property line. If any part of the ADU is within that distance, it must meet the zone's front setback and keep side and rear setbacks of 3 feet, or the zone's own setback if that is smaller. If the whole ADU is farther back, a single-story ADU, or the ground floor of a two-story one, needs no side or rear setback at all, and only the second floor and above keep the 3-foot setback. Street-side yard setbacks apply in every case.",
        "A few rules shape a backyard plan. A detached ADU must sit at least 4 feet from the house and from any other detached ADU, though two detached ADUs may be joined to each other. A balcony, deck or open-stair landing within 10 feet of a side or rear lot line cannot be more than 3 feet above the ground unless that line backs onto an alley, a street or a nonresidential use. Converting existing space or an existing accessory structure, or rebuilding one in the same place to the same size, needs no setback. No ADU may project into the required setback from the landside toe of a levee.",
        "If the side and rear yards can fit neither a two-story detached ADU of at least 800 square feet nor an attached ADU of at least 800 square feet, one ADU of up to 800 square feet may go in the front-yard setback.",
      ],
    },
    {
      heading: "Historic districts, overlay zones and the JADU owner rule",
      paragraphs: [
        "Sacramento has 31 historic districts, most of them in the urban core. ADUs are allowed in them and on landmark properties, but they must meet the City's Accessory Dwelling Unit Design Standards for Historic Properties. Lots in the EA-2 or EA-3 overlay zones may have only one ADU, under §17.312.060. The City's Land Information Lookup App shows a lot's zoning and whether it is a landmark or in a historic district.",
        "For junior ADUs, the City's code is stricter than current state law. Section 17.228.105(B)(3) still requires the property owner to live on site unless the owner is a government agency, land trust or housing organization. Since 2026, state law requires an owner in the house or the JADU only when the JADU shares bathroom facilities with the house (Gov. Code §66333(b), as HCD's March 2026 handbook explains). Either way, a deed restriction must be recorded before the final building inspection, barring separate sale of the JADU and fixing its size. Ask the Planning Division how it applies the owner rule before you plan to rent out both the house and a JADU.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in Sacramento",
    paragraphs: [
      "The City's optional zoning review costs nothing. Building plan review fees vary by project, because they include review by other City departments such as Public Works and Utilities. The remaining building permit fees are based on the project's valuation and invoiced when you pick up the permit, including inspection fees and development impact fees for schools and parks. The City publishes ADU building permit fee estimates by unit size on its ADU Resource Center.",
      "The City's ADU site says development impact fees are waived for an ADU of 749 square feet or less. State law sets the local impact-fee line at 750 square feet of interior livable space, with fees proportional to the main house above it, while school districts may charge school fees on ADUs over 500 square feet. Ask the City for an itemized estimate at your size.",
      "Utility choices change the bill. A detached ADU can tie into the house's water line or get its own service and meter, which adds an encroachment permit, a tap, a meter and development fees. An attached ADU must use the house's line. If the ADU adds more than 500 square feet of net new impervious area, the City requires stormwater detention on site. Sewer service comes from either the City or the Sacramento Area Sewer District, and SMUD provides electricity, so coordinate with both early.",
    ],
    bullets: [
      "Optional zoning review (form CDD-0009): no fee",
      "Building plan review: varies by project and reviewing department",
      "Building permit, inspection and impact fees: based on project valuation, invoiced at permit pickup",
      "Local impact fees: none at 750 sq ft of interior livable space or less under state law; proportional above",
      "School fees: allowed only above 500 sq ft of interior livable space",
      "Separate water service: encroachment permit, tap, meter and development fees, or tie into the house's line",
      "Stormwater detention: required when net new impervious area exceeds 500 sq ft",
    ],
  },
  processIntro:
    "Every ADU in Sacramento needs a building permit, and no separate planning approval is required first. The code requires a decision within 60 days of a complete application when there is already a home on the lot. The City estimates building plan review at roughly 1.5 to 2 months, not counting the time you take to answer corrections.",
  processSteps: [
    {
      title: "Check zoning, overlays and historic status",
      detail:
        "Look up the lot in the City's Land Information Lookup App: its zone sets the local-option height, and an EA-2 or EA-3 overlay, a historic district or a nearby levee each change what you can build.",
    },
    {
      title: "Choose a rulebook and a design",
      detail:
        "Decide between the local option and the state option, then design to it. Or use one of the City's free Shelf Ready detached ADU plans: a 367 sq ft studio, a 559 sq ft one-bedroom or a 747 sq ft two-bedroom, all-electric. They can be mirrored but not modified, and you add a site plan.",
    },
    {
      title: "Ask for an optional zoning review",
      detail:
        "Submit the ADU Optional Zoning Review Application (CDD-0009) to have Planning check your plan against the zoning standards before you pay for full construction drawings. It is free and takes about one to three weeks.",
    },
    {
      title: "Clear trees and utilities",
      detail:
        "Get a tree permit if the ADU requires removing a protected tree. Confirm water, sewer (City or Sacramento Area Sewer District) and SMUD electric service early, because they can shape the site plan.",
    },
    {
      title: "Submit for building plan review",
      detail:
        "Apply online. The City routes the plans to other departments; it targets 20 business days for the first review cycle, 15 for a second and 5 for a third, plus your time to respond.",
    },
    {
      title: "Pay fees, get an address and build",
      detail:
        "Pay the remaining fees when you pick up the permit, and request the new address every ADU needs, which can take up to four weeks. Schedule inspections; a JADU's deed restriction must be recorded before the final inspection.",
    },
  ],
  permitPortal: {
    label: "City of Sacramento ADU Resource Center",
    url: "https://adu.cityofsacramento.org/plan/step-1.html",
  },
  faqs: [
    {
      question: "How big can an ADU be in Sacramento?",
      answer:
        "Under the City's local option, a detached ADU can be up to 1,200 square feet and an attached ADU up to half the house or 850 to 1,000 square feet, whichever is greater. Under the state option, the new detached ADU is capped at 800 square feet. A junior ADU is capped at 500 square feet either way.",
    },
    {
      question: "Do I need parking for an ADU in Sacramento?",
      answer:
        "No. Sacramento's 2040 General Plan, adopted in February 2024, ended minimum off-street vehicle parking requirements for all properties in the city, and state law already bars replacement parking when a garage is converted.",
    },
    {
      question: "How many ADUs can I build on my lot in Sacramento?",
      answer:
        "Two under the City's local option, in any mix of ADUs and junior ADUs, or three under the state option: one converted ADU, one junior ADU and one detached ADU of up to 800 square feet. You must pick one option for the whole lot. In the EA-2 and EA-3 overlay zones the limit is one ADU.",
    },
    {
      question: "What are the ADU setbacks in Sacramento?",
      answer:
        "Under the local option, 3 feet on the side and rear, or the zone's setback if smaller, when any part of the ADU is within 60 feet of the front property line. Farther back, the ground floor needs no side or rear setback, and upper floors keep 3 feet. Under the state option, a detached ADU needs 4-foot side and rear setbacks.",
    },
    {
      question: "How tall can an ADU be in Sacramento?",
      answer:
        "Under the local option, the ADU follows the zone's height limit, which is 35 feet in the R-1 zone. Under the state option, a new detached ADU is limited to 18 feet, or 20 feet when extra height is needed to match the roof pitch of the house.",
    },
    {
      question: "Does Sacramento have free pre-approved ADU plans?",
      answer:
        "Yes. The City's Shelf Ready plans are free to use: a 367 square foot studio, a 559 square foot one-bedroom and a 747 square foot two-bedroom, all-electric and drawn to the 2022 residential code. You may mirror them but not modify them, and you add your own site plan.",
    },
    {
      question: "Can I rent my Sacramento ADU as a short-term rental?",
      answer:
        "Only an ADU approved under the City's local option, and only under the City's short-term rental rules. Units approved under the state option may not be rented for less than 30 days, and state law since 2026 bars short-term rental of any junior ADU.",
    },
    {
      question: "How long does an ADU permit take in Sacramento?",
      answer:
        "The City estimates building plan review at roughly 1.5 to 2 months, with review cycles of 20, 15 and 5 business days, not counting your time to answer corrections. The optional zoning review beforehand takes one to three weeks, and the new address can take up to four weeks.",
    },
    {
      question: "Do I have to live on the property to build a granny flat in Sacramento?",
      answer:
        "Not for an ADU: state law bars owner-occupancy requirements for standard ADUs. For a junior ADU, the City's code still requires the owner to live on site, while state law since 2026 requires it only when the JADU shares bathroom facilities with the house. Confirm with Planning before you rely on either.",
    },
  ],
  neighbors: [],
  sources: [
    {
      label: "Sacramento City Code §17.228.105: Accessory dwelling units and junior accessory dwelling units",
      url: "https://codelibrary.amlegal.com/codes/sacramentoca/latest/sacramento_ca/0-0-0-36106",
    },
    {
      label: "City of Sacramento ADU Resource Center — Step 1: Is an ADU allowed on my property?",
      url: "https://adu.cityofsacramento.org/plan/step-1.html",
    },
    {
      label: "City of Sacramento ADU Resource Center — Step 4: Costs and permit fees",
      url: "https://adu.cityofsacramento.org/design/step-4.html",
    },
    {
      label: "City of Sacramento ADU Resource Center — Step 5: Application submittal and review times",
      url: "https://adu.cityofsacramento.org/design/step-5-application-submittal.html",
    },
    {
      label: "City of Sacramento Shelf Ready ADU Plans",
      url: "https://adu.cityofsacramento.org/Shelf-ready-plans.html",
    },
    {
      label: "City of Sacramento ADU Resource Center — Utilities and stormwater",
      url: "https://adu.cityofsacramento.org/design/step-3/additional-considerations.html",
    },
    {
      label: "City of Sacramento — Parking revisions (2040 General Plan ended parking minimums)",
      url: "https://cityofsacramento.gov/community-development/planning/housing/parking-revisions",
    },
  ],
};
