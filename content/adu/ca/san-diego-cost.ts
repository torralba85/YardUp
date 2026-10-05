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
 * The fee copy moved here unchanged from `san-diego.ts`, which was verified
 * against Information Bulletins 400 and 501 on 2026-09-18 — hence that as-of
 * date. The per-square-foot permit figures are commonly reported ranges and
 * stay labeled as such; Bulletin 501 is the authority.
 *
 * @module adu/ca/san-diego-cost
 */
import type { JurisdictionCostContent } from "@/lib/adu/types";

export const sanDiegoCost: JurisdictionCostContent = {
  state: "ca",
  slug: "san-diego",
  asOf: "2026-09-18",
  metaTitle: "ADU Cost in San Diego (2026): Build, Rent & Payback",
  metaDescription:
    "What a San Diego ADU costs to build, rents for and takes to pay back, by size from 400 to 1,200 sq ft, plus City permit fees and a free calculator.",
  h1: "ADU Cost in San Diego (2026)",
  introAnswer: [
    "These are planning estimates for a new detached backyard home, whether it is for family, for rental income or for what comes next. Rent uses San Diego County's HUD Fair Market Rent, so the rent and payback figures hold across the county. Build cost uses LotFoundry's national construction base rather than a San Diego contractor survey, so compare it with site-specific quotes before you set a budget.",
  ],
  coveredCities: ["chula-vista", "oceanside", "escondido", "carlsbad"],
  fees: {
    heading: "City of San Diego permit and impact fees",
    paragraphs: [
      "Inside City of San Diego limits, construction permit fees come from Development Services Information Bulletin 501. The figures below are commonly reported ranges, not the City's fee schedule, so check Bulletin 501 for your project.",
      "State law limits what the City can add: no impact fees under 750 square feet, proportional fees above that, and no school fees under 500 square feet. That is one reason a smaller unit can pencil out better than its size suggests.",
      "The model's soft-cost allowance already covers design, engineering and permits. Reconcile your actual fees against it rather than adding them twice.",
    ],
    bullets: [
      "Permit fees: commonly reported around $26–28 per square foot (reduced near $13/sq ft under 500 sq ft)",
      "Plan check fees: typically $1,500–$2,500 depending on project complexity",
      "Development impact fees: none under 750 sq ft; proportional above",
      "School fees: exempt under 500 sq ft",
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
      label: "HUD Fair Market Rents (FY2026)",
      url: "https://www.huduser.gov/portal/datasets/fmr.html",
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
