/**
 * Imperial Beach ADU jurisdiction content.
 *
 * Primary sources: the Planning Division's Accessory Dwelling Units page
 * (zone allowances and development standards, citing Government Code
 * §§66310–66342), the handout "What Triggers a Coastal Permit for Accessory
 * Dwelling Units", and the City's pre-approved ADU plan set. Parking,
 * owner-occupancy and rental-term rules are not stated in those City
 * publications, so this page leaves them to the shared state-law block
 * instead of guessing at local text.
 *
 * @module adu/ca/imperial-beach
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const imperialBeach: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Imperial Beach",
  slug: "imperial-beach",
  county: "San Diego County",
  asOf: "2026-10-24",
  metaTitle: "Imperial Beach ADU Rules (2026): Coastal Permit & Size",
  metaDescription:
    "Imperial Beach ADU rules: 1,200 sq ft detached, 4 ft side and rear setbacks, and when a $1,000 coastal permit comes first. See what fits your lot, free.",
  introAnswer: [
    "Yes — Imperial Beach allows a new detached ADU of up to 1,200 square feet with 4-foot side and rear setbacks. In the single-family zones a lot can combine one new detached ADU, one attached ADU or conversion, and one junior ADU of up to 500 square feet.",
    "The step that sets the schedule is the coastal permit. In the Coastal Zone, a new attached or detached ADU, a conversion of a garage or storage space, and a garage-to-JADU conversion all need a Coastal Development Permit, approved before the building permit application. Where the City issues it, the permit costs a $1,000 developer fee and the City lists a 30-calendar-day review from payment.",
    "Check two maps before you design: the City's Parcel Viewer, which shows whether the City or the California Coastal Commission issues your coastal permit, and the FEMA flood map, because the City's free pre-approved ADU plan cannot be used in a Special Flood Hazard Area.",
  ],
  metaSizeNote: "up to 1,200 sq ft detached",
  metaSetbackNote: "4 ft side and rear",
  metaParkingNote: "a coastal permit first for most ADUs in the Coastal Zone",
  glance: [
    { label: "Units allowed — single-family zones", value: "One new detached ADU, plus one new attached ADU or conversion (not both), plus one JADU", note: "R-1-6000 and R-1-3800 zones; R-3000-D lists the same combination" },
    { label: "Units allowed — multifamily lots", value: "Up to 8 detached ADUs on a lot with an existing multifamily building, never more than the existing units", note: "Plus at least one ADU, and up to 25% of the units, inside the existing building. A proposed multifamily building can have up to 2 detached ADUs" },
    { label: "Max size — detached", value: "1,200 sq ft" },
    { label: "Max size — attached", value: "50% of the main residence or up to 800 sq ft, per the City's summary", note: "The state-law size floors below also apply" },
    { label: "Max size — conversion", value: "Up to 1,200 sq ft of existing space", note: "Expansion beyond the existing structure is limited to 150 sq ft, for entry and exit only" },
    { label: "Max size — JADU", value: "500 sq ft, converted from space within the house" },
    { label: "Max height — detached", value: "16 ft; 18 ft within a half-mile walk of a major transit stop or high-quality transit corridor", note: "Plus 2 ft to match the main house's roof pitch near transit. 18 ft on a lot with a multistory multifamily building" },
    { label: "Max height — attached", value: "25 ft or the zone's height limit, whichever is lower", note: "Two stories at most" },
    { label: "Rear and side setbacks", value: "4 ft" },
    { label: "Coastal permit", value: "Required in the Coastal Zone for new ADUs, conversions of garage or storage space, and garage-to-JADU conversions", note: "City administrative permit: $1,000 developer fee, 30 calendar days from payment. In the Coastal Commission's area, apply to the Commission instead" },
  ],
  cityDiffers: [
    {
      heading: "The coastal permit decides your timeline",
      paragraphs: [
        "Imperial Beach publishes a one-page answer to the question most owners here face first. In the Coastal Zone a Coastal Development Permit is required for a new attached ADU, a new detached ADU, a conversion of existing permitted space that is not habitable, such as a garage, storage room or patio cover, and a garage converted to a junior ADU. The coastal permit must be approved before the building permit application, although the City says concurrent Planning and Building processing is available if you ask staff.",
        "Who issues the permit depends on where the lot sits. In the City's online Parcel Viewer, turn on the Coastal Zone Jurisdiction theme and search your address or parcel number. A green lot gets an administrative coastal permit from the City. A red lot also applies to the City, but the Coastal Commission can appeal the City's decision. A blue lot is in the Commission's own jurisdiction, so the permit comes from the Commission, not the City.",
        "For a City-issued permit, the handout lists a $1,000 developer fee, with more due if the project needs several reviews, and a review time of 30 calendar days from payment. You apply through the City's online permit portal under Apply, Plans, Land Use – Administrative Level, uploading the plan set (site, landscaping, existing and proposed floor plans, elevations and roof plan), the grant deed, a preliminary title report dated within 90 days, and the Discretionary Permit Application package. A public notice package is then dropped off at Community Development on Monday through Thursday mornings or late afternoons.",
      ],
    },
    {
      heading: "The pre-approved plan, flood zones and building 4 feet from the line",
      paragraphs: [
        "The City has pre-approved a one-bedroom detached ADU plan set that owners can use instead of commissioning a custom design. Read its cover sheet before you rely on it. It states that the plans cannot be used for a project in a FEMA Special Flood Hazard Area, and its code list cites the 2019 California building codes, so ask the Building Division what the current code cycle changes before you submit.",
        "The plan set's notes also show what a 4-foot setback means in practice. Without fire sprinklers, an exterior wall within 5 feet of the property line needs a one-hour fire rating, openings such as windows are limited to 25% of that wall, and no openings are allowed within 3 feet of the line. Projections such as roof overhangs are not allowed within 2 feet of the line. A unit set at the minimum setback will have a rated wall with few windows on that side, so plan light and views from the other walls.",
        "The same cover sheet asks whether the existing house has fire sprinklers, whether the ADU will share the house's electrical service, whether an SDG&E work order is needed, and whether a solar system is required under a separate permit. Settle those answers early: a shared electrical service and sprinkler status both change the cost.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in Imperial Beach",
    paragraphs: [
      "The one published ADU-specific fee is the City's coastal permit: a $1,000 developer fee for an administrative Coastal Development Permit, with additional fees possible when a project needs several reviews or tasks. A permit from the Coastal Commission follows the Commission's own fee schedule.",
      "Building permit and plan check fees are set separately; ask the Building Division for an estimate once you have a plan set. State law exempts an ADU of 750 square feet of interior livable space or less from local impact fees and scales them for larger units, while school districts and utilities set their own charges.",
      "Budget for the coastal paperwork itself: a preliminary title report from a title company, dated within 90 days of the application, and a public notice package. Using the City's pre-approved plan, where your lot qualifies, can reduce design cost, though you still add site-specific information.",
    ],
    bullets: [
      "City coastal permit for ADUs: $1,000 developer fee, more if multiple reviews are needed",
      "Coastal Commission permit (blue zone): the Commission's fee schedule",
      "Building permit and plan check: estimate with the Building Division",
      "Impact fees: exempt at 750 sq ft of interior livable space or less; proportional above",
      "Preliminary title report and public notice package for the coastal permit",
      "Solar system on a new detached ADU: separate permit where required",
    ],
  },
  processIntro:
    "In Imperial Beach the order of permits matters. A lot in the Coastal Zone gets its coastal permit first, from the City or the Coastal Commission, and then the building permit, unless staff agree to process both at once. Outside the Coastal Zone, the building permit is the main approval, and state law requires a decision within 60 days of a complete application.",
  processSteps: [
    {
      title: "Check the Parcel Viewer and flood map",
      detail:
        "Look up your zone and the Coastal Zone Jurisdiction color for your parcel in the City's Parcel Viewer, and check whether the lot is in a FEMA Special Flood Hazard Area before choosing between the pre-approved plan and a custom design.",
    },
    {
      title: "Prepare plans",
      detail:
        "Use the City's pre-approved one-bedroom plan where the lot qualifies, adding the site-specific information, or have a custom ADU designed. Show the fire-rated wall and limited openings on any side within 5 feet of a property line.",
    },
    {
      title: "Apply for the coastal permit",
      detail:
        "For a green or red parcel, apply online through the City's permit portal (Apply, Plans, Land Use – Administrative Level) with the plan set, grant deed, a preliminary title report dated within 90 days and the Discretionary Permit Application package. For a blue parcel, apply to the California Coastal Commission.",
    },
    {
      title: "Drop off the public notice package",
      detail:
        "After applying online, deliver the public notice package to Community Development, Monday through Thursday from 7:30 to 9:00 AM or 3:30 to 5:00 PM. The City lists a 30-calendar-day review from payment of the $1,000 developer fee.",
    },
    {
      title: "Apply for the building permit",
      detail:
        "Once the coastal permit is approved, or alongside it if staff agree to concurrent processing, submit the building permit application with the final plans.",
    },
    {
      title: "Build and inspect",
      detail:
        "After the building permit is issued, schedule the City's inspections through final before anyone moves in.",
    },
  ],
  permitPortal: {
    label: "City of Imperial Beach — Accessory Dwelling Units (Planning Division)",
    url: "https://imperialbeachca.gov/268/Accessory-Dwelling-Units",
  },
  coastalCallout:
    "Check the Coastal Zone Jurisdiction theme in the City's Parcel Viewer before you design. Green means the City issues an administrative coastal permit; red means the City issues it but the Coastal Commission can appeal; blue means you apply to the Coastal Commission, not the City. In the Coastal Zone, the coastal permit for most ADUs must be approved before the building permit application.",
  faqs: [
    {
      question: "Do I need a coastal permit for an ADU in Imperial Beach?",
      answer:
        "If the lot is in the Coastal Zone, yes for a new attached or detached ADU, for converting a garage, storage room or other non-habitable space into an ADU, and for converting a garage into a junior ADU. Check the Coastal Zone Jurisdiction theme in the City's Parcel Viewer to see whether the City or the Coastal Commission issues it.",
    },
    {
      question: "How much is a coastal permit for an ADU in Imperial Beach?",
      answer:
        "The City's administrative Coastal Development Permit for ADUs carries a $1,000 developer fee, with more due if the project needs several reviews. The City lists a review time of 30 calendar days from payment. Parcels in the Coastal Commission's jurisdiction pay the Commission's fees instead.",
    },
    {
      question: "How big can an ADU be in Imperial Beach?",
      answer:
        "Up to 1,200 square feet for a new detached ADU or a conversion of existing space. The City's summary lists attached ADUs at 50% of the main residence or up to 800 square feet, and junior ADUs at 500 square feet within the house.",
    },
    {
      question: "How tall can a granny flat be in Imperial Beach?",
      answer:
        "A detached ADU can be 16 feet tall, or 18 feet within a half-mile walk of a major transit stop or high-quality transit corridor, plus 2 feet to match the main house's roof pitch. An attached ADU can reach 25 feet or the zone's limit, whichever is lower, and two stories at most.",
    },
    {
      question: "Does Imperial Beach have pre-approved ADU plans?",
      answer:
        "Yes, a one-bedroom detached ADU plan set. It cannot be used in a FEMA Special Flood Hazard Area, and its code notes cite the 2019 California codes, so confirm current code updates with the Building Division before you submit.",
    },
    {
      question: "Can I turn my garage into an ADU in Imperial Beach?",
      answer:
        "Yes. A conversion of existing space can be up to 1,200 square feet, and it can expand by up to 150 square feet only to provide entry and exit. In the Coastal Zone, converting a garage into an ADU or a junior ADU needs a coastal permit first.",
    },
    {
      question: "How many ADUs can I build on a single-family lot in Imperial Beach?",
      answer:
        "In the R-1-6000 and R-1-3800 zones, up to three units: one new detached ADU, one new attached ADU or conversion of existing space (not both), and one junior ADU converted from space within the house.",
    },
    {
      question: "What are the ADU setbacks in Imperial Beach?",
      answer:
        "Four feet from the side and rear property lines. Building that close has consequences: the City's pre-approved plan notes require a one-hour fire-rated wall within 5 feet of the line without sprinklers, limit openings to 25% of that wall, and allow none within 3 feet.",
    },
  ],
  neighbors: ["san-diego", "chula-vista"],
  sources: [
    {
      label: "City of Imperial Beach — Accessory Dwelling Units (Planning Division)",
      url: "https://imperialbeachca.gov/268/Accessory-Dwelling-Units",
    },
    {
      label: "City of Imperial Beach handout: What Triggers a Coastal Permit for Accessory Dwelling Units (PDF)",
      url: "https://imperialbeachca.gov/DocumentCenter/View/1452/Handout---What-Triggers-a-Coastal-Permit-for-Accessory-Dwelling-Units-PDF",
    },
    {
      label: "City of Imperial Beach pre-approved ADU plan set (PDF)",
      url: "https://imperialbeachca.gov/DocumentCenter/View/346",
    },
    {
      label: "City of Imperial Beach Coastal Development Permit Submittal Checklist (PDF)",
      url: "https://imperialbeachca.gov/DocumentCenter/View/309/Coastal-Development-Permit-Submittal-Checklist-PDF",
    },
    {
      label: "City of Imperial Beach Parcel Viewer (Coastal Zone Jurisdiction theme)",
      url: "https://imperialbeachca.mapgeo.io/datasets/public-access",
    },
  ],
};
