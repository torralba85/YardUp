/**
 * Chula Vista ADU jurisdiction content.
 *
 * Primary sources: Chula Vista Municipal Code §19.58.022 (accessory
 * dwelling units) and the Development Services ADU program materials,
 * including the council-authorized preapproved standard plans. Figures
 * verified against those publications; unsourced totals are omitted.
 *
 * @module adu/ca/chula-vista
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const chulaVista: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Chula Vista",
  slug: "chula-vista",
  county: "San Diego County",
  asOf: "2026-09-17",
  metaTitle: "Chula Vista ADU Rules (2026): Size, Setbacks & Permits",
  metaDescription:
    "Chula Vista ADU rules: 850–1,000 sq ft minimums, 4 ft side and rear setbacks, and preapproved plans that cut review to a flat fee. Check your lot, free.",
  introAnswer: [
    "Yes — Chula Vista allows at least one detached ADU plus one junior ADU on virtually every single-family lot, with the state minimums of 850 square feet for a studio or one-bedroom and 1,000 square feet for two or more bedrooms, approved ministerially with no hearing.",
    "Chula Vista's standout feature is its homeowner toolkit: the city used a regional housing-acceleration grant to develop preapproved ADU standard plans, and council authorized a flat building-permit review fee for those standard plans — making Chula Vista one of the cheapest and most predictable permitting paths in the county.",
    "Two local rules to know up front: new ADUs cannot be rented for terms under 30 days, and eastern hillside lots can trigger geotechnical review that adds meaningful cost before design even starts.",
  ],
  metaSizeNote: "850–1,000+ sq ft by bedroom count, with preapproved plans",
  metaSetbackNote: "4 ft side and rear for detached ADUs",
  metaParkingNote: "max 1 space, waived near transit and for conversions",
  glance: [
    { label: "Max size — detached", value: "850 sq ft (studio/1BR), 1,000 sq ft (2+ BR) minimum must be allowed", note: "City standard plans offered in common sizes up to local maximums" },
    { label: "Max size — attached", value: "850 sq ft (1BR) or 1,000 sq ft (2+ BR) typical; two stories max", note: "Capped at the primary dwelling's height limit or 25 ft, whichever is lower" },
    { label: "Max size — JADU", value: "500 sq ft, within existing or proposed space" },
    { label: "Max height — detached", value: "16 ft; 18 ft within ½-mile walk of major transit", note: "+2 ft to match primary dwelling roof pitch" },
    { label: "Rear and side setbacks", value: "4 ft minimum side and rear for detached ADUs" },
    { label: "Front setback", value: "Per underlying zone requirement" },
    { label: "Parking required", value: "Max 1 space per ADU", note: "Waived within ½-mile walk of transit, in historic districts, for conversions, and for attached units" },
    { label: "Owner-occupancy", value: "Never required for standard ADUs", note: "New ADUs may not be rented for terms under 30 days (CVMC 19.58.022)" },
    { label: "Lot-size minimum", value: "None — prohibited by state law" },
    { label: "Approval type & timeline", value: "Ministerial, 60-day decision on a complete application", note: "Standard-plan submittals carry a flat-fee building review" },
  ],
  cityDiffers: [
    {
      heading: "The rulebook: CVMC 19.58.022 and the standard-plan program",
      paragraphs: [
        "Chula Vista's ADU rules are codified at Municipal Code §19.58.022, and the section reads like a city that wants these built: ministerial review, state-minimum sizes, four-foot side and rear setbacks for detached units, and an explicit exemption from the dedication requirements of CVMC 12.24.030. If you are comparing cities in the South Bay, this is a relatively permissive code section to work under.",
        "The program worth understanding is the preapproved standard-plan set. In 2023 the council directed staff to use a San Diego Association of Governments housing-acceleration grant to build homeowner tools for ADU construction, and the resulting standard plans are the centerpiece: pick a city-reviewed design and the building-permit review collapses toward a flat-fee verification instead of a full custom plan check. Council separately authorized amending the Master Fee Schedule to establish that flat review fee for standard-plan ADUs. The exact dollar figure moves with the fee schedule, so confirm it with Development Services — but the structure itself, flat and predictable, is the point.",
        "One code-level restriction is unusually explicit here: ADUs permitted under the current ordinance cannot be rented for less than 30 days. Chula Vista does not allow new ADUs to operate as short-term rentals, full stop. Underwrite the unit as a long-term rental or family housing, because the nightly-rental math is off the table by ordinance.",
      ],
    },
    {
      heading: "Hillsides, the bayfront, and demolition timing",
      paragraphs: [
        "Chula Vista's topography is the practical complication. The city's eastern growth areas sit on hillsides where lots can require geotechnical engineering reports and specialized foundations — commonly a five-figure addition to project cost that arrives before design is even finished. If your lot is east of the 805 or visibly sloped, get the soils question answered during feasibility, not during plan check.",
        "Near the bay, a different overlay logic applies: bayfront and tidelands-adjacent areas can involve port and coastal review beyond the city's own permit. Most established residential neighborhoods in western Chula Vista — Castle Park, Hilltop, Bonita-adjacent areas — sit outside those complications and follow the standard ministerial path.",
        "A small but useful code detail: a demolition permit for a detached garage being replaced by an ADU must be reviewed with the ADU application and issued at the same time. Garage conversions are among the cheapest ADUs to build, and the code anticipates exactly that project — file both together rather than sequencing them.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in Chula Vista",
    paragraphs: [
      "Chula Vista follows the state fee caps — no impact fees under 750 square feet, proportional fees above, no school fees under 500 square feet — and adds its most homeowner-friendly feature on top: a flat building-permit review fee for preapproved standard plans. A standard-plan unit under 750 square feet is close to the minimum fee exposure California law allows anywhere.",
      "Custom designs pay standard hourly or valuation-based plan-check rates instead of the flat fee, which is one more reason to at least price the standard plans before commissioning custom drawings. Hillside lots should separately budget for geotechnical work, which is a consultant cost, not a city fee, and often exceeds the permit fees themselves.",
    ],
    bullets: [
      "Standard-plan building review: flat fee per the Master Fee Schedule (confirm current figure with Development Services)",
      "Custom-plan review: standard plan-check rates",
      "Development impact fees: none under 750 sq ft; proportional above",
      "School fees: exempt under 500 sq ft",
      "Utility connections: confirm capacity and connection charges with the serving providers",
    ],
  },
  processIntro:
    "Chula Vista processes ADUs ministerially through Development Services with a 60-day decision clock. The standard-plan path is the fastest version of that process the city offers.",
  processSteps: [
    {
      title: "Check lot character",
      detail:
        "Confirm the lot is not on a hillside requiring geotechnical review and not in a bayfront or coastal-review area. Standard flat lots in established neighborhoods follow the simplest path.",
    },
    {
      title: "Choose standard plan or custom",
      detail:
        "Review the city's preapproved ADU standard plans first. A fitting standard plan earns flat-fee review; go custom only if the lot or household needs something the catalog lacks.",
    },
    {
      title: "Prepare the application",
      detail:
        "Site plan, floor plans, elevations, structural and energy compliance — plus soils reports for hillside lots. If replacing a garage, include the demolition permit in the same application package.",
    },
    {
      title: "File with Development Services",
      detail:
        "Submit through the city's permit portal. Track the completeness determination: the city must respond promptly, and the 60-day ministerial clock runs on a complete application.",
    },
    {
      title: "Permit, build, inspect",
      detail:
        "Build under permit with scheduled inspections. Remember the 30-day minimum rental term when planning the unit's use — nightly rental was never an option for new Chula Vista ADUs.",
    },
  ],
  permitPortal: {
    label: "Chula Vista Development Services — ADU program",
    url: "https://www.chulavistaca.gov/departments/development-services",
  },
  faqs: [
    {
      question: "Can I build an ADU in Chula Vista in 2026?",
      answer:
        "Yes, on virtually every single-family lot: at least one detached ADU plus one junior ADU, approved ministerially. The city's preapproved standard plans make it one of the most predictable permitting paths in San Diego County.",
    },
    {
      question: "Does Chula Vista have preapproved ADU plans?",
      answer:
        "Yes. The city developed a standard-plan catalog with a regional housing-acceleration grant, and council authorized a flat building-permit review fee for those plans. Check Development Services for the current catalog and fee figure.",
    },
    {
      question: "Can I Airbnb a granny flat in Chula Vista?",
      answer:
        "No. ADUs permitted under the current ordinance (CVMC 19.58.022) cannot be rented for terms under 30 days. Plan for a long-term tenant or family use.",
    },
    {
      question: "What are the setback rules for a casita in Chula Vista?",
      answer:
        "Detached ADUs observe a minimum 4-foot side and rear setback; front setbacks follow the underlying zone. Garage conversions keep their existing setbacks even where those are nonconforming.",
    },
    {
      question: "How big can a back house be in Chula Vista?",
      answer:
        "The city must allow at least 850 square feet for a studio or one-bedroom and 1,000 for two or more bedrooms, with an 800-square-foot interior-space unit exempt from coverage and lot-size limits. The standard-plan catalog shows the common sizes the city expects.",
    },
    {
      question: "How long does ADU approval take in Chula Vista?",
      answer:
        "A ministerial decision is due within 60 days of a complete application. Standard-plan submittals move fastest because most design review is already done; hillside soils review is the common delay.",
    },
    {
      question: "Do I need extra parking for an in-law unit in Chula Vista?",
      answer:
        "At most one space, and none at all within a half-mile walk of transit, in historic districts, for garage conversions, or for attached units. Replacement parking for converted garages is never required.",
    },
  ],
  neighbors: ["san-diego"],
  sources: [
    {
      label: "CVMC 19.58.022 — Accessory dwelling units",
      url: "https://chulavista.municipal.codes/CVMC/19.58.022(C)(13)",
    },
    {
      label: "Chula Vista Development Services",
      url: "https://www.chulavistaca.gov/departments/development-services",
    },
  ],
};
