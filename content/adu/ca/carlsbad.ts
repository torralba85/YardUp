/**
 * Carlsbad ADU jurisdiction content.
 *
 * Primary sources: Carlsbad Municipal Code §21.58.030 (as amended through
 * the 2025–26 coastal-program updates), the city's ADU information
 * bulletin, and Coastal Commission staff reports on Carlsbad's local
 * coastal program amendments. Secondary-reported figures are attributed,
 * never stated as city-published fact.
 *
 * @module adu/ca/carlsbad
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const carlsbad: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Carlsbad",
  slug: "carlsbad",
  county: "San Diego County",
  asOf: "2026-09-17",
  introAnswer: [
    "Yes — Carlsbad allows at least one detached ADU plus one junior ADU on virtually every single-family lot, with state minimums of 850 square feet for a studio or one-bedroom and 1,000 square feet for two or more bedrooms, approved ministerially with no hearing.",
    "Carlsbad writes unusually specific local standards around its transit and coastline: the ADU bulletin names Carlsbad Village and Poinsettia stations for the parking waiver, sets an 18-foot height figure near those stations, and — distinctively — requires a soils report for any ADU over 500 square feet.",
    "Like Oceanside, much of Carlsbad sits in the coastal zone, and the city has spent 2025–26 amending its coastal-program ADU provisions (Municipal Code §21.58.030). Coastal parcels should expect a coastal development permit layer and confirm current text before designing.",
  ],
  metaSizeNote: "850–1,000+ sq ft by bedroom count; soils report over 500 sq ft",
  metaSetbackNote: "4 ft side and rear; existing setbacks kept for conversions",
  metaParkingNote: "none required near Village or Poinsettia stations",
  glance: [
    { label: "Max size — detached", value: "850 sq ft (studio/1BR), 1,000 sq ft (2+ BR) minimum must be allowed", note: "Soils report required above 500 sq ft" },
    { label: "Max size — attached", value: "Within state minimums and 50% of primary dwelling living area" },
    { label: "Max size — JADU", value: "500 sq ft, within existing or proposed space" },
    { label: "Max height — detached", value: "16 ft generally; 18 ft near Carlsbad Village or Poinsettia stations", note: "Per the city ADU bulletin; attached units follow state attached-height rules" },
    { label: "Rear and side setbacks", value: "4 ft side and rear for new construction", note: "Existing setbacks maintained for conversions; coastal nonconforming conditions need review" },
    { label: "Front setback", value: "Per underlying zone requirement" },
    { label: "Parking required", value: "None near Village or Poinsettia transit; max 1 space elsewhere", note: "Waived in historic districts, for conversions, and for attached units; replacement parking never required" },
    { label: "Owner-occupancy", value: "Never required for standard ADUs", note: "JADU occupancy only where sanitation is shared with the main home" },
    { label: "Lot-size minimum", value: "None — prohibited by state law" },
    { label: "Approval type & timeline", value: "Ministerial, 60-day decision on a complete application", note: "Coastal-zone parcels add coastal development review" },
  ],
  cityDiffers: [
    {
      heading: "The rulebook: §21.58.030 and the coastal-program updates",
      paragraphs: [
        "Carlsbad's ADU standards sit in the Municipal Code at §21.58.030, and that section has been actively amended through the city's local coastal program updates — Coastal Commission exhibits from February 2026 show the section's ADU language being revised to permit maximum ADUs with four-foot side and rear setbacks in compliance with state standards. When a code section is mid-amendment, the practical rule is simple: read the current published text for your application date, and treat anything written about Carlsbad ADUs more than a year ago as suspect.",
        "The city's ADU information bulletin is the working document most homeowners will actually use. It translates the code into parcel-level answers: where the transit parking waiver applies, what height applies near the two named Coaster stations, how conversions of existing accessory structures keep their setbacks, and how coastal nonconforming conditions — encroachment, access, habitat buffers — get reviewed. Pull the current bulletin before sketching anything; it changes faster than the code.",
        "The coastal zone covers a large portion of western Carlsbad, and the 2025–26 amendment cycle has centered on exactly how ADU approvals work inside it. The February 2025 Coastal Commission staff report on Carlsbad's zoning-ordinance amendment — touching residential zones, parking provisions, and ADU rules as part of the certified implementation plan — shows a city and a commission negotiating the same state-rights-versus-coastal-review interface that Oceanside faces. Expect a coastal development permit on coastal parcels and a longer, less ministerial-feeling timeline there.",
      ],
    },
    {
      heading: "Named stations, soils reports, and the 500-square-foot line",
      paragraphs: [
        "Carlsbad is unusually concrete about transit: the bulletin names Carlsbad Village Station and Poinsettia Station, tying the parking waiver and the 18-foot height figure to those stops under the state transit-proximity rules. If your lot is within the half-mile walkshed of either station, two design constraints — parking and height — both relax at once. Map the walkshed early; it is the highest-value ten minutes in a Carlsbad ADU project.",
        "The soils-report threshold is Carlsbad's signature quirk: ADUs over 500 square feet must include a soils report with the application. That threshold sits below every meaningful size target — the 800-square-foot exempt unit, the 850-square-foot one-bedroom minimum — so in practice nearly every new-construction ADU in Carlsbad budgets for geotechnical work. Price it during feasibility, not after design, and note the interaction with fees: the same 500-square-foot line is where school-fee exemption ends statewide.",
        "Independent 2026 guides report Carlsbad permit fees landing roughly between $2,000 and $4,000 depending on square footage, and note that permit-ready plans can save months and five figures. Those are secondary-reported ranges, not city-published figures — confirm against the city's fee schedule — but they directionally match a city with standard-plan options and a soils-report requirement baked into most projects.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in Carlsbad",
    paragraphs: [
      "Carlsbad operates under the same state caps — no impact fees under 750 square feet, proportional above, no school fees under 500 square feet — with the local twist that the soils report required above 500 square feet is a consultant cost on nearly every project. Independent 2026 guides report permit fees of roughly $2,000–$4,000 scaling with square footage; the city publishes its own fee schedule, and that schedule is the number to budget from.",
      "Permit-ready or standard-plan designs are widely reported to compress both timeline (three to six months saved) and cost (roughly $8,000–$16,000) in Carlsbad. Those savings figures come from secondary guides, but the mechanism is real everywhere: less custom plan check means fewer billable review cycles.",
    ],
    bullets: [
      "Permit fees: independent 2026 guides report ~$2,000–$4,000 by size — confirm against the city's published fee schedule",
      "Soils report: required above 500 sq ft; budget as a consultant cost on nearly every new-build ADU",
      "Development impact fees: none under 750 sq ft; proportional above",
      "School fees: exempt under 500 sq ft",
      "Coastal-zone parcels: budget for coastal development permit costs and extended review",
    ],
  },
  processIntro:
    "Carlsbad reviews ADUs ministerially with a 60-day decision clock. Start with station proximity, soils, and coastal status — those three answers shape the whole submittal.",
  processSteps: [
    {
      title: "Map stations, soils, and coast",
      detail:
        "Check half-mile walksheds to Carlsbad Village and Poinsettia stations, confirm coastal-zone status, and assume a soils report will be needed for any unit over 500 square feet.",
    },
    {
      title: "Read the current bulletin and code",
      detail:
        "Pull the current ADU information bulletin and the live §21.58.030 text. Given the 2025–26 amendment cycle, do not design from older summaries.",
    },
    {
      title: "Commission soils early",
      detail:
        "Order the soils report alongside schematic design rather than after it — foundation recommendations feed back into siting and cost, and waiting serializes the timeline.",
    },
    {
      title: "Prepare and file the submittal",
      detail:
        "Site plan, floor plans, elevations, structural and energy compliance, plus the soils report. File complete so the 60-day ministerial clock starts on arrival; coastal parcels file the coastal track in parallel.",
    },
    {
      title: "Permit, build, inspect",
      detail:
        "Build under permit with scheduled inspections through final. Keep coastal conditions and building conditions in one compliance list where both apply.",
    },
  ],
  permitPortal: {
    label: "City of Carlsbad — Accessory Dwelling Units",
    url: "https://www.carlsbadca.gov/city-hall/community-development/planning/adu",
  },
  faqs: [
    {
      question: "Can I build an ADU in Carlsbad in 2026?",
      answer:
        "Yes, on virtually every single-family lot: at least one detached ADU plus one junior ADU, approved ministerially. Confirm the current §21.58.030 text given the 2025–26 amendments, and check coastal-zone status for your parcel.",
    },
    {
      question: "Do I need a soils report for a granny flat in Carlsbad?",
      answer:
        "For any ADU over 500 square feet, yes — the city requires a soils report with the application. Since that covers nearly every new-build size target, budget for geotechnical work from the start.",
    },
    {
      question: "Do I need parking for a casita near the Coaster in Carlsbad?",
      answer:
        "No parking is required near Carlsbad Village Station or Poinsettia Station under the state transit rules the city applies. Elsewhere the maximum is one space, with exemptions for conversions, attached units, and historic districts.",
    },
    {
      question: "How tall can a back house be in Carlsbad?",
      answer:
        "Sixteen feet generally, 18 feet near the two named Coaster stations per the city bulletin. Attached units follow the state's attached-height rules. Verify against the live code text given recent amendments.",
    },
    {
      question: "How much are ADU permit fees in Carlsbad?",
      answer:
        "Independent 2026 guides report roughly $2,000–$4,000 depending on square footage. Confirm against the city's published fee schedule before budgeting — and remember state law bars impact fees under 750 square feet and school fees under 500.",
    },
    {
      question: "Do I need a coastal permit for an in-law unit in Carlsbad?",
      answer:
        "If the parcel is in the coastal zone, expect coastal development review on top of the ministerial ADU approval. The city amended its coastal-program ADU provisions through 2025–26, so confirm which text governs your application.",
    },
    {
      question: "How long does ADU approval take in Carlsbad?",
      answer:
        "Sixty days for a ministerial decision on a complete application outside the coastal zone. Permit-ready plans are widely reported to save three to six months against fully custom designs.",
    },
  ],
  neighbors: ["oceanside", "escondido"],
  sources: [
    {
      label: "Carlsbad ADU information bulletin (PDF)",
      url: "https://www.carlsbadca.gov/home/showpublisheddocument/12288/638378982568630000",
    },
    {
      label: "City of Carlsbad — Accessory Dwelling Units",
      url: "https://www.carlsbadca.gov/city-hall/community-development/planning/adu",
    },
    {
      label: "Coastal Commission exhibits on Carlsbad LCP amendment (Feb 2026, PDF)",
      url: "https://documents.coastal.ca.gov/reports/2026/2/Th16c/Th16c-2-2026-exhibits.pdf",
    },
  ],
};
