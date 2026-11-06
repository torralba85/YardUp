/**
 * City of San José ADU jurisdiction content.
 *
 * Primary sources, read in Chrome on 2026-10-28 (the City's site refuses
 * automated readers): Building Bulletin 210, the ADU Universal Checklist
 * (updated 09/16/2026), which tabulates the City and State development
 * standards of Municipal Code Chapter 20.80 Part 2.75 (§§20.80.175,
 * 20.80.176, 20.80.178) plus the fire, address, tree and impact-fee checks;
 * the City's ADU Project Process page; its Preapproved ADUs page; and its
 * ADU FAQs.
 *
 * Like Sacramento, San José makes the owner design to one set of standards,
 * City or State, never a mix. The page leads with that choice. Pre-approved
 * plan vendors are not named.
 *
 * Rechecked in Chrome on 2026-11-03: Bulletin 210 (updated 09/16/2026, all
 * six pages), the ADU FAQs and the Preapproved ADUs page, plus HCD's ADU
 * Handbook (March 2026) for school fees, JADU occupancy and JADU rentals,
 * and Municipal Code §§20.80.175-.179 on Municode (version of 2026-10-26).
 * The checklist governs; where the FAQ or State guidance says something
 * different (school fees, the exact-750 sq ft case), the page says so.
 *
 * @module adu/ca/san-jose
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const sanJose: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "San José",
  slug: "san-jose",
  county: "Santa Clara County",
  asOf: "2026-11-03",
  published: "2026-10-29",
  metaTitle: "San José ADU Rules (2026): Size, Height & Cost",
  metaDescription:
    "San José ADU rules: detached ADUs of 1,000–1,200 sq ft by lot size, 4 ft setbacks, no parking, and a City-or-State choice. Plus cost, rent and payback.",
  introAnswer: [
    "Yes. San José allows an ADU in any zoning district where the lot has a legally built, permitted home, and its ADU Universal Checklist (Bulletin 210, updated September 2026) makes you design to one of two sets of standards: the City's (Municipal Code §20.80.175) or the State's (§20.80.176). You cannot mix them.",
    "Under City standards, a single-family lot gets one ADU, attached or detached, plus a junior ADU. A detached ADU can be 1,000 square feet on a lot of 9,000 square feet or less and 1,200 square feet on a larger lot, at 18 feet for one story or 25 feet for two. Under State standards you can have a new ADU of up to 800 square feet, a conversion and a junior ADU, but a new detached unit is limited to 16 feet.",
    "Neither path requires parking. The City's checklist lists no school or parkland impact fees for an ADU of 750 square feet or less, but school fees are set by the school district, and State guidance lets districts charge for an ADU over 500 square feet.",
  ],
  metaSizeNote: "of 1,000–1,200 sq ft by lot size under City standards",
  metaSetbackNote: "4 ft side and rear setbacks",
  metaParkingNote: "no parking",
  glance: [
    { label: "Two sets of standards", value: "Design to City standards (§20.80.175) or State standards (§20.80.176), never a mix", note: "Bulletin 210, Part 3" },
    { label: "Units — City standards", value: "1 ADU (attached or detached) + 1 JADU on a single-family lot", note: "Duplex and multifamily lots: 1 ADU" },
    { label: "Units — State standards", value: "1 new ADU of up to 800 sq ft + 1 conversion ADU + 1 JADU", note: "A new attached ADU is not allowed alongside a conversion ADU. Multifamily lots: up to 8 detached ADUs on an existing building (not more than its units) and conversions of up to 25% of the units" },
    { label: "Max size — detached", value: "City: 1,000 sq ft on lots of 9,000 sq ft or less; 1,200 sq ft on larger lots. State: 800 sq ft", note: "Minimum 150 sq ft either way. Under City standards, converting an existing detached accessory structure has no size cap (§20.80.175(D)(1)(d))" },
    { label: "Max size — attached", value: "City: 50% of the main home, up to 1,000 sq ft (lots of 9,000 sq ft or less) or 1,200 sq ft (larger lots)" },
    { label: "Max size — JADU", value: "500 sq ft, inside the home's existing footprint (an attached garage counts) or a proposed new home" },
    { label: "How size is measured", value: "Each livable floor, measured to the exterior finish", note: "The main home's figure excludes garages and unfinished attics and basements; a stairwell counts once" },
    { label: "Max height", value: "City: detached 18 ft (1 story) or 25 ft (2 stories); attached 25 ft. State: detached 16 ft; attached 25 ft", note: "State detached: up to 2 ft more for a pitched roof within a half-mile walk of a major transit stop or high-quality transit corridor" },
    { label: "Side and rear setbacks", value: "4 ft", note: "Under City standards, a zero setback is allowed for an attached ADU, a JADU or the ground floor of a detached ADU if building and fire codes are met" },
    { label: "Where a detached ADU sits", value: "City standards: in the rear yard, or at least 45 ft from the front property line with a 4 ft interior side setback, with rear-yard coverage of 40% or less and 6 ft from the main home", note: "Pools don't count toward the 40%, and neither the 40% nor the front setback can block an 800 sq ft ADU with 4 ft side and rear setbacks (§20.80.175)" },
    { label: "Parking required", value: "None", note: "Under City or State standards" },
    { label: "Fire access", value: "Every side of the ADU within 150 ft of the street curb along a 4 ft clear path, and its walls within 600 ft of a hydrant", note: "Otherwise a fire variance with added safety measures may be needed" },
    { label: "Renting and selling", value: "ADU rentals must be at least 30 days, even when listed on a short-term rental site, and JADU rentals longer than 30 days; selling the ADU separately requires a condominium conversion", note: "JADU: an owner must live on the property only if the JADU shares sanitation with the main home, in either the main home or the JADU (Gov. Code §66333)" },
  ],
  cityDiffers: [
    {
      heading: "City or State standards: one set for the whole project",
      paragraphs: [
        "San José's checklist puts the choice up front: design the ADU to the City's development standards or to the State's, and the two cannot be mixed. City standards allow a bigger unit, a detached ADU of 1,000 square feet on a lot of 9,000 square feet or less and 1,200 square feet on a larger one, up to 25 feet and two stories. The trade-off is one ADU plus a junior ADU, and more rules about where it sits. A detached ADU goes in the rear yard, or at least 45 feet from the front property line if it keeps a 4-foot interior side setback. Structures may cover no more than 40% of the rear yard (pools excluded), and the ADU needs 6 feet of separation from the main home. Neither the 40% limit nor the zone's front setback can rule out an 800-square-foot ADU with 4-foot side and rear setbacks (Municipal Code §20.80.175). An attached ADU's front door must be on a different side of the house from the main entrance.",
        "State standards let you add more units with fewer local rules. A single-family lot can have a new ADU of up to 800 square feet, an ADU converted from existing space (which may grow by 150 square feet for access) and a junior ADU. The new unit can be attached, up to 25 feet, or detached, up to 16 feet, plus 2 feet for a pitched roof near a major transit stop. A new attached ADU is not allowed when there is also a conversion ADU. No other City design standard applies, including the historic-property rules in §20.80.175(E) that bind City-standard projects.",
        "Under either path a JADU is limited to 500 square feet inside the home's existing footprint, which can include an attached garage. An owner must live on the property only if the JADU shares bathroom facilities with the main home, and State law lets that owner live in either the main home or the JADU (Gov. Code §66333). A JADU that is rented must be rented for longer than 30 days.",
      ],
    },
    {
      heading: "Fire access shapes many San José site plans",
      paragraphs: [
        "Before the City approves a plan, its Bureau of Fire Prevention checks how firefighters would reach the ADU. Every side of the unit must be within 150 feet of the street curb, measured along a clear path at least 4 feet wide, and every exterior wall within 600 feet of a hydrant. Miss either and the project may need a fire variance with added safety measures. The nearest hydrant must also deliver 1,000 gallons per minute at 20 psi. You prove it with a letter from your water company, and the City says a missing water-flow letter is one of the most common causes of permit delays, so request it early.",
        "Sprinklers follow the house. If the main home has fire sprinklers, the ADU needs them too. An attached ADU over 500 square feet that brings the combined floor area above 3,600 square feet requires sprinklers in both the house and the ADU. Both addresses must be legible from the street, so the ADU gets its own unit number through the City's address request form, posted again beside the ADU's entry. Lots in a wildland-urban interface zone must also meet the Fire Department's WUI requirements.",
      ],
    },
    {
      heading: "Site conditions to check before you design",
      paragraphs: [
        "The checklist sends you to SJPermits.org to look up designations that change the design. In flood zones A, AE, AH or AO, the plans must follow the City's flood-zone design requirements. A geohazard or landslide designation requires a geologic hazard clearance, and a liquefaction zone does too once you build two or more units. Easements often allow no construction at all, so check the title report. A former swimming pool leaves a nonbuildable area until you document its demolition or provide a geotechnical report.",
        "The main home must be legally built with approved permits, and any open code-enforcement case must be resolved before the City will accept ADU plans. An existing unpermitted ADU may still be legalized through the City's ADU Amnesty Program (§20.80.179) or under State law (AB 2533); the City's ADU Ally team reviews whether a unit qualifies. An ordinance-size tree (38 inches or more in circumference, 4.5 feet above ground) can be removed for an ADU without a removal permit but must be replaced, while a heritage tree still needs a permit. PG&E now requires a separate electric meter for an ADU, though not for a JADU. Under City standards, on a lot of half an acre or more, the ADU must sit more than 100 feet from a riparian corridor. This City-standard setback does not apply to State-standard ADUs.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in San José",
    paragraphs: [
      "Building permit fees follow the ADU's size under the City's Building Fee Schedule, and the City offers a Building Fee Estimator for a first figure. You pay the initial plan review fee after the prescreen. Residual plan review, inspection, school and parkland fees are due before the permit is issued.",
      "Size decides the impact fees. Under the City's checklist, an ADU of 750 square feet or less pays no school or parkland impact fees, while one of 751 square feet or more pays both, and the permit is not issued until they are paid; staff give you a school fee referral form at submittal. School fees belong to the school district, and State guidance lets districts charge for an ADU over 500 square feet of interior livable space, so ask the district about a unit between 501 and 750 square feet. The City's FAQ words the exemption as less than 750 square feet, so confirm a design of exactly 750. Parkland fees vary by location on the City's map. Geologic hazard clearance, a tree removal permit or a fire variance each carry their own fee when needed.",
      "An optional preliminary meeting with a planner, for feedback on your plans before you submit, is billed at the Planning Division's rate of $398 an hour with a 30-minute minimum. Basic zoning questions can go to the Planning Division by phone or email. The City notes that property taxes rise with the value the ADU adds.",
    ],
    bullets: [
      "Building permit: by ADU size, per the Building Fee Schedule (estimate with the City's Building Fee Estimator)",
      "School and parkland impact fees: none at 750 sq ft or less under the City's checklist; both apply at 751 sq ft or more (school districts may charge above 500 sq ft, so ask yours)",
      "Optional preliminary planner meeting: $398/hour, 30-minute minimum",
      "As needed: geologic hazard clearance, tree removal permit, fire variance",
      "PG&E: a separate electric meter for an ADU (not for a JADU)",
    ],
  },
  processIntro:
    "Every ADU in San José needs a building permit, applied for through SJPermits and reviewed in SJePlans. The City says the first round of building review typically takes 20 business days, and accurate, complete plans keep a project to one or two review cycles. On a qualifying lot, a pre-approved plan can be permitted the same day as its plan review meeting.",
  processSteps: [
    {
      title: "Complete the ADU Universal Checklist",
      detail:
        "Work through Bulletin 210: confirm the lot is in San José, the main home is permitted and there is no open code case, look up flood, geohazard, historic, WUI and easement designations, and choose City or State standards.",
    },
    {
      title: "Get planner feedback if you need it",
      detail:
        "Ask the Planning Division basic zoning questions by phone or email, or book a preliminary virtual meeting ($398/hour, 30-minute minimum) and send the checklist, your City or State choice, and draft site and floor plans.",
    },
    {
      title: "Prepare plans and documents",
      detail:
        "Draw plans to Bulletin 211, add Title 24 energy calculations, a geotechnical report if required, the water company's hydrant flow letter, the address request (Form 302) and the owner declaration (Form 312). A JADU uses the deed restriction agreement (Form 313), which needs a wet signature.",
    },
    {
      title: "Apply online",
      detail:
        "Use the City's Application Wizard, open an SJPermits.org account and name the ePlan Applicant, who uploads the package to SJePlans and answers every review comment.",
    },
    {
      title: "Prescreen, plan review and issuance",
      detail:
        "A permit specialist prescreens the package and invoices the initial review fee, plan reviewers comment in SJePlans, and after approval the permit issues once residual review, inspection, school and parkland fees are paid.",
    },
    {
      title: "Build and pass inspections",
      detail:
        "Show inspectors the approved plans, the permit card and the City's ADU inspection checklist (Bulletin 213), and complete the construction and demolition debris diversion sign-off before the final inspection.",
    },
  ],
  permitPortal: {
    label: "City of San José — Accessory Dwelling Units (ADUs)",
    url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus",
  },
  faqs: [
    {
      question: "How big can an ADU be in San José?",
      answer:
        "Under City standards, a detached ADU can be 1,000 square feet on a lot of 9,000 square feet or less and 1,200 square feet on a larger lot; an attached ADU can be half the main home, up to the same caps. Under State standards, a new ADU is capped at 800 square feet. A junior ADU is capped at 500 square feet.",
    },
    {
      question: "Do I need parking for an ADU in San José?",
      answer:
        "No. The City's ADU checklist lists no parking requirement under either City or State standards.",
    },
    {
      question: "How many ADUs can I build on a single-family lot in San José?",
      answer:
        "Under City standards, one ADU, attached or detached, plus a junior ADU. Under State standards, up to three: a new ADU of up to 800 square feet, an ADU converted from existing space, and a junior ADU, though a new attached ADU is not allowed alongside a conversion.",
    },
    {
      question: "How tall can an ADU be in San José?",
      answer:
        "Under City standards, a detached ADU can be 18 feet for one story or 25 feet for two, and an attached ADU 25 feet. Under State standards, a new detached ADU is limited to 16 feet, with up to 2 more for a pitched roof near a major transit stop, and an attached ADU to 25 feet.",
    },
    {
      question: "What are the ADU setbacks in San José?",
      answer:
        "4 feet on the side and rear. Under City standards, a zero setback is allowed for an attached ADU, a junior ADU or the ground floor of a detached ADU if building and fire codes are met, and a detached ADU sits in the rear yard or at least 45 feet from the front property line with a 4-foot interior side setback. The front setback and the 40% rear-yard limit cannot block an 800-square-foot ADU with 4-foot side and rear setbacks.",
    },
    {
      question: "Does San José have pre-approved ADU plans?",
      answer:
        "Yes. Vendors offer City-reviewed plans for detached ADUs from 476 to 991 square feet. On a residential lot with a single-family home or duplex, outside geohazard, landslide, flood and wildland-urban interface zones, the permit can be issued the same day as the plan review meeting if the site documents are complete. A deferred structural submittal, a clearance or a variance can take longer.",
    },
    {
      question: "Does San José charge impact fees for an ADU?",
      answer:
        "Not for an ADU of 750 square feet or less, under the City's checklist. At 751 square feet or more, school and parkland impact fees apply and must be paid before the permit is issued. School fees are set by the school district, and State guidance lets districts charge for an ADU over 500 square feet, so confirm with yours. Building permit fees apply to every ADU and scale with its size.",
    },
    {
      question: "How long does an ADU permit take in San José?",
      answer:
        "The first round of building review typically takes 20 business days, according to the City, and complete, accurate plans keep you to one or two rounds. Request the water company's hydrant flow letter early, since a missing letter is a common cause of delay.",
    },
    {
      question: "Can I rent out or sell my granny flat in San José?",
      answer:
        "You can rent the house and the ADU to different tenants, for terms of at least 30 days, even when listed on a short-term rental site. To sell the ADU separately, you first need a condominium conversion of the home and ADU.",
    },
  ],
  neighbors: [],
  sources: [
    {
      label: "California HCD — ADU Handbook (March 2026: school fees, JADU occupancy and rentals)",
      url: "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf",
    },
    {
      label: "City of San José Bulletin 210 — ADU Universal Checklist (updated 09/16/2026, PDF)",
      url: "https://www.sanjoseca.gov/home/showpublisheddocument/39038/638572568385100000",
    },
    {
      label: "City of San José — Accessory Dwelling Units (ADUs)",
      url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus",
    },
    {
      label: "City of San José — ADU Project Process",
      url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/adu-plan-review-permit-process",
    },
    {
      label: "City of San José — Preapproved ADUs",
      url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/preapproved-adus",
    },
    {
      label: "City of San José — ADU FAQs (fees, rentals, utilities, fire)",
      url: "https://www.sanjoseca.gov/business/development-services-permit-center/accessory-dwelling-units-adus/adu-faqs",
    },
  ],
};
