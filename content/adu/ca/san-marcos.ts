/**
 * San Marcos ADU jurisdiction content.
 *
 * Primary sources: San Marcos Municipal Code Chapter 20.410 (Accessory
 * Dwelling Units and Accessory Structures), last amended by Ord. No.
 * 2024-1551 on September 24, 2024; the Building Division's Permit-Ready ADUs
 * page; and the Permit Ready ADU (PRADU) program fact sheet and checklist
 * (fall 2024). Building and plan-check fee amounts are not published in
 * those documents, so none are quoted.
 *
 * @module adu/ca/san-marcos
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const sanMarcos: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "San Marcos",
  slug: "san-marcos",
  county: "San Diego County",
  asOf: "2026-10-24",
  metaTitle: "San Marcos ADU Rules (2026): Size, Placement & Permits",
  metaDescription:
    "San Marcos ADU rules: 850–1,000 sq ft caps, the rear half of the lot, 4 ft setbacks, design matching and permit-ready plans with 30-day review.",
  introAnswer: [
    "Yes — San Marcos allows ADUs on lots zoned for single-family, multifamily or mixed use under Municipal Code Chapter 20.410. A new ADU can be up to 850 square feet with one bedroom or 1,000 square feet with more than one. The code also caps an ADU at 50% of the main house's living area, but state law does not let a percentage push a unit below those sizes.",
    "Placement is where San Marcos is strict. A detached ADU must sit in the rear half of the lot, at least 10 feet from any other structure measured eave to eave, with 4-foot side and rear setbacks. Those rules do not bind the detached ADU state law guarantees: a new unit of up to 800 square feet with 4-foot side and rear setbacks, which is subject only to the state's own standards.",
    "Other ADUs must also look like the house, using the same or similar roofing, finishes, colors, windows and trim. The City's permit-ready ADU program offers pre-approved one-story detached plans, with a decision due within 30 days of a complete application.",
  ],
  metaSizeNote: "up to 850 sq ft with one bedroom or 1,000 sq ft with more",
  metaSetbackNote: "4 ft side and rear, in the rear half of the lot",
  metaParkingNote: "one space, waived within a half-mile walk of transit",
  glance: [
    { label: "Max size — ADU", value: "850 sq ft with one bedroom; 1,000 sq ft with more than one", note: "The code's limit of 50% of the house's living area cannot reduce either size under state law. Detached ADUs on lots of one acre or more: 1,000 sq ft maximum" },
    { label: "Max size — JADU", value: "500 sq ft, within the house or its attached garage" },
    { label: "Max height — detached", value: "16 ft; 18 ft within a half-mile walk of a major transit stop or high-quality transit corridor", note: "Plus 2 ft (20 ft total) to match the main house's roof pitch near transit. 18 ft on a lot with a multistory multifamily building" },
    { label: "Max height — attached", value: "25 ft or the zone's height limit for the main house, whichever is lower", note: "Two stories at most" },
    { label: "Location — detached", value: "Rear 50% of the lot, at least 10 ft from any structure (eave to eave)", note: "Not in the front setback or closer to the street than the house. These rules do not apply to the state-guaranteed detached ADU of up to 800 sq ft with 4 ft side and rear setbacks" },
    { label: "Rear and side setbacks", value: "4 ft", note: "None for a conversion of existing space or a rebuild in the same place and size" },
    { label: "Parking required", value: "One paved 9 × 18 ft space, which may be tandem or in a setback", note: "Waived within a half-mile walk of public transit (bus stops count), in a historic district, inside existing structures, near car share and in other listed cases. Converted garage spaces need no replacement, but existing driveway spaces must stay" },
    { label: "Design", value: "Same or similar materials, colors and features as the main house", note: "Roofing, fascia, finish, doors, windows and their proportions, garage door and architectural details. Not required for an ADU built under Gov. Code §66323, such as the 800 sq ft detached unit" },
    { label: "Rentals and sale", value: "30 days or longer; no separate sale except under Gov. Code §66341" },
    { label: "Approval type & timeline", value: "Ministerial building permit, decided within 60 days of a complete application", note: "30 days for permit-ready plans" },
  ],
  cityDiffers: [
    {
      heading: "The rear half of the lot, 10 feet from everything",
      paragraphs: [
        "San Marcos tells you where a detached ADU goes. Chapter 20.410 requires it to sit within the rear 50% of the lot, meet the zone's setbacks for a house except that side and rear setbacks need be only 4 feet, and stand at least 10 feet from any other structure on the site, measured eave to eave. It may not sit in the front setback or closer to the street than the main house.",
        "The code's exception is narrower than state law. Chapter 20.410 frees a new detached ADU of up to 800 square feet and 16 feet, with 4-foot side and rear setbacks and access to water and sewer, from the front-setback and location rules only when no other feasible location exists on the parcel. California's ADU Handbook (March 2026) says units built under Government Code §66323, including that 800 square foot detached unit, are subject only to the standards in that section and need not meet lot coverage, front setbacks or design standards. On that reading, the rear-half rule, the no-other-location test and the design-matching rule do not apply to a qualifying unit; raise it with Planning if a plan check says otherwise. Converted space and a rebuild in the same place and size need no setbacks at all.",
        "Parking can also shape the site plan. Where a space is required, it must be a paved spot at least 9 by 18 feet; it can be tandem on the driveway or in a setback, but no more than 30% of a front yard may be used for parking, and existing driveway spaces must be kept when a garage is converted. The City encourages one shared driveway for the house and the ADU. Lots in the Ridgeline Overlay Zone also follow that chapter's rules on building placement, height, architecture, color and fire fuel modification.",
      ],
    },
    {
      heading: "A 1,000 square foot ceiling and a house-matching rule",
      paragraphs: [
        "San Marcos sets its size caps at the state minimums: up to 850 square feet with one bedroom and 1,000 square feet with more than one. The code also limits an ADU to 50% of the main house's living area with a floor of 850 square feet, which read literally could hold a two-bedroom unit beside a small house to 850 square feet. State law does not allow a percentage limit to cut an ADU below 850 square feet, or 1,000 square feet with more than one bedroom, so design to the larger figure. On a lot of an acre or more, a detached ADU is capped at 1,000 square feet. The code measures gross floor area, while state law now measures interior livable space.",
        "Design is objective but strict. Every ADU must use the same building materials as the main house and repeat its roofing material and design, fascia, exterior finish, color, doors and windows, including the ratio of window width to height and of window area to wall area. If you would rather modernize, the code lets you update the main house too, as long as the ADU matches the updated house. These rules do not apply to a unit built under Government Code §66323, such as the 800 square foot detached ADU.",
      ],
    },
    {
      heading: "Utilities, fire access and the order of occupancy",
      paragraphs: [
        "Before the building permit is issued, the City must have a will-serve letter from every agency that provides utilities to the ADU, and any private sewage system needs County approval. Converted space within the house or an accessory structure needs no new utility connection. The fire sprinkler rule follows the house: sprinklers are required in the ADU only if the main house must have them, and adding an ADU does not trigger sprinklers in the house. Emergency access and fire apparatus roads must satisfy the City's Fire Marshal.",
        "Two timing rules are easy to miss. An ADU's certificate of occupancy cannot be issued before the main house's, and an ADU submitted with a new house can be held until the house is approved, though it is still reviewed ministerially.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in San Marcos",
    paragraphs: [
      "The City does not assess utility fees or capacity charges on ADUs. Its code exempts ADUs smaller than 750 square feet from public facilities fees, and state law goes slightly further: an ADU of 750 square feet of interior livable space or less pays no impact fees. Fees on larger units are proportionate to the size of the main house and are due before the building permit is issued.",
      "Other agencies bill separately. The permit-ready program checklist tells applicants to contact SDG&E, the school district and the water and sewer provider for fees or submittals that apply to them. Building permit and plan check fees are not published in the ADU documents, so ask the Building Division for an estimate.",
      "The permit-ready plans are meant to avoid initial design and review costs, but they still need a detailed site plan, stormwater forms and deferred submittals for roof trusses and solar, which may need a licensed professional.",
    ],
    bullets: [
      "City utility fees and capacity charges: none",
      "Public facilities fees: none at 750 sq ft of interior livable space or less; proportionate above; paid before the building permit",
      "SDG&E, school district, water and sewer: fees set by each agency",
      "Building permit and plan check: ask the Building Division",
      "Permit-ready plans: meant to avoid initial design and review costs; site plan, truss and solar submittals still needed",
    ],
  },
  processIntro:
    "San Marcos approves ADUs through a ministerial building permit. Under Chapter 20.410 the City decides within 60 days of a complete application when there is already a house on the lot; for permit-ready plans, it decides within 30 days. Permit-ready applications are reviewed by the Planning, Building, Land Development Engineering and Fire Prevention divisions.",
  processSteps: [
    {
      title: "Check zoning, overlays and transit distance",
      detail:
        "Use the City's zoning portal to confirm the zone and whether the lot is in the Ridgeline Overlay, and measure the walking distance to the nearest transit stop, which decides height and parking.",
    },
    {
      title: "Choose permit-ready plans or a custom design",
      detail:
        "Download the City's pre-approved one-story detached plans, which cannot be altered, or have a custom ADU designed for a standard ADU building permit. For setback, zoning or parking questions, email the Planning division.",
    },
    {
      title: "Complete the plan package",
      detail:
        "Add a detailed site plan with a vicinity map, owner information and APN, the pervious and impervious area table, land disturbance quantity, a BMP plan and the Standard Project stormwater (SWQMP) form, plus deferred roof truss and solar submittals.",
    },
    {
      title: "Contact the fire district and utilities",
      detail:
        "Ask the fire district about other requirements, including possible deferred sprinkler submittals, and contact SDG&E, the school district and the water and sewer provider. The City needs will-serve letters before it issues the permit.",
    },
    {
      title: "Submit and respond to review",
      detail:
        "Submit the building permit application. For permit-ready plans, the City approves or denies within 30 days of a complete application and again within 30 days of any resubmittal.",
    },
    {
      title: "Permit, build and inspect",
      detail:
        "Once reviews are approved and fees are paid, the permit is issued only to the property owner or a licensed California contractor. Schedule inspections through final; the ADU's certificate of occupancy follows the main house's.",
    },
  ],
  permitPortal: {
    label: "City of San Marcos — Permit-Ready ADUs (Building Division)",
    url: "https://www.sanmarcosca.gov/Business-Services/Building-Division/Permit-Ready-ADUs",
  },
  faqs: [
    {
      question: "How big can an ADU be in San Marcos?",
      answer:
        "Up to 850 square feet with one bedroom or 1,000 square feet with more than one. The code's limit of 50% of the house's living area cannot push a unit below those sizes under state law. On a lot of an acre or more, a detached ADU is capped at 1,000 square feet. A junior ADU can be up to 500 square feet.",
    },
    {
      question: "Where can I put a detached ADU on my lot in San Marcos?",
      answer:
        "Under the City's code, in the rear half of the lot, at least 10 feet from any other structure and 4 feet from the side and rear lines. A new detached ADU of up to 800 square feet with 4-foot side and rear setbacks, built under state law's guaranteed category, is not bound by those placement rules or the front setback.",
    },
    {
      question: "Do I need parking for an ADU in San Marcos?",
      answer:
        "One paved space, unless an exemption applies. No parking is required within a half-mile walk of public transit, including bus stops, in a historic district, for an ADU inside existing space, near a car share vehicle, or in the other cases the code lists. A junior ADU needs no extra parking.",
    },
    {
      question: "Does San Marcos have pre-approved ADU plans?",
      answer:
        "Yes. The Permit Ready ADU program offers pre-approved detached one-story plans that cannot be altered. You add a site plan and other site-specific items, and the City decides within 30 days of a complete application.",
    },
    {
      question: "How tall can a granny flat be in San Marcos?",
      answer:
        "16 feet for a detached ADU, or 18 feet within a half-mile walk of a major transit stop or high-quality transit corridor, plus 2 feet to match the main house's roof pitch. An attached ADU can be 25 feet or the zone's height limit for the main house, whichever is lower, and two stories at most.",
    },
    {
      question: "Does my ADU have to match my house in San Marcos?",
      answer:
        "For most ADUs, yes. An ADU must use the same building materials as the main house and repeat its roofing, fascia, finish, color, doors, windows and window proportions, though you can update the house's style instead. A detached ADU of up to 800 square feet built under state law's guaranteed category is exempt from local design standards.",
    },
    {
      question: "What fees does San Marcos charge for an ADU?",
      answer:
        "The City charges no utility fees or capacity charges. Under state law, an ADU of 750 square feet of interior livable space or less pays no impact fees, including the City's public facilities fees; larger units pay in proportion to the main house. SDG&E, the school district and the water and sewer provider set their own fees, and building permit fees come from the Building Division.",
    },
    {
      question: "Do I have to live on the property with a junior ADU in San Marcos?",
      answer:
        "The City's code says yes: either the house or the junior ADU must be owner-occupied, recorded in a deed restriction. State law changes in 2025 and 2026 narrowed JADU owner-occupancy, so ask Planning how the City applies its rule to your project. A standard ADU has no owner-occupancy rule.",
    },
  ],
  neighbors: ["escondido", "carlsbad", "san-diego-county", "encinitas", "vista"],
  sources: [
    {
      label: "San Marcos Municipal Code Chapter 20.410, Accessory Dwelling Units and Accessory Structures (Ord. No. 2024-1551)",
      url: "https://library.municode.com/ca/san_marcos/codes/code_of_ordinances?nodeId=TIT20ZO_CH20.410ACDWUNACST",
    },
    {
      label: "City of San Marcos — Permit-Ready ADUs (Building Division)",
      url: "https://www.sanmarcosca.gov/Business-Services/Building-Division/Permit-Ready-ADUs",
    },
    {
      label: "City of San Marcos Permit Ready ADU program fact sheet and checklist (fall 2024, PDF)",
      url: "https://www.sanmarcosca.gov/files/assets/city/v/1/building/documents/pradu-website-information-fall-2024.pdf",
    },
    {
      label: "City of San Marcos — Zoning Portal",
      url: "https://www.sanmarcosca.gov/Business-Services/Development/Planning/Zoning-Portal",
    },
  ],
};
