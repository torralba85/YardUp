/**
 * San Diego ADU jurisdiction content.
 *
 * Ported from san-diego-page-copy.md and verified against San Diego
 * Municipal Code Chapter 14, Article 1, Division 3 (SDMC § 141.0302) and
 * Development Services Information Bulletins 400 and 501.
 *
 * @module adu/ca/san-diego
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const sanDiego: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "San Diego",
  slug: "san-diego",
  county: "San Diego County",
  asOf: "2026-11-03",
  published: "2026-09-18",
  // Rules-first title and H1 come from the shared template, like the other
  // guides. Cost moved to `san-diego-cost.ts` (`/adu/ca/san-diego/cost`).
  metaDescription:
    "City of San Diego ADU rules for 2026: 150 to 1,200 sq ft, no side or rear setback up to 16 ft outside High/Very High fire zones, coastal caveats, permits.",
  coastalCallout:
    "The 2025 and 2026 amendments took effect outside the Coastal Zone only. If your property is inside it, you are still under the prior ordinance until the California Coastal Commission certifies the changes. Most ADU guides for San Diego miss this. Check whether your parcel is in the Coastal Zone before you rely on anything below.",
  setbackDiagram: {
    shortLabel: "Up to 16 ft tall",
    shortRule: "0 ft side and rear — build to the line",
    tallLabel: "Over 16 ft tall",
    tallRule: "4 ft side and rear",
  },
  introAnswer: [
    "Enter your San Diego address and see what fits on your lot — buildable area, setbacks, a placed ADU in 3D, and what it costs against what it rents for.",
    "San Diego is one of the more permissive ADU jurisdictions in California, with detached and attached ADUs from 150 to 1,200 sq ft, junior ADUs up to 500 sq ft, and a zero side-and-rear setback rule for units up to 16 feet tall outside designated High and Very High fire hazard zones.",
  ],
  metaSizeNote: "150 to 1,200 sq ft",
  metaSetbackNote: "the zero-setback rule",
  metaParkingNote: "generally no parking required",
  glance: [
    {
      label: "Max size — detached",
      value: "150 to 1,200 sq ft",
      note: "State guarantees 850 sq ft (1BR) / 1,000 sq ft (2+BR); San Diego permits up to 1,200 sq ft detached under SDMC § 141.0302",
    },
    {
      label: "Max size — attached",
      value: "Up to 50% of primary dwelling living area (min. 850–1,000 sq ft guaranteed)",
      note: "Max two stories in single-dwelling zones",
    },
    {
      label: "Max size — JADU",
      value: "150 to 500 sq ft",
      note: "Must be contained entirely within existing or proposed single-family residence",
    },
    {
      label: "Max height — detached",
      value: "Per base zone (capped at 2 stories in single-dwelling zones)",
      note: "16 ft height threshold dictates setbacks; base zone limits apply",
    },
    {
      label: "Rear and side setbacks",
      value: "0 ft up to 16 ft tall; over 16 ft next to residential: 4 ft, or base-zone setback if smaller",
      note: "4 ft minimum applies in High and Very High Fire Hazard Severity Zones at any height, and fire-code limits may require larger setbacks. The base-zone option applies outside the Coastal Zone only.",
    },
    {
      label: "Front setback",
      value: "Per base zone (§141.0302(b)(4) qualifies an exception up to 800 sq ft)",
      note: "An ADU generally cannot occupy a front setback unless needed to allow one unit of 800 sq ft or less.",
    },
    {
      label: "Parking required",
      value: "Generally none",
      note: "1 space for Beach Impact Overlay outside TPA, or Bonus Program outside TPA",
    },
    {
      label: "Owner-occupancy",
      value: "Never required for standard ADUs",
      note: "JADU occupancy only where sanitation is shared with main home",
      confidence: "unverified",
    },
    {
      label: "Lot-size minimum",
      value: "None (prohibited by state law)",
    },
    {
      label: "Approval type & timeline",
      value: "Ministerial; 3–5 months typical (5–7 months in Coastal Zone)",
      note: "State 60-day decision clock runs once deemed complete; IB-400 checklist governs",
      confidence: "secondary",
    },
  ],
  cityDiffers: [
    {
      heading: "What you can build in San Diego",
      paragraphs: [
        "San Diego is one of the more permissive ADU jurisdictions in California, and the city has amended its rules three times since 2024. Here is where things stand.",
        "A detached or attached ADU runs from 150 to 1,200 square feet. A junior ADU — a JADU, which has to sit entirely inside your existing house — runs from 150 to 500 square feet.",
        "On a single-family property you can combine one JADU, one converted ADU (a garage conversion, typically) and one detached or attached ADU. That is three additional units on a standard lot, which is why San Diego permitted roughly 2,285 ADUs inside city limits in 2024 — about a quarter of all housing the city produced that year.",
        "In single-dwelling zones, detached ADUs are capped at two stories. There is no single citywide height number beyond that; your ADU conforms to whatever your base zone allows, which varies parcel to parcel. The Studio above resolves it for your specific address.",
      ],
    },
    {
      heading: "Setbacks: the rule that decides your lot",
      paragraphs: [
        "This is the single most valuable thing to understand about building in San Diego, and it hinges entirely on one number: sixteen feet.",
        "Keep your ADU no taller than 16 feet and you generally need no side or rear setback at all under SDMC § 141.0302(b)(9). You can build to the property line — provided your parcel is not located in a designated High or Very High Fire Hazard Severity Zone, and applicable fire codes do not mandate a larger setback or building separation.",
        "Go over 16 feet next to a residentially zoned property and you owe a 4-foot setback on the sides and rear, or your base zone's setback if that is smaller (available outside the Coastal Overlay Zone only). That same 4-foot minimum applies at any height in High and Very High Fire Hazard Severity Zones, and fire code safety requirements can enforce larger separation.",
        "Front setbacks generally follow your base zone, but the September 2026 code provides an important qualifying exception: under SDMC § 141.0302(b)(4), an ADU may encroach into the required front setback if that exception is necessary to permit construction of one qualifying ADU of up to 800 square feet.",
        "The practical consequence: on a narrow lot, a single-story ADU of 16 feet or less may yield more usable square footage than a taller two-story design, because the short one can hug the line outside fire hazard zones while the tall one gives up four feet on three sides. That tradeoff is worth modeling before you talk to a designer — the Studio does it live.",
      ],
    },
    {
      heading: "Parking",
      paragraphs: [
        "Generally none required. Two exceptions worth knowing:",
        "A garage-conversion ADU in the Beach Impact Overlay Zone, outside a Transit Priority Area, needs one space.",
        "An Affordable or Bonus Program ADU outside a Transit Priority Area needs one space.",
      ],
    },
    {
      heading: "The ADU Home Density Bonus Program",
      paragraphs: [
        "San Diego's bonus program lets you add a non-deed-restricted ADU for each qualifying affordable ADU you build, in designated Sustainable Development Areas. Outside those areas the cap is one bonus ADU.",
        "The August 2025 amendments narrowed this significantly: under SDMC § 141.0302(d)(1)(A), the program no longer applies in the RS-1-1 through RS-1-4 and RS-1-8 through RS-1-11 zones unless your parcel sits in a High or Highest CTCAC Opportunity Area and is designated Residential in a land use plan. RS-1-5, RS-1-6 and RS-1-7 are not on that list. If you were counting on the bonus program, confirm your zone first — a lot of 2024-era advice about it is now wrong.",
        "There is also a Community Enhancement Fee on affordable ADUs of 750 square feet or less, with waivers available in certain resource areas.",
      ],
    },
  ],
  fees: {
    heading: "Permit fees",
    paragraphs: [
      "San Diego publishes its construction permit fees in Development Services Information Bulletin 501, which is the schedule to check for your project.",
      "State law exempts ADUs with 750 square feet of interior livable space or less from local impact fees; larger units are charged proportionately to the primary dwelling. School fees and utility connection charges follow separate rules; confirm your project's assessment with the district and providers.",
    ],
    bullets: [
      "Local impact fees: exempt at 750 sq ft of interior livable space or less; proportional above",
      "School fees: confirm the applicable assessment with your school district",
      "Official fee schedule: Information Bulletin 501 (Fee Schedule for Construction Permits - Structures)",
    ],
  },
  processIntro:
    "Roughly 3 to 5 months for a standard permit, or 5 to 7 months inside the Coastal Zone (design and construction sit on top of that). Most San Diego ADUs follow the ministerial permit pathway outlined in Information Bulletin 400:",
  processSteps: [
    {
      title: "Confirm your overlays",
      detail:
        "Check your parcel against the Coastal Overlay Zone, High and Very High Fire Hazard Severity Zone, and Transit Priority Area maps before anything else. These determine setbacks, fire-code limits, parking, and review timelines.",
    },
    {
      title: "Pick a plan path",
      detail:
        "Choose between custom architectural drawings and city preapproved standard plans. Standard plans shorten plan check review into a streamlined verification.",
    },
    {
      title: "Prepare the submittal",
      detail:
        "Assemble architectural site plans, structural calculations, Title 24 energy calculations, and soils/geotechnical reports per Information Bulletin 400.",
    },
    {
      title: "Submit to Development Services",
      detail:
        "File through the city's online permit portal. Complete submittals are reviewed ministerially without a public hearing.",
    },
    {
      title: "Permit, build, inspect",
      detail:
        "Pull building permits, begin construction, and schedule required building, trade, and final inspections.",
    },
  ],
  permitPortal: {
    label: "City of San Diego ADU Information Bulletin 400",
    url: "https://www.sandiego.gov/development-services/forms-publications/information-bulletins/400",
  },
  faqs: [
    {
      question: "Can I build an ADU to my property line in San Diego?",
      answer:
        "Yes, if it is no taller than 16 feet and not in a High or Very High Fire Hazard Severity Zone, provided building and fire codes do not require a larger setback or wall separation. Over 16 feet next to a residential zone, you owe 4 feet, or your base zone's setback if smaller (outside the Coastal Zone).",
    },
    {
      question: "Can an ADU occupy the front yard in San Diego?",
      answer:
        "Generally no, but SDMC § 141.0302(b)(4) provides a qualifying exception: one ADU of up to 800 square feet may encroach into the required front setback if complying with the base-zone setback would otherwise preclude building it.",
    },
    {
      question: "How many ADUs can I put on a single-family lot in San Diego?",
      answer:
        "You can combine one JADU, one converted ADU such as a garage conversion, and one detached or attached ADU. Lot area doesn't limit those three. It caps the total only under the ADU Home Density Bonus Program: 4 ADUs and JADUs on 8,000 sq ft or less, 5 on 8,001 to 10,000 sq ft, and 6 above that (SDMC § 141.0302(d)(4)).",
    },
    {
      question: "How big can a San Diego ADU be?",
      answer:
        "150 to 1,200 square feet for an ADU. A JADU is 150 to 500 square feet and must sit entirely within the existing house.",
    },
    {
      question: "Do I need to add parking for an ADU in San Diego?",
      answer:
        "Usually not. Exceptions are a garage conversion in the Beach Impact Overlay Zone outside a Transit Priority Area, and Bonus Program ADUs outside a Transit Priority Area.",
    },
    {
      question: "Can my ADU be two stories?",
      answer:
        "In single-dwelling zones, detached ADUs are capped at two stories. Overall height still has to conform to your base zone.",
    },
    {
      question: "Does the Coastal Zone change anything?",
      answer:
        "Considerably. The 2025 and 2026 amendments apply outside the Coastal Zone only. Inside it, the prior ordinance governs until the Coastal Commission certifies the changes, and permit timelines run longer — 5 to 7 months rather than 3 to 5.",
    },
    {
      question: "What does an ADU cost to build in San Diego?",
      answer:
        "LotFoundry's San Diego ADU cost guide has build cost, rent and payback estimates by unit size. They use a national construction cost base, not a San Diego contractor quote, and already include a soft-cost allowance. The City's Information Bulletin 501 is the source for construction permit fees.",
    },
    {
      question: "Is an ADU worth it in San Diego?",
      answer:
        "It depends almost entirely on your lot and your build size, which is what the Studio is for. The inputs that decide it are buildable area after setbacks, build cost at your chosen size, and achievable rent for that size in your neighborhood.",
    },
  ],
  neighbors: ["chula-vista", "escondido", "imperial-beach", "san-diego-county", "la-mesa", "el-cajon"],
  sources: [
    {
      label: "City of San Diego Development Services — ADU / JADU Program",
      url: "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    },
    {
      label: "City of San Diego Development Services — Regulatory Updates",
      url: "https://www.sandiego.gov/development-services/regulatory-updates",
    },
    {
      label: "California Department of Housing and Community Development — ADU",
      url: "https://www.hcd.ca.gov/building-standards/adu",
    },
    {
      label: "San Diego Municipal Code § 141.0302 (ADU Regulations)",
      url: "https://docs.sandiego.gov/municode/MuniCodeChapter14/Ch14Art01Division03.pdf",
    },
    {
      label: "San Diego Information Bulletin 501 (Fee Schedule for Construction Permits)",
      url: "https://www.sandiego.gov/development-services/forms-publications/information-bulletins/501",
    },
  ],
};
