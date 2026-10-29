/**
 * California junior ADU (JADU) guide content (`/adu/ca/jadu`).
 *
 * Statewide topic page, not a jurisdiction guide: every rule here is state
 * law (Gov. Code §§66313, 66311.5, 66317, 66323, 66333–66339), checked
 * against HCD's ADU Handbook (March 2026), which reflects the 2025 bills
 * effective January 1, 2026 (AB 1154's JADU owner-occupancy and rental
 * changes among them). Local codes can lag state law; the page links the
 * guides where that is documented rather than restating city rules.
 *
 * No cost figure is typed here: LotFoundry's model prices new detached
 * units only, and the page says so instead of inventing a JADU price.
 *
 * Researched for "junior adu" (590/mo), "what is a junior adu" (260/mo)
 * and "junior adu vs adu" (70/mo), Oct 28, 2026.
 *
 * @module adu/ca/jadu
 */
import type { AduFaq, AduGlanceRow, AduSource } from "@/lib/adu/types";

/** ISO date the rules below were last checked against the handbook. */
export const JADU_AS_OF = "2026-10-28";

/** The rules at a glance, each tied to the statute that sets it. */
export const JADU_GLANCE: AduGlanceRow[] = [
  { label: "Size", value: "Up to 500 sq ft of interior livable space", note: "Gov. Code §66313(d)" },
  { label: "Where it can go", value: "Entirely inside a proposed or existing single-family home, including an attached garage", note: "Not in a detached garage or other accessory structure (§66333(d))" },
  { label: "How many", value: "One per lot zoned for single-family use", note: "Even when the lot has more than one detached home (§66333(a))" },
  { label: "With other ADUs", value: "One JADU + one ADU converted from existing space + one new detached ADU of up to 800 sq ft", note: "The combination every city must allow (§66323(a))" },
  { label: "Entrance", value: "Its own entrance, separate from the home's main entrance", note: "Without its own bathroom, it also needs an interior door to the main living area (§66333(e))" },
  { label: "Kitchen", value: "An efficiency kitchen: cooking appliances, a food-prep counter and storage cabinets of reasonable size", note: "Cities can't require set counter or cabinet sizes, specific appliances or a 220V circuit (§66333(f))" },
  { label: "Bathroom", value: "Its own, or shared with the home", note: "§66313(d)" },
  { label: "Parking", value: "None may be required", note: "Including when the JADU is converted from an attached garage (§66334(a))" },
  { label: "Owner on site", value: "Required only if the JADU shares bathroom facilities with the home", note: "The owner lives in the rest of the home or in the JADU (§66333(b), since January 1, 2026)" },
  { label: "Renting it out", value: "Allowed for terms longer than 30 days; no short-term rentals", note: "§66333(g)" },
  { label: "Deed restriction", value: "Recorded; bars selling the JADU apart from the home and fixes its size and features", note: "§66333(c)" },
  { label: "Impact and utility fees", value: "No impact fees at 500 sq ft or less; not a new residential use for water and sewer connection fees", note: "Unless built at the same time as a new house (§66311.5)" },
  { label: "Fire sprinklers", value: "Only if the home itself must have them", note: "Adding a JADU can't trigger sprinklers for the home (§66323(d))" },
  { label: "Approval", value: "Ministerial, with no hearing; a decision within 60 days of a complete application", note: "Completeness must be decided within 15 business days (§66317)" },
];

/** One row of the JADU-versus-ADU comparison table. */
export interface JaduComparisonRow {
  /** What is being compared. */
  label: string;
  /** The junior ADU rule. */
  jadu: string;
  /** The standard ADU rule. */
  adu: string;
}

/** Side-by-side differences, all from state law. */
export const JADU_VS_ADU: JaduComparisonRow[] = [
  { label: "Size", jadu: "Up to 500 sq ft", adu: "At least 850 sq ft (studio or 1 bedroom) or 1,000 sq ft (2+ bedrooms) must be allowed; a new detached ADU under §66323 is capped at 800 sq ft" },
  { label: "Where", jadu: "Inside the home or an attached garage only", adu: "Attached, detached, or converted from the home or an accessory structure" },
  { label: "Bathroom", jadu: "Its own or shared with the home", adu: "Its own sanitation facilities" },
  { label: "Kitchen", jadu: "Efficiency kitchen", adu: "Its own cooking facilities" },
  { label: "Owner on site", jadu: "Only if the bathroom is shared", adu: "Not required, except for an ADU sold separately" },
  { label: "Parking", jadu: "Never required", adu: "At most one space, waived in many cases" },
  { label: "Sold separately", jadu: "Never (deed restriction)", adu: "Only where the city has adopted an ordinance allowing it (§66341)" },
];

/** A headed block of guide prose. */
export interface JaduSection {
  /** Anchor id for the section heading. */
  id: string;
  /** Section heading. */
  heading: string;
  /** Body paragraphs. */
  paragraphs: string[];
}

