/**
 * San Diego ADU cost page content (`/adu/ca/san-diego/cost`).
 *
 * Split from the San Diego rules guide on 2026-10-05: search results for
 * "adu cost san diego" (builder cost articles) and "adu san diego" (official
 * program pages and builders) share no top-10 URL, so cost and rules each get
 * their own page. Build cost, rent, and payback figures are computed by the
 * page from `cityMarketAggregate("san-diego")`; nothing numeric about them is
 * typed here.
 *
 * Fee guidance checked against City Information Bulletins 400 and 501 and
 * the March 2026 HCD handbook on 2026-10-06. Project-specific plan-check and
 * inspection fees must come from Bulletin 501, not unsourced typical ranges.
 *
 * @module adu/ca/san-diego-cost
 */
import type { JurisdictionCostContent } from "@/lib/adu/types";

export const sanDiegoCost: JurisdictionCostContent = {
  state: "ca",
  slug: "san-diego",
  asOf: "2026-10-06",
  published: "2026-10-06",
  metaTitle: "ADU Cost in San Diego (2026): $231K–$289K for 600 Sq Ft",
  metaDescription:
    "ADU cost in San Diego for 2026: $231K–$289K for 600 sq ft, $2,335/mo HUD rent, 13.3-yr payback, size-by-size estimates, and City permit fees.",
  h1: "ADU Cost in San Diego (2026)",
  introAnswer: [
    "Compare detached ADU sizes below to see how floor area affects your budget. These estimates use a national construction model and San Diego County's HUD Fair Market Rent. For a budget you can build to, request local quotes that itemize site work, utility connections and City of San Diego permit fees.",
  ],
  coveredCities: ["chula-vista", "oceanside", "escondido", "carlsbad", "imperial-beach", "la-mesa", "san-marcos", "san-diego-county", "encinitas", "el-cajon", "vista"],
  fees: {
    heading: "City of San Diego permit and impact fees",
    paragraphs: [
      "Inside City of San Diego limits, use Development Services Information Bulletin 501 to price plan review and inspection for your project. The schedule distinguishes detached ADUs up to 500 square feet from larger detached units, and attached units have separate size categories. There is no single permit price per square foot for every ADU.",
      "California's March 2026 ADU Handbook says ADUs with 750 square feet of interior livable space or less are exempt from local impact fees; larger units are charged proportionately to the primary dwelling. School fees and utility connection charges have separate rules, so request an itemized assessment.",
      "The model's 18% soft-cost allowance ($38,340 on a 600 sq ft detached ADU) covers design, engineering, and permits together. Reconcile your actual architectural quote and City IB 501 plan-check, submittal, and inspection invoices against that $38,340 budget rather than adding them on top.",
      "Outside City of San Diego limits, fee rules differ by jurisdiction. For instance, Chula Vista offers council-authorized flat review fees for its preapproved standard plans instead of IB 501, so check the city fee guide for your parcel.",
    ],
    bullets: [
      "Plan review and inspection: use the applicable project category in Bulletin 501",
      "Local impact fees: exempt at 750 sq ft of interior livable space or less; proportional above",
      "School fees: confirm the applicable assessment with your school district",
      "Utility connections and capacity charges: request provider-specific estimates",
      "Official fee schedule: Information Bulletin 501 (Fee Schedule for Construction Permits - Structures)",
    ],
  },
  conversions: {
    heading: "Garage conversions and junior ADUs",
    paragraphs: [
      "Every figure on this page prices a new detached unit. A garage conversion, or a junior ADU (JADU) inside the house, reuses walls, a roof and often utilities, so its cost depends on what is already there. The model does not price conversions.",
      "San Diego allows one JADU, one converted ADU and one new detached or attached ADU on the same single-family lot. If you are weighing a conversion against a new backyard home, price both from a site visit: structural work, fire separation and utility capacity decide the difference.",
    ],
  },
  quoteChecklist: {
    heading: "What to ask for in a San Diego ADU quote",
    paragraphs: [
      "Ask the builder to separate the costs below and to mark which items are allowances and which are excluded, so two quotes cover the same scope.",
      "Use the tables to compare sizes; use the City's current fee schedule and a site-specific quote for your budget.",
    ],
    bullets: [
      "Construction of the unit itself",
      "Design and engineering, including structural and Title 24 energy calculations",
      "City plan check and permit fees",
      "Utility connections",
      "Site work such as grading, access and demolition",
    ],
  },
  faqs: [
    {
      question: "Does the estimate include permit fees?",
      answer:
        "Partly. The model adds a soft-cost allowance for design, engineering and permits on top of construction. Compare your actual design quote and the City's Information Bulletin 501 fees against that allowance rather than adding them on top.",
    },
    {
      question: "Is a garage conversion cheaper than a new ADU in San Diego?",
      answer:
        "It can be, because the walls and roof already exist, but the model does not price conversions. Structural work, fire separation and utility upgrades decide the real cost, so get a quote from a site visit.",
    },
    {
      question: "Do these numbers apply outside the City of San Diego?",
      answer:
        "The rent and payback figures do, because they use San Diego County's HUD Fair Market Rent. Fees do not: Chula Vista, Oceanside, Escondido, Carlsbad and the unincorporated county each set their own, so check the guide for your address.",
    },
    {
      question: "Why is the San Diego build cost the same as in Los Angeles?",
      answer:
        "The model prices construction on one national cost base until a verified regional factor is available; only rent is local. A San Diego builder's quote can differ, so treat the table as a starting point.",
    },
  ],
  sources: [
    {
      label: "HUD Fair Market Rents (FY2027)",
      url: "https://www.huduser.gov/datasets/fmr/fmr2027",
    },
    {
      label: "San Diego Information Bulletin 501 (Fee Schedule for Construction Permits)",
      url: "https://www.sandiego.gov/development-services/forms-publications/information-bulletins/501",
    },
    {
      label: "City of San Diego Development Services — ADU / JADU Program",
      url: "https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units",
    },
    {
      label: "California HCD ADU Handbook",
      url: "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf",
    },
    {
      label: "County of San Diego ADU program (unincorporated areas)",
      url: "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu.html",
    },
  ],
};
