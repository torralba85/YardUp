/**
 * La Mesa ADU jurisdiction content.
 *
 * Primary sources: the City's "Accessory Dwelling Unit and Junior Accessory
 * Dwelling Unit: Development Matrix" (updated 2026), the Housing division's
 * ADU page (pre-approved plans and how to apply), and La Mesa Municipal Code
 * §24.05.020(D)(8)–(9), the ADU and JADU provisions.
 *
 * The code text still cites the pre-2024 statute (§65852.2) and lists one
 * attached ADU, one detached ADU and one JADU per single-family lot, with
 * JADU owner-occupancy in every case. The 2026 matrix applies current state
 * law (three ADUs, owner-occupancy only with shared sanitation), and the City
 * says it applies new state law as soon as it takes effect. The page leads
 * with the matrix and says where the two differ.
 *
 * @module adu/ca/la-mesa
 */
import type { JurisdictionContent } from "@/lib/adu/types";

const laMesaAduProgram = {
  label: "City of La Mesa — Accessory Dwelling Units",
  url: "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
};

const laMesaDevelopmentMatrix = {
  label: "City of La Mesa ADU and JADU Development Matrix (2026, PDF)",
  url: "https://www.cityoflamesa.gov/DocumentCenter/View/26946",
};

export const laMesa: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "La Mesa",
  slug: "la-mesa",
  county: "San Diego County",
  asOf: "2026-10-24",
  published: "2026-10-24",
  metaTitle: "La Mesa ADU Requirements (2026): Setbacks & Permits",
  h1: "La Mesa ADU Requirements and Permits (2026)",
  metaDescription:
    "Check La Mesa ADU requirements for size, setbacks, height and parking. Read the City’s 2026 development matrix and see how to apply for a permit.",
  introAnswer: [
    "Yes — La Mesa's 2026 ADU matrix allows up to three ADUs on a single-family lot plus a junior ADU: one under the state's general ADU rules, one converted from existing space, and one new detached unit of up to 800 square feet. A detached ADU can be up to 1,200 square feet.",
    "La Mesa requires no parking for ADUs. No new, additional or replacement spaces are required anywhere in the city, so a garage converted to an ADU does not have to be replaced with another space.",
    "The limits that shape a La Mesa design are height and coverage. In single-family zones the City's matrix caps ADUs at 20 feet, measured from finished grade to the top of the plate line, and lot coverage at 40%, although state law still guarantees an 800 square foot ADU with 4-foot side and rear setbacks.",
  ],
  metaSizeNote: "up to 1,200 sq ft detached, plus a second detached ADU of up to 800 sq ft",
  metaSetbackNote: "4 ft side and rear",
  metaParkingNote: "no new, additional or replacement parking",
  glance: [
    { label: "Units allowed — single-family lot", value: "Up to 3 ADUs plus 1 JADU", note: "One under Gov. Code §66314, one conversion under §66323(a)(1), one new detached ADU of up to 800 sq ft under §66323(a)(2), per the City's 2026 matrix" },
    { label: "Max size — detached", value: "1,200 sq ft; the second detached ADU up to 800 sq ft", note: "Minimum 150 sq ft" },
    { label: "Max size — attached", value: "50% of the existing house's floor area", note: "The state-law size floors below also apply" },
    { label: "Max size — JADU", value: "500 sq ft, within the existing or proposed house", note: "JADUs are allowed on single-family zoned lots only" },
    { label: "Max height", value: "20 ft in single-family zones, from finished grade to top of plate line", note: "R2 zone: 20 ft; R3 and RB zones: 30 ft. Sloped lots follow LMMC §24.05.030(B)(3)" },
    { label: "Rear and side setbacks", value: "4 ft minimum", note: "Measured from the property line or the inside edge of an access easement, whichever is more restrictive. Conversions keep the existing setbacks" },
    { label: "Front setback", value: "Per the zone", note: "With the front-yard exception in Gov. Code §66321(b)(3). Detached ADUs on multifamily lots: 15 ft" },
    { label: "Lot coverage", value: "40% maximum in single-family zones", note: "Coverage cannot block an ADU of at least 800 sq ft with 4 ft side and rear setbacks" },
    { label: "Parking required", value: "None", note: "No new, additional or replacement spaces for ADUs, including when a garage is converted or demolished" },
    { label: "Owner-occupancy and rentals", value: "No owner-occupancy for ADUs; rentals must be longer than 30 days", note: "For a JADU, the matrix requires an owner in the house or JADU only if they share sanitation facilities" },
    { label: "Fire sprinklers", value: "Required only if the main house is required to have them", note: "The City's matrix also lists a 150 ft curb-distance trigger, but state law and La Mesa's own code tie ADU sprinklers to the house" },
  ],
  cityDiffers: [
    {
      heading: "No parking, a 20-foot plate line and a 40% coverage cap",
      paragraphs: [
        "La Mesa goes further than state law on parking. The Municipal Code says new or additional parking spaces shall not be required for an ADU, and when a garage, carport or covered parking is demolished or converted for an ADU, the lost spaces do not have to be replaced. State law only waives the space in listed cases such as near transit; in La Mesa it is waived for every ADU. Any parking you choose to add must still meet the City's parking design standards.",
        "Height is measured in an unusual way. The City's matrix sets 20 feet for ADUs in the R1E, R1R, R1S, R1 and R1A zones and in R2, and 30 feet in R3 and RB, and its footnote says height is measured from finished grade to the top of the plate line, the top of the wall framing. On a sloped lot the Municipal Code's sloped-grade rule in §24.05.030(B)(3) applies, so confirm how your roof and grade will be measured before you settle on a two-story design.",
        "Lot coverage is the other constraint. The matrix caps coverage at 40% in single-family zones, but the code adds that no coverage limit, front setback, open-space rule or minimum lot size may stop an ADU of at least 800 square feet with 4-foot side and rear setbacks. Two practical details: every ADU needs its own address (a JADU does not), and sprinklers follow the house. The matrix also lists sprinklers when the rear of the ADU is 150 feet or more from the face of the curb, but state law, as the March 2026 HCD handbook explains, and La Mesa's own code allow ADU sprinklers to be required only when the main house must have them. On a deep or flag lot, ask the fire marshal which rule they apply, and how they want fire access handled, before you price sprinklers.",
      ],
    },
    {
      heading: "Overlays, historic sites and easements",
      paragraphs: [
        "Several La Mesa overlay zones still apply to ADUs, without the hearing they would trigger for other projects. The Scenic Preservation Overlay (Chapter 24.09) and Hillside Overlay (Chapter 24.13) standards apply, but a project that only proposes an ADU does not go to the Planning Commission. ADU-only projects are exempt from the Urban Design Overlay (Chapter 24.11) and the Urban Design Program. In the Bowling Green Overlay, a required tree disturbed by an ADU must be preserved in place or replaced in kind on the property.",
        "On a designated historical site or in a historical district, a detached ADU must sit behind the primary residence or historic structure, match its architectural style and finish materials, and cannot cause the removal of a historically significant garage, outbuilding or stable. If the property has a Mills Act contract, the contract must be amended to allow the ADU.",
        "Two rules affect where the 4-foot setback is measured and what you pay for. The side and rear setback runs from the property line or the inside edge of an adjacent access easement, whichever is more restrictive, which matters on lots served by a shared driveway. And a project that only adds an ADU is exempt from public right-of-way dedication and street improvement requirements.",
      ],
    },
    {
      heading: "The code text lags the City's 2026 matrix",
      paragraphs: [
        "La Mesa's Municipal Code section on ADUs, §24.05.020(D)(8), still cites the pre-2024 statute number and lists one attached ADU, one detached ADU and one JADU per single-family lot. Its JADU section requires the owner to live in the house or the JADU in every case. The City's development matrix, updated in 2026, instead applies current state law: up to three ADUs on a single-family lot, and owner-occupancy for a JADU only when it shares sanitation facilities with the house.",
        "The City says it complies with state housing and land use bills as soon as they take effect, and the matrix is its current summary, so this guide follows the matrix. Before you design around a third ADU or a JADU without owner-occupancy, ask the Planning division to confirm in writing how it will apply the rule to your lot.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in La Mesa",
    paragraphs: [
      "La Mesa's code exempts ADUs under 750 square feet from impact fees, and state law goes slightly further: an ADU of 750 square feet of interior livable space or less pays none. Larger units are charged in proportion to the square footage of the main house. Building permit and plan check fees are separate; ask the City for an estimate once you have a plan set.",
      "Utility charges depend on how the ADU connects. An ADU is not treated as a new residential use for water and sewer connection fees or capacity charges, unless it is built with a new house. An ADU inside the existing house or an existing accessory structure needs no new utility connection and pays no connection fee. Where the lot forces a separate connection, the fee must be proportionate to the unit's size or plumbing fixture load. A JADU pays no sewer or water connection fees. On a private septic system, the County of San Diego's environmental health department must approve the ADU first.",
      "The City's five pre-approved ADU plans can cut design cost. You still provide a site plan and Title 24 energy calculations, and the City asks for a soils report only when the unit is over 500 square feet.",
    ],
    bullets: [
      "Impact fees: none at 750 sq ft of interior livable space or less; proportional to the main house above that",
      "Building permit and plan check: estimate with the City",
      "Water and sewer connection fees: none for an ADU within existing space; proportionate if a separate connection is required",
      "JADU: no sewer or water connection fees",
      "Right-of-way dedication and street improvements: not required for ADU-only projects",
      "Septic: County environmental health approval before the ADU is approved",
    ],
  },
  processIntro:
    "La Mesa reviews ADUs ministerially, with no hearing, and the Municipal Code requires a decision within 60 calendar days of an application when there is already a house on the lot. Applications for ADUs and JADUs are accepted online through the City's MaintStar permitting portal.",
  processSteps: [
    {
      title: "Check your zone and overlays",
      detail:
        "Confirm the lot's zone, which sets the height limit, and whether it is in the Scenic Preservation, Hillside or Bowling Green overlay or on a designated historical site. Note any access easement, since the 4-foot setback is measured from its inside edge.",
    },
    {
      title: "Choose a pre-approved plan or a custom design",
      detail:
        "Pick one of the City's pre-approved plans, from a 224 sq ft studio to a 1,199 sq ft three-bedroom, and email the Planning division for its official construction set. Or have a custom ADU designed to the matrix standards.",
    },
    {
      title: "Prepare the site plan and supporting documents",
      detail:
        "Draw a project-specific site plan, add Title 24 energy calculations, and include a soils report if the unit is over 500 sq ft. Fill in the project-specific information on the pre-approved plan set.",
    },
    {
      title: "Clear septic and utilities",
      detail:
        "If the house is on a private septic system, get County environmental health approval. Otherwise confirm with the water and sewer providers whether the ADU can share the house's connection.",
    },
    {
      title: "Submit through MaintStar",
      detail:
        "Upload the complete package through the City's MaintStar portal. Any demolition permit, such as for a detached garage being replaced, is reviewed with the ADU application and issued at the same time.",
    },
    {
      title: "Build, inspect and occupy",
      detail:
        "After the permit is issued, schedule the City's inspections. The ADU's certificate of occupancy cannot be issued before the main house's.",
    },
  ],
  permitPortal: laMesaAduProgram,
  quickSources: {
    heading: "Official La Mesa ADU requirements",
    links: [laMesaDevelopmentMatrix, laMesaAduProgram],
  },
  faqs: [
    {
      question: "Do I need parking for an ADU in La Mesa?",
      answer:
        "No. La Mesa requires no new, additional or replacement parking for an ADU anywhere in the city. If you convert or demolish a garage, carport or covered space for the ADU, the lost spaces do not have to be replaced.",
    },
    {
      question: "How tall can an ADU be in La Mesa?",
      answer:
        "20 feet in the single-family zones, measured from finished grade to the top of the plate line, according to the City's 2026 matrix. The R2 zone is also 20 feet, and the R3 and RB zones allow 30 feet. Sloped lots follow the code's sloped-grade rule.",
    },
    {
      question: "How many ADUs can I build on a single-family lot in La Mesa?",
      answer:
        "Up to three ADUs plus one junior ADU under the City's 2026 matrix: one under the general state rules, one converted from existing space, and one new detached ADU of up to 800 square feet. The older code text lists one attached, one detached and one junior ADU, so confirm with Planning.",
    },
    {
      question: "Does La Mesa have pre-approved ADU plans?",
      answer:
        "Yes, five: a 224 square foot studio, one-bedroom plans of 400 and 499 square feet, a 990 square foot two-bedroom and a 1,199 square foot three-bedroom. Email the Planning division for the construction set, then add a site plan and energy calculations.",
    },
    {
      question: "Do I need a soils report for a granny flat in La Mesa?",
      answer:
        "For the City's pre-approved plans, only if the unit is over 500 square feet, according to the City's ADU page. Energy calculations are needed for every project.",
    },
    {
      question: "What are the ADU setbacks in La Mesa?",
      answer:
        "At least 4 feet from the side and rear property lines, or from the inside edge of an adjacent access easement if that is more restrictive. The front setback follows the zone, with the state's front-yard exception. Converting an existing permitted structure keeps its current setbacks.",
    },
    {
      question: "Does La Mesa charge impact fees for an ADU?",
      answer:
        "Not for an ADU of 750 square feet of interior livable space or less, under state law. Larger ADUs pay impact fees in proportion to the square footage of the main house. Water and sewer connection fees apply only when the ADU needs its own connection or is built with a new house.",
    },
    {
      question: "Do I have to live on the property to rent out an ADU in La Mesa?",
      answer:
        "No, there is no owner-occupancy requirement for an ADU, and rentals must be for more than 30 days. For a junior ADU, the City's matrix requires an owner in the house or the JADU only when they share sanitation facilities.",
    },
  ],
  neighbors: ["san-diego", "san-diego-county", "el-cajon"],
  sources: [
    {
      label: "City of La Mesa — Accessory Dwelling Units",
      url: "https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units",
    },
    laMesaDevelopmentMatrix,
    {
      label: "La Mesa Municipal Code Chapter 24.05, §24.05.020(D)(8)–(9): ADUs and JADUs",
      url: "https://library.municode.com/ca/la_mesa/codes/code_of_ordinances?nodeId=TIT24ZO_CH24.05REZODEST",
    },
  ],
};