/** The body of the guide, after the rules table and comparison. */
export const JADU_SECTIONS: JaduSection[] = [
  {
    id: "jadu-where",
    heading: "Where a JADU fits, and where it doesn't",
    paragraphs: [
      "A JADU has to be inside the walls of a single-family home. State law counts enclosed spaces that are part of the home, such as an attached garage. A detached garage or other accessory structure does not, so converting one of those creates an ADU instead. A converted ADU may also grow by up to 150 square feet for a stairway or other access, while a JADU may not.",
      "One JADU is allowed per lot zoned for single-family use, even if the lot holds more than one detached home. Each half of a half-plex (two homes on separate lots sharing a wall) can have one. A duplex on a single lot counts as multifamily, so it does not qualify.",
    ],
  },
  {
    id: "jadu-owner",
    heading: "Owner occupancy, renting and the deed restriction",
    paragraphs: [
      "The owner-occupancy rule changed on January 1, 2026. An owner now has to live on the property only when the JADU shares bathroom facilities with the home, and then they can live in either the JADU or the rest of the house. A JADU with its own bathroom carries no owner-occupancy rule, and neither does one owned by a government agency, land trust or housing organization.",
      "A JADU can be rented, but only for terms longer than 30 days, so it cannot be a short-term rental. Cities require a recorded deed restriction that bars selling the JADU apart from the home and keeps its size and features to what was permitted.",
      "Some city codes still carry the older rule. Sacramento's code, for example, still requires an owner on site for every JADU, while La Mesa's 2026 matrix already applies the shared-bathroom test. A city that fails to send HCD its JADU ordinance, or to answer HCD's findings on it, must process JADUs under state law alone (Gov. Code §66333.5). Ask your city which version it applies before you plan to rent out both the house and the JADU.",
    ],
  },
  {
    id: "jadu-cost",
    heading: "What a JADU costs, and what LotFoundry can price",
    paragraphs: [
      "State law keeps the fees small. A JADU of 500 square feet or less pays no impact fees, and it is not treated as a new residential use for water and sewer connection fees unless it is built at the same time as a new house. It cannot be required to have fire sprinklers unless the home already must, and building it cannot trigger sprinklers for the home.",
      "Construction cost depends on the room you start from: whether plumbing is close, how the new entrance is cut in, and what fire separation the building inspector asks for. LotFoundry's cost model prices new detached backyard homes only, so it does not quote a JADU. If you are weighing a JADU against a detached unit, price the JADU from a site visit, and use the calculator or the Studio for the detached option.",
    ],
  },
];

/** Searcher-worded questions, rendered with FAQPage markup. */
export const JADU_FAQS: AduFaq[] = [
  {
    question: "What is a junior ADU (JADU)?",
    answer:
      "A junior accessory dwelling unit is a home of up to 500 square feet of interior living space created inside a single-family house, including an attached garage. It has its own entrance and an efficiency kitchen, and it can have its own bathroom or share the house's. California allows one per single-family lot.",
  },
  {
    question: "What is the difference between an ADU and a junior ADU?",
    answer:
      "A JADU is capped at 500 square feet, must be inside the house or an attached garage, and can share the house's bathroom. An ADU can be larger, attached or detached, and has its own kitchen and bathroom. A JADU that shares the bathroom requires an owner on site; a standard ADU cannot.",
  },
  {
    question: "How big can a junior ADU be in California?",
    answer:
      "Up to 500 square feet of interior livable space. Unlike an ADU converted from an accessory structure, a JADU cannot add 150 square feet for an entrance or stairway.",
  },
  {
    question: "Can a junior ADU be in a garage?",
    answer:
      "In an attached garage, yes: state law treats it as part of the home. A detached garage cannot hold a JADU, but converting it can create a regular ADU instead.",
  },
  {
    question: "Does a junior ADU need its own bathroom?",
    answer:
      "No. A JADU can share the house's bathroom, but then it must have both its own entrance and an interior door to the main living area, and an owner must live on the property.",
  },
  {
    question: "Do I have to live on the property to have a JADU?",
    answer:
      "Only if the JADU shares bathroom facilities with the house. Since January 1, 2026, a JADU with its own bathroom has no owner-occupancy requirement under state law. Some city codes have not caught up, so confirm with your city.",
  },
  {
    question: "Can I rent out a junior ADU?",
    answer:
      "Yes, for terms longer than 30 days. State law bars short-term rentals of a JADU.",
  },
  {
    question: "Can I have a JADU and an ADU on the same lot?",
    answer:
      "Yes. On a single-family lot, every California city must allow one JADU, one ADU converted from existing space and one new detached ADU of up to 800 square feet together.",
  },
];

/** Primary sources cited on the page. */
export const JADU_SOURCES: AduSource[] = [
  {
    label: "California HCD ADU Handbook (March 2026), JADU section",
    url: "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf",
  },
  {
    label: "Gov. Code §66333: junior accessory dwelling unit ordinances",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66333",
  },
  {
    label: "Gov. Code §66313: definitions, including JADU",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66313",
  },
  {
    label: "Gov. Code §66323: ADU and JADU combinations every city must approve",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66323",
  },
  {
    label: "Gov. Code §66311.5: impact and utility fees",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66311.5",
  },
  {
    label: "HCD Accessory Dwelling Units policy page",
    url: "https://www.hcd.ca.gov/policy-and-research/accessory-dwelling-units",
  },
];
