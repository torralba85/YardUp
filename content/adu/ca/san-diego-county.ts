/**
 * Unincorporated San Diego County ADU jurisdiction content.
 *
 * Covers parcels outside city limits, where County Planning & Development
 * Services (PDS) issues the permit. Primary sources: the Zoning Division's
 * ADU and JADU handout PDS-611 (Rev. 09/02/2026), which summarizes Zoning
 * Ordinance Section 6156 x; the PDS ADU Handbook (April 2024); the County ADU
 * and Dwelling Unit Building Plans pages; the Director's Determination of
 * January 29, 2025 on state housing law; the Building Division's permit
 * summary PDS 441A; and HCD's July 7, 2026 findings letter on the County
 * ordinance.
 *
 * HCD found five provisions of Section 6156 x out of step with state ADU
 * law, and PDS-611 still repeats two of them (JADU owner-occupancy and JADU
 * replacement parking). The page reports both documents rather than picking
 * a winner; re-check the County's response before the next as-of date.
 *
 * @module adu/ca/san-diego-county
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const sanDiegoCounty: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Unincorporated San Diego County",
  slug: "san-diego-county",
  county: "San Diego County",
  asOf: "2026-10-24",
  published: "2026-10-24",
  metaTitle: "Unincorporated San Diego County ADU Rules (2026)",
  metaDescription:
    "Unincorporated San Diego County ADU rules: 1,200 sq ft detached, up to 25 ft tall, 4 ft setbacks plus fire setbacks, septic and fee rules. Check your lot.",
  h1: "ADU Rules in Unincorporated San Diego County (2026)",
  introAnswer: [
    "Yes — on a residentially zoned lot outside city limits with an existing or proposed house, the County allows at least one ADU and one junior ADU. A detached ADU can be up to 1,200 square feet whatever the size of the house, and up to 25 feet tall, well above the 16 feet state law guarantees for most detached units.",
    "This guide is for properties in the unincorporated county, such as Alpine, Fallbrook, Lakeside, Ramona, Spring Valley and Valley Center, where County Planning & Development Services (PDS) issues the permit. A San Diego mailing address does not make a lot part of the City of San Diego, so confirm your jurisdiction first.",
    "Outside the cities the hard questions are usually about the site, not the zoning: which fire protection district covers the lot, whether the house is on a septic system, and whether the pad needs grading. Ask the fire district and, on septic, the Department of Environmental Health and Quality before you pay for plans.",
  ],
  metaSizeNote: "up to 1,200 sq ft detached, independent of the house's size",
  metaSetbackNote: "4 ft side and rear plus any fire-district setbacks",
  metaParkingNote: "one space, waived near transit and for conversions",
  glance: [
    { label: "Who issues the permit", value: "County Planning & Development Services (PDS)", note: "Your fire protection district reviews fire requirements; the Department of Environmental Health and Quality reviews septic systems" },
    { label: "Max size — detached", value: "1,200 sq ft, independent of the house's size" },
    { label: "Max size — attached", value: "50% of the house's floor area, up to 1,200 sq ft", note: "The 50% cap does not apply up to 850 sq ft, or 1,000 sq ft with more than one bedroom" },
    { label: "Max size — JADU", value: "500 sq ft, entirely within an existing or proposed house" },
    { label: "Max height — detached", value: "25 ft", note: "18 ft for detached ADUs at a multifamily complex. The County's handout lists 18 ft for ADUs under 800 sq ft, which may also sit in the front yard setback and need no parking space" },
    { label: "Max height — attached", value: "25 ft or the zone's height limit for the house, whichever is lower", note: "State law sets this floor. The County's 2024 handbook still lists the house's height or 16 ft, whichever is higher" },
    { label: "Rear and side setbacks", value: "4 ft for a new ADU, plus any required fire setbacks", note: "On a corner lot, the street side is also 4 ft from the edge of the easement, street or property line" },
    { label: "Front setback", value: "Per the underlying zone", note: "An ADU of 800 sq ft or less may encroach into the front yard setback" },
    { label: "Conversions", value: "No size, height, coverage or setback limits for an existing permitted structure, except fire safety", note: "One 150 sq ft expansion allowed for entry and exit only; the whole house cannot become the ADU" },
    { label: "Parking required", value: "One space, which may be tandem in the driveway or in a setback", note: "Not required within half a mile of public transit, in a historic district, or for conversions. Spaces lost to an ADU conversion need no replacement" },
    { label: "Rentals and sale", value: "30-day minimum rental; separate sale only through the County's condominium program", note: "The Board of Supervisors adopted the separate-sale program on March 4, 2026" },
  ],
  cityDiffers: [
    {
      heading: "Your fire district, your septic system and your slope",
      paragraphs: [
        "PDS issues the building permit, but in the unincorporated county another agency often sets the harder limits. The County's ADU handout asks applicants to contact their fire protection district as soon as possible to confirm the required fire setbacks and whether the project needs fire sprinklers or a new fire hydrant. The County's handbook says sprinklers are required in an ADU only when the existing house was required to have them, for example after a major alteration that brought the house under the sprinkler rule.",
        "Wildfire rules shape the site plan. The handbook describes a fuel modification area of 100 feet around structures, or to the property line if that is closer, with the 50 feet nearest the building cleared, planted with fire-resistant plants and irrigated. Lots in the Wildland Urban Interface carry extra building and fire requirements, so look up the address on the Fire Hazard Severity Zone map before choosing materials.",
        "Parts of the unincorporated county have no public sewer. On septic, a new kitchen and bathroom may need an added septic tank, or a separate new system if the existing disposal field cannot take the extra flow. The County's process starts with an onsite wastewater (OWTS) professional, who prepares a layout application for the Department of Environmental Health and Quality; DEHQ inspects the site and sets the terms of approval. Slope matters too: the handbook calls areas under 10% slope more suitable and advises against grading slopes over 25%, and the Grading Ordinance decides whether a grading permit is needed.",
      ],
    },
    {
      heading: "Bigger and taller than most city rules",
      paragraphs: [
        "Size is simpler in the County than in most cities. A detached ADU can reach 1,200 square feet whatever the size of the house, and an attached ADU can take 50% of the house's floor area up to 1,200 square feet, with the 50% cap lifted for units up to 850 square feet, or 1,000 square feet with more than one bedroom. Floor area is measured from the inside of the exterior walls, and the plot plan must show the calculation for both units.",
        "Height is the bigger difference. The County allows a detached ADU up to 25 feet, while state law guarantees only 16 feet in most cases, so a two-story backyard unit can be possible on a County lot. Detached ADUs at a multifamily complex stay at 18 feet, and the County's handout lists 18 feet for an ADU under 800 square feet, which in exchange may sit in the front yard setback and needs no parking space.",
        "Conversions are where rural lots stand out. Converting an existing, permitted accessory structure carries no size, height, lot-coverage or setback limits beyond fire safety and the building code, and the County's own example is a permitted 3,000 square foot barn. Part of the main house can be converted too, but not all of it. A conversion may add up to 150 square feet only for entry and exit; anything more is treated as new construction.",
      ],
    },
    {
      heading: "Where the County's handout and state law disagree",
      paragraphs: [
        "On July 7, 2026, the state Department of Housing and Community Development (HCD) found that five provisions of the County's ADU ordinance, Zoning Ordinance Section 6156 x, did not comply with state ADU law. HCD said sizes must be counted as interior livable space, that the ordinance limits which combinations of ADUs a lot can have, that a JADU owner-occupancy rule may apply only when the JADU shares sanitation facilities with the house, that a JADU next to an ADU cannot lose ministerial review, and that the County cannot require replacement parking for a garage converted to a JADU. The County had until August 6, 2026 to respond with a plan to amend the ordinance or adopt findings.",
        "The County's ADU handout, revised September 2, 2026, still says the owner must live in either the house or the JADU and that parking lost to a JADU conversion must be replaced. A January 2025 Director's Determination states that where the Zoning Ordinance conflicts with state housing law, state law takes precedence. If either rule affects your project, ask the Zoning Counter in writing how PDS is applying it before you finalize plans.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in the unincorporated county",
    paragraphs: [
      "The County's trial ADU fee waiver ran from January 9, 2019 to January 9, 2024 and has ended, so new ADU projects pay the usual County fees. The Building Division invoices plan check fees at submittal and does not begin plan check until they are paid. PDS publishes a building fee estimator, and its handbook advises estimating County fees once you have chosen a design.",
      "Other fees come from other agencies. The Building Division lists transportation impact fees, park fees, school fees, fire mitigation fees and water and sewer charges among those that may be collected before a permit is issued. State law exempts an ADU of 750 square feet of interior livable space or less from local impact fees and scales them for larger units, but school districts and utilities set their own charges.",
      "Budget for site work a city lot might not need. The County's handbook lists septic upgrades and septic analysis, separate utility meters and building on a slope among the items that raise ADU costs, and notes that a new detached ADU needs a solar system. The County's Green Building Incentive Program offers faster plan check and lower building permit fees for qualifying projects.",
    ],
    bullets: [
      "Plan check and building permit fees: estimate with the PDS fee estimator; plan check starts after the invoice is paid",
      "Fee waiver: ended January 9, 2024",
      "Impact fees: exempt at 750 sq ft of interior livable space or less; proportional above",
      "School, fire, water and sewer agency fees: confirm with each agency",
      "Septic: OWTS professional's design plus any new tank or system",
      "Green Building Incentive Program: faster plan check and lower building permit fees if eligible",
    ],
  },
  processIntro:
    "PDS's Building Division issues ADU permits from its office at 5510 Overland Avenue, and the County's ADU handbook expects plans to be reviewed by planning, engineering and the fire district, often over a few rounds of comments. State law requires a decision within 60 days of a complete application. The handbook recommends this order:",
  processSteps: [
    {
      title: "Confirm the lot is unincorporated and residential",
      detail:
        "Check the County's map of unincorporated areas, then run the Property Summary Report with your Assessor's Parcel Number to confirm the zoning. The lot must be residentially zoned with an existing or planned house.",
    },
    {
      title: "Call the fire district and, on septic, DEHQ",
      detail:
        "Ask your fire protection district about fire setbacks, sprinklers and hydrants. If the house is on septic, have an OWTS professional prepare a layout application for the Department of Environmental Health and Quality to show whether the system can take the ADU.",
    },
    {
      title: "Choose a custom design or a County plan",
      detail:
        "Hire a designer or architect, or start from the County's free dwelling unit plans: six designs from 600 to 1,200 sq ft that are about 85% complete. The Dwelling Unit Checklist lists the project-specific information you add.",
    },
    {
      title: "Prepare the submittal",
      detail:
        "Assemble the plot plan, building plans and supporting documents such as structural and energy calculations, using the County's minimum submittal list for single-family dwellings and accessory structures (PDS 658). Add grading plans if the Grading Ordinance requires a permit.",
    },
    {
      title: "Pre-intake review, submittal and plan check fees",
      detail:
        "Go through the County's pre-intake review, then book an appointment to create the record that starts plan review. Pay the plan check invoice; review begins once it is paid.",
    },
    {
      title: "Answer corrections and collect clearances",
      detail:
        "Revise and resubmit until the plans are approved, and collect any clearances listed in the conditions of approval, such as DEHQ, school, water and sewer agencies. The County advises getting contractor bids before the permit is issued.",
    },
    {
      title: "Build, inspect and occupy",
      detail:
        "A building permit expires after two years but can be extended. Your contractor calls for inspections at each stage, and the County issues a Certificate of Occupancy after final approval.",
    },
  ],
  permitPortal: {
    label: "County of San Diego PDS — Accessory Dwelling Units",
    url: "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu.html",
  },
  faqs: [
    {
      question: "What are the ADU setbacks in San Diego County?",
      answer:
        "In the unincorporated county a new ADU needs 4 feet from the side and rear lot lines, plus any setback your fire district requires. The front setback follows the zone, but an ADU of 800 square feet or less may encroach into it. Converting an existing permitted structure keeps its current setbacks.",
    },
    {
      question: "How big can an ADU be in unincorporated San Diego County?",
      answer:
        "A detached ADU can be up to 1,200 square feet whatever the size of the house. An attached ADU can be up to 50% of the house's floor area and no more than 1,200 square feet, with the 50% cap lifted up to 850 square feet, or 1,000 with more than one bedroom. A junior ADU is limited to 500 square feet.",
    },
    {
      question: "How tall can a granny flat be in San Diego County?",
      answer:
        "Up to 25 feet for a detached ADU on a County lot, or 18 feet at a multifamily complex. The County's handout lists 18 feet for an ADU under 800 square feet that uses the front-yard and no-parking allowances. Under state law, an attached ADU can reach 25 feet or the zone's height limit for the house, whichever is lower; the County's 2024 handbook still lists the house's height or 16 feet.",
    },
    {
      question: "Can I build an ADU if my house is on septic in San Diego County?",
      answer:
        "Often yes, but the septic system decides it. An OWTS professional prepares a layout application for the Department of Environmental Health and Quality, which inspects the site. You may need an extra septic tank, or a separate new system if the existing disposal field cannot take the added flow.",
    },
    {
      question: "Does San Diego County still waive ADU permit fees?",
      answer:
        "No. The County's trial fee waiver ran from January 9, 2019 to January 9, 2024. ADUs now pay County plan check and permit fees, plus any agency fees. State law still exempts ADUs of 750 square feet of interior livable space or less from local impact fees.",
    },
    {
      question: "Does San Diego County have free pre-approved ADU plans?",
      answer:
        "Yes. The County offers six dwelling unit plans for ADU use, from a 600 square foot one-bedroom to 1,200 square foot two- and three-bedroom designs. They are about 85% complete, so you still add site-specific information using the County's Dwelling Unit Checklist.",
    },
    {
      question: "Can I sell my ADU separately in unincorporated San Diego County?",
      answer:
        "Possibly. On March 4, 2026 the Board of Supervisors adopted a program allowing separate sale of ADUs through a condominium conversion. It runs through a Tentative Parcel Map or Tentative Map application, and the County's ADU Condo Guidance and Checklist sets out who is eligible.",
    },
    {
      question: "Do County ADU rules apply if my address says San Diego?",
      answer:
        "Only if the lot is outside city limits. Many unincorporated properties have a city name in their mailing address. Check the County's unincorporated-area map or your Property Summary Report; inside the City of San Diego, the City's own ADU rules apply instead.",
    },
  ],
  neighbors: ["san-diego", "chula-vista", "escondido", "oceanside", "la-mesa", "san-marcos", "el-cajon"],
  sources: [
    {
      label: "County of San Diego PDS — Accessory Dwelling Units",
      url: "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu.html",
    },
    {
      label: "County of San Diego PDS-611, Accessory and Junior Accessory Dwelling Unit regulations (Rev. 09/02/2026, PDF)",
      url: "https://www.sandiegocounty.gov/content/dam/sdc/pds/zoning/formfields/PDS-PLN-611.pdf",
    },
    {
      label: "County of San Diego ADU Handbook (April 2024, PDF)",
      url: "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/COSD_ADU_Handbook.pdf",
    },
    {
      label: "County of San Diego — Dwelling Unit Building Plans",
      url: "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html",
    },
    {
      label: "County of San Diego PDS 441A, How to Obtain a Building Permit Summary (PDF)",
      url: "https://www.sandiegocounty.gov/pds/docs/pds441a.pdf",
    },
    {
      label: "County of San Diego Director's Determination on state housing law (Jan. 29, 2025, PDF)",
      url: "https://www.sandiegocounty.gov/content/dam/sdc/pds/zoning/DirectorDetermination_ImplementingHousingLaws.pdf",
    },
    {
      label: "HCD findings on San Diego County's ADU ordinance (July 7, 2026, PDF)",
      url: "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/ordinance-review-letters/san-diego-county-adu-findings-070726.pdf",
    },
    {
      label: "County of San Diego — map of unincorporated areas (PDF)",
      url: "https://www.sandiegocounty.gov/content/dam/sdc/pds/bldg/adu_info/UnincorporatedMap.pdf",
    },
  ],
};
