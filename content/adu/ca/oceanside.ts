/**
 * Oceanside ADU jurisdiction content.
 *
 * Primary sources: the City of Oceanside Comprehensive Zoning Ordinance
 * (Part IV, regulations applying in all or several districts) and the
 * city's published ADU materials. Where only secondary reporting exists
 * the copy attributes it and points at the city source for confirmation.
 *
 * @module adu/ca/oceanside
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const oceanside: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Oceanside",
  slug: "oceanside",
  county: "San Diego County",
  asOf: "2026-10-10",
  metaDescription:
    "Oceanside ADU rules: ordinance impact-fee relief, 850–1,000 sq ft at 4 ft setbacks, coastal review near the beach. See what fits your lot, free.",
  introAnswer: [
    "Yes — Oceanside allows at least one detached ADU plus one junior ADU on virtually every single-family lot, with state minimums of 850 square feet for a studio or one-bedroom and 1,000 square feet for two or more bedrooms, approved ministerially with no hearing.",
    "Oceanside’s fee rules have an important dual layer: the city's zoning ordinance states that the city shall not impose impact fees on ADU development, while state law independently guarantees an impact-fee exemption at 750 square feet or less of interior livable space and authorizes proportional impact fees for larger units. Confirm with Planning how larger units are currently assessed before budgeting.",
    "The defining local question is the coast. A large share of Oceanside sits in the coastal zone, the city's coastal ADU rules have awaited Coastal Commission certification, and coastal parcels can need a coastal development permit on top of the standard approval — confirm your parcel's status before designing.",
  ],
  metaSizeNote: "850–1,000+ sq ft by bedroom count; larger detached units allowed",
  metaSetbackNote: "4 ft side and rear up to 1,000 sq ft",
  metaParkingNote: "max 1 space, waived near transit and for conversions",
  glance: [
    { label: "Max size — detached", value: "850 sq ft (studio/1BR), 1,000 sq ft (2+ BR) minimum must be allowed", note: "City standards allow larger detached units; confirm current maximums with Planning" },
    { label: "Max size — attached", value: "Within state minimums and 50% of primary dwelling living area" },
    { label: "Max size — JADU", value: "500 sq ft, within existing or proposed space" },
    { label: "Max height — detached", value: "16 ft; 18 ft within ½-mile walk of major transit", note: "+2 ft to match primary dwelling roof pitch" },
    { label: "Rear and side setbacks", value: "4 ft side and rear up to 1,000 sq ft", note: "Larger units meet the underlying district's setbacks; additional setbacks can apply in the coastal zone" },
    { label: "Front setback", value: "Follows the primary residence's requirement" },
    { label: "Parking required", value: "Max 1 space per ADU", note: "Waived within ½-mile walk of transit, in historic districts, for conversions, and for attached units" },
    { label: "Owner-occupancy", value: "Never required for standard ADUs", note: "JADU occupancy only where sanitation is shared with the main home" },
    { label: "Lot-size minimum", value: "None — prohibited by state law" },
    { label: "Approval type & timeline", value: "Ministerial, 60-day review of complete applications", note: "Coastal-zone parcels may need a separate coastal development permit" },
  ],
  cityDiffers: [
    {
      heading: "The rulebook: zoning ordinance Part IV and the coastal question",
      paragraphs: [
        "Oceanside regulates ADUs through its Comprehensive Zoning Ordinance, in the part covering regulations that apply across districts, rather than through a standalone ADU chapter. In practice that means your ADU answers come from two places: the ADU-specific provisions (sizes, setbacks, ministerial review) and the underlying district rules for your street (front setbacks, height context, design expectations). Read both before settling on placement.",
        "The coastal zone dominates Oceanside ADU planning more than in any other North County city. The city's own zoning text notes that Coastal Commission certification of a local coastal program amendment for coastal-zone properties has been pending — meaning the exact interface between state ADU rights and coastal review on coastal parcels has been a moving target. The practical consequence is stable even while the paperwork moves: if your parcel is in the coastal zone, budget for a possible coastal development permit and an extended timeline, and get a written read from Planning on which rules apply to your address before spending on drawings.",
        "The fee picture in Oceanside sits at the intersection between local code language and state statute. Oceanside’s zoning ordinance states that the city shall not impose impact fees on ADU development. At the state level, California independently exempts ADUs of 750 square feet of interior livable space or less from local development impact fees and exempts units under 500 square feet from school fees, while authorizing proportional impact fees for larger units. How the city harmonizes its ordinance text with state proportional fee rules in practice is a question for Planning before you budget a larger unit — do not assume zero impact fees for units over 750 square feet without written confirmation from the city, and remember school district and utility connection fees remain separate.",
      ],
    },
    {
      heading: "Size bands, setbacks, and where the big units go",
      paragraphs: [
        "Oceanside draws a visible line at 1,000 square feet: ADUs up to that size build with four-foot side and rear setbacks, while larger units step up to the underlying zoning district's setback rules, which vary by neighborhood. That makes 1,000 square feet the natural design target for most lots — it captures the two-bedroom state minimum while keeping the friendliest placement rules.",
        "Front-yard treatment follows whatever the primary residence already requires, which keeps streetscapes consistent but means corner lots and shallow front yards deserve an early site-plan sketch. Detached units above the standard sizes are allowed under city standards, but because the setback rules change at the threshold, price both options: a 1,000-square-foot unit with simple setbacks often pencils better than a slightly larger one fighting district rules.",
        "As with every California city, conversions of existing garages and accessory structures keep their existing setbacks with no new side or rear requirement. Oceanside's older beach-area housing stock — small lots near the coast with existing garages — is well suited to this path, with the caveat that those same parcels are the likeliest to sit in the coastal zone and need the extra permit layer.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in Oceanside",
    paragraphs: [
      "Oceanside's zoning ordinance states that the city shall not impose impact fees on ADU development, while state law independently guarantees that ADUs of 750 square feet or less of interior livable space are exempt from local development impact fees (and under 500 square feet from school fees). For units larger than 750 square feet, state law authorizes proportional impact fees; confirm with Planning how the city currently assesses impact fees on larger ADUs rather than assuming zero fees. Small units face primarily building-permit, plan-check, and utility-connection costs.",
      "This page does not print permit totals because the city's fee schedule is revised regularly and totals swing with unit size. Confirm current figures with Planning before budgeting, and treat builder-published cost ranges as what they are — construction estimates, not the city's fee table.",
    ],
    bullets: [
      "Development impact fees: exempt at 750 sq ft or less under state law; local ordinance contains broad no-impact-fee language (confirm current application for larger units with Planning)",
      "School fees: exempt under 500 sq ft; district fees can apply above",
      "Building permit + plan check: per the current city fee schedule",
      "Utility connections: confirm capacity and connection charges with serving providers",
      "Coastal-zone parcels: budget for coastal development permit costs and extended review",
    ],
  },
  processIntro:
    "Oceanside reviews complete ADU applications ministerially with a 60-day clock. Coastal-zone parcels add a parallel coastal track — start there, not with the building plans.",
  processSteps: [
    {
      title: "Confirm coastal-zone status",
      detail:
        "Check whether the parcel sits in the coastal zone and ask Planning, in writing, whether a coastal development permit applies to an ADU at your address. This single answer sets the timeline for everything downstream.",
    },
    {
      title: "Size to the setback bands",
      detail:
        "Sketch the unit at or under 1,000 square feet first to hold four-foot side and rear setbacks. Only grow past the threshold deliberately, knowing district setbacks take over.",
    },
    {
      title: "Prepare the submittal",
      detail:
        "Site plan, floor plans, elevations, structural and energy compliance. Garage conversions should document existing setbacks to lock in the no-new-setback treatment.",
    },
    {
      title: "File with Planning and Building",
      detail:
        "Submit the complete application package. The 60-day ministerial review clock runs on completeness — respond fast to any correction list so the clock keeps running in your favor.",
    },
    {
      title: "Permit, build, inspect",
      detail:
        "Build under permit with scheduled inspections through final. Coastal-zone projects should keep the coastal and building conditions in one compliance checklist so nothing slips between the two approvals.",
    },
  ],
  permitPortal: {
    label: "City of Oceanside Planning Division",
    url: "https://www.ci.oceanside.ca.us/gov/dev/planning",
  },
  faqs: [
    {
      question: "Can I build an ADU in Oceanside in 2026?",
      answer:
        "Yes, on virtually every single-family lot: at least one detached ADU plus one junior ADU, approved ministerially. The one systematic exception is the coastal zone, where a coastal development permit can apply on top of the standard approval.",
    },
    {
      question: "Does Oceanside charge impact fees on an ADU?",
      answer:
        "For units of 750 square feet or less of interior livable space, state law exempts ADUs from local development impact fees. While Oceanside's zoning ordinance contains language stating the city shall not impose impact fees on ADU development, state law authorizes proportional impact fees above 750 square feet. Homeowners planning larger units should verify with Planning how the city currently applies impact fees in practice, and remember school district and utility connection fees remain separate.",
    },
    {
      question: "What are the setback rules for a casita in Oceanside?",
      answer:
        "Four-foot side and rear setbacks for ADUs up to 1,000 square feet; larger units follow the underlying district's setbacks. Front setbacks follow the primary residence, and garage conversions keep existing setbacks.",
    },
    {
      question: "How big can a back house be in Oceanside?",
      answer:
        "At least 850 square feet for a studio or one-bedroom and 1,000 for two or more bedrooms, with an 800-square-foot interior-space unit exempt from coverage and lot-size limits. The city allows larger detached units, with district setbacks applying above 1,000 square feet.",
    },
    {
      question: "Do I need a coastal permit for an in-law unit in Oceanside?",
      answer:
        "Possibly, if the parcel is in the coastal zone. The city's coastal ADU provisions have awaited Coastal Commission certification, so get a written determination from Planning for your specific address before designing.",
    },
    {
      question: "How long does ADU approval take in Oceanside?",
      answer:
        "Sixty days for a ministerial decision on a complete application outside the coastal zone. Coastal review, where required, runs on its own timeline on top of that.",
    },
    {
      question: "Do I need parking for an ADU in Oceanside?",
      answer:
        "At most one space, waived within a half-mile walk of transit, in historic districts, for conversions, and for attached units. Much of central Oceanside near the Sprinter and Coaster stations qualifies for the waiver.",
    },
  ],
  neighbors: ["carlsbad", "escondido", "san-diego-county"],
  sources: [
    {
      label: "Oceanside Comprehensive Zoning Ordinance, Part IV",
      url: "https://www.ci.oceanside.ca.us/home/showpublisheddocument/2768/637951337634830000",
    },
    {
      label: "City of Oceanside Planning Division",
      url: "https://www.ci.oceanside.ca.us/gov/dev/planning",
    },
  ],
};
