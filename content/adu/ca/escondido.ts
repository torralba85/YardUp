/**
 * Escondido ADU jurisdiction content.
 *
 * Primary sources: Escondido Zoning Code Article 70 (accessory dwelling
 * units and junior accessory dwelling units), the city's published ADU
 * handout, and the ADU submittal checklist. A mid-2026 Planning Commission
 * recommendation to amend Article 70 is flagged in-copy as pending.
 *
 * @module adu/ca/escondido
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const escondido: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Escondido",
  slug: "escondido",
  county: "San Diego County",
  asOf: "2026-10-25",
  metaDescription:
    "Escondido ADU rules: 850–1,000 sq ft size allowances, an 800 sq ft unit exempt from FAR and lot coverage, and 4 ft setbacks. Run the numbers on your lot, free.",
  introAnswer: [
    "Yes — Escondido allows at least one ADU plus one junior ADU on virtually every single-family lot, and state law requires the city to allow at least 850 square feet for a studio or one-bedroom and 1,000 square feet for two or more bedrooms, approved ministerially with no hearing.",
    "Escondido is the most handbook-driven city in this batch: the Planning Division publishes an ADU handout that states the key numbers plainly — 16-foot detached height, 18 feet near transit, 25 feet attached — plus a dedicated submittal checklist that tells you exactly what a complete application contains.",
    "One timing note matters here more than elsewhere: in May 2026 the Planning Commission voted to recommend City Council amendments to Article 70, including height language. Read the current code text for your application rather than relying on older summaries.",
  ],
  metaSizeNote: "850–1,000+ sq ft by bedroom count; 800 sq ft exempt unit",
  metaSetbackNote: "4 ft side and rear; front per zoning",
  metaParkingNote: "max 1 space, waived near transit and for conversions",
  glance: [
    { label: "Max size — detached", value: "850 sq ft (studio/1BR), 1,000 sq ft (2+ BR) minimum must be allowed", note: "An 800 sq ft interior-space unit is permitted regardless of FAR and lot coverage" },
    { label: "Max size — attached", value: "Up to 25 ft height; at least 850–1,000 sq ft must be allowed", note: "Attached units may go taller than detached ones" },
    { label: "Max size — JADU", value: "500 sq ft, subject to zoning standards", note: "Must comply with setback, height, FAR, and coverage rules except where state law overrides" },
    { label: "Max height — detached", value: "16 ft; 18 ft within ½ mile of transit", note: "Per the city ADU handout; Article 70 amendments on height were recommended May 2026" },
    { label: "Rear and side setbacks", value: "4 ft side and rear", note: "Front setbacks per existing zoning" },
    { label: "Front setback", value: "Based on existing zoning" },
    { label: "Parking required", value: "Max 1 space per ADU", note: "Waived within ½-mile walk of transit, in historic districts, for conversions, and for attached units" },
    { label: "Owner-occupancy", value: "Never required for standard ADUs", note: "JADU occupancy only where sanitation is shared with the main home" },
    { label: "Lot-size minimum", value: "None — prohibited by state law" },
    { label: "Approval type & timeline", value: "Ministerial, 60-day decision on a complete application", note: "Use the city's ADU submittal checklist to file complete the first time" },
  ],
  cityDiffers: [
    {
      heading: "The rulebook: Article 70, the handout, and the 2026 update",
      paragraphs: [
        "Escondido's ADU law is Article 70 of the zoning code, covering both accessory and junior accessory dwelling units in one place, with related definitions in Article 1. For a homeowner, the more useful document is the city's ADU handout: a single handout page that states the headline numbers — 16-foot detached height regardless of underlying height limits, 18 feet within a half-mile of transit, 25 feet for attached units, four-foot side and rear setbacks, no minimum lot size — without requiring you to parse ordinance text.",
        "The handout's numbers track the state's protected size allowances closely, which makes Escondido a city where the state floor does most of the work. The local value-add is procedural rather than substantive: a dedicated ADU submittal checklist that itemizes everything from wall and fence locations to water and sewer connection points to the project-information table (lot coverage, unit size proposed). Applications that follow the checklist fail the completeness trap that delays most ADU permits — the 60-day clock only runs on a complete application, and this checklist is how you file a complete one.",
        "Watch the amendment cycle. On May 26, 2026 the Planning Commission unanimously recommended that the City Council adopt amendments to Article 70 and related definitions, approving resolution 2026-06 after a wording change to the proposed height language. That means height provisions in particular may read differently in the current code than in guides written against the older text. When this page's as-of date and a secondary guide disagree, the current Article 70 text wins.",
      ],
    },
    {
      heading: "Inland lots: space, transit pockets, and no coastal layer",
      paragraphs: [
        "Escondido's practical advantage over coastal North County is the absence of a coastal zone: no coastal development permit, no Coastal Commission interface, no overlay timeline. The complications this city does have are ordinary inland ones — older neighborhoods with tight utility easements along rear property lines, and lots where the 800-square-foot exempt unit is the right answer because coverage math is tight.",
        "Transit-oriented height is worth mapping deliberately. The handout's 18-foot allowance within a half-mile of transit rewards parcels near the Sprinter corridor and frequent bus lines with a taller envelope — enough for a proper two-story-feel unit or generous roof pitch. If your lot is near transit, design to the 18-foot number from the start rather than discovering it during corrections.",
        "JADUs deserve a closer read of Article 70 than elsewhere: the article states plainly that a junior unit must comply with the full run of zoning standards — setbacks, height, floor-area ratio, coverage — except where state law overrides. Garage and bedroom conversions still pencil, but Escondido JADU plans should be checked against the article's own parking and development standards section rather than assumed from the state summary.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in Escondido",
    paragraphs: [
      "Escondido applies the standard municipal stack under the state caps: no development impact fees at 750 square feet or less of interior livable space, proportional fees above, and no school fees under 500 square feet (school and utility fees remain separate). The city's published handout and checklist keep the process predictable, but neither fixes dollar figures — those live in the fee schedule and move with it.",
      "Because this page cannot verify a current city-published fee total, it prints none: confirm building-permit, plan-check, school, and utility-connection figures with Planning before budgeting. Size discipline around the 500 and 750 square-foot thresholds is the highest-leverage fee decision on any Escondido ADU.",
    ],
    bullets: [
      "Building permit + plan check: per the current city fee schedule",
      "Development impact fees: exempt at 750 sq ft or less; proportional above",
      "School fees: exempt under 500 sq ft; district fees apply above",
      "Utility connections: show water/sewer connection points on the site plan per the submittal checklist; confirm capacity charges",
      "No coastal-review costs: Escondido has no coastal zone",
    ],
  },
  processIntro:
    "Escondido reviews ADUs ministerially through the Planning Division with a 60-day decision clock. The city's own submittal checklist is the closest thing to a guaranteed-complete application this batch offers — use it literally.",
  processSteps: [
    {
      title: "Read the current Article 70",
      detail:
        "Pull the current Article 70 text plus the ADU handout. Given the May 2026 recommended amendments, verify height and definition language against the live code, not older guides.",
    },
    {
      title: "Map transit distance and easements",
      detail:
        "Confirm whether the lot is within a half-mile of transit for the 18-foot height allowance, and walk the rear and side lines for utility easements that constrain placement regardless of setback minimums.",
    },
    {
      title: "Build the checklist package",
      detail:
        "Site plan with walls, fences, and utility connections; floor plans and elevations; structural and energy compliance; project-information table with lot coverage and unit size. Every item on the ADU submittal checklist, no gaps.",
    },
    {
      title: "File with Planning",
      detail:
        "Submit the complete package. The completeness determination starts the 60-day ministerial clock — a checklist-faithful submittal is how you start it on day one instead of day thirty.",
    },
    {
      title: "Permit, build, inspect",
      detail:
        "Build under permit with scheduled inspections through final. Keep the handout's height and setback numbers on the site plan so field questions resolve fast.",
    },
  ],
  permitPortal: {
    label: "City of Escondido Planning Division — ADU handout",
    url: "https://www.escondido.gov/DocumentCenter/View/544/City-ADU-Handout-PDF",
  },
  faqs: [
    {
      question: "Can I build an ADU in Escondido in 2026?",
      answer:
        "Yes, on virtually every single-family lot: at least one ADU plus one junior ADU, approved ministerially. Note the city is working through Article 70 amendments recommended in May 2026, so verify height language against the current code.",
    },
    {
      question: "How tall can a granny flat be in Escondido?",
      answer:
        "Per the city's ADU handout: 16 feet detached regardless of underlying height limits, 18 feet within a half-mile of transit, and 25 feet for attached units. Height amendments were recommended in 2026, so confirm the live text.",
    },
    {
      question: "What are the setback rules for a casita in Escondido?",
      answer:
        "Four-foot side and rear setbacks, with front setbacks per existing zoning. Conversions of existing structures carry no new setback requirement.",
    },
    {
      question: "How big can a back house be in Escondido?",
      answer:
        "The city must allow at least 850 square feet for a studio or one-bedroom and 1,000 for two or more bedrooms, and an 800-square-foot interior-space unit is permitted regardless of floor-area ratio and lot coverage.",
    },
    {
      question: "How long does ADU approval take in Escondido?",
      answer:
        "A ministerial decision is due within 60 days of a complete application. File using the city's ADU submittal checklist so the application is complete on arrival and the clock starts immediately.",
    },
    {
      question: "Do I need parking for an in-law unit in Escondido?",
      answer:
        "At most one space, waived within a half-mile walk of transit, in historic districts, for conversions, and for attached units. Parcels near the Sprinter corridor most often qualify for the waiver.",
    },
    {
      question: "Is there a coastal permit for ADUs in Escondido?",
      answer:
        "No — Escondido has no coastal zone, so no coastal development permit layer exists. That removes the most common timeline risk found in coastal North County cities.",
    },
  ],
  neighbors: ["san-diego", "oceanside", "carlsbad", "san-diego-county", "san-marcos"],
  sources: [
    {
      label: "Escondido Zoning Code Article 70 — ADUs and JADUs",
      url: "https://ecode360.com/43269719",
    },
    {
      label: "City of Escondido ADU handout (PDF)",
      url: "https://www.escondido.gov/DocumentCenter/View/544/City-ADU-Handout-PDF",
    },
    {
      label: "City of Escondido ADU submittal checklist (PDF)",
      url: "https://police.escondido.org/DocumentCenter/View/545/ADU-submittal-checklist-PDF",
    },
  ],
};
