/**
 * Carlsbad ADU jurisdiction content.
 *
 * Primary sources: the city's ADU Information Bulletin IB-111 (August 2026),
 * which summarizes Carlsbad Municipal Code §21.10.030 and state ADU law; the
 * Building Division's ADU and building-permit pages; the Permit Ready ADU
 * Checklist (Form B-75); the Minor Coastal Development Permit form (P-6);
 * and the Coastal Commission exhibits for the city's 2024 zoning-code
 * cleanup (LCP-6-CAR-24-0058-2). §21.58.030 is the permit-expiration
 * section, not the ADU section.
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
  asOf: "2026-10-10",
  metaDescription:
    "Carlsbad ADU rules for 2026: up to 1,200 sq ft detached, 4 ft setbacks, 18 ft near Coaster stations, and the permit steps. See what fits your lot, free.",
  introAnswer: [
    "Yes — Carlsbad allows one ADU plus one junior ADU on a single-family lot, and a detached unit can reach 1,200 square feet where lot coverage allows. The city approves ADUs administratively, with no public hearing: it confirms an application is complete within 15 business days and decides within 60 days of a complete application.",
    "Carlsbad ties its height relief to two named Coaster stops. Within a half-mile walk of Carlsbad Village or Poinsettia Station, a detached ADU can be 18 feet tall instead of 16, plus up to 2 more feet to match the main house's roof pitch. The parking waiver reaches further: it applies near any public transit stop, bus stops included.",
    "Much of western Carlsbad is in the Coastal Zone. There, most ADUs also need a Minor Coastal Development Permit, which the City Planner decides without a hearing, and where state ADU law and the Local Coastal Program conflict, the coastal program controls.",
  ],
  metaSizeNote: "up to 1,200 sq ft detached, subject to lot coverage",
  metaSetbackNote: "4 ft side and rear; existing setbacks kept for conversions",
  metaParkingNote: "none within a half-mile walk of transit, bus stops included",
  glance: [
    { label: "Max size — detached", value: "Up to 1,200 sq ft, subject to lot coverage", note: "An ADU of up to 800 sq ft with 4 ft side and rear setbacks gets mandatory approval" },
    { label: "Max size — attached", value: "50% of the existing home's floor area or 1,200 sq ft, whichever is less", note: "Never limited to less than 800 sq ft" },
    { label: "Max size — JADU", value: "500 sq ft of livable space", note: "Within the walls of the home or its attached garage" },
    { label: "Max height — detached", value: "One story and 16 ft; 18 ft within a half-mile walk of Carlsbad Village or Poinsettia Station", note: "Up to 2 ft more to match the main house's roof pitch (20 ft max). Attached ADUs: up to 25 ft or the zone limit, two stories max" },
    { label: "Rear and side setbacks", value: "4 ft minimum, attached or detached", note: "Converted garages and accessory structures keep existing setbacks unless Coastal Zone resources are affected" },
    { label: "Front setback", value: "Per the underlying zone", note: "It cannot prevent an 800 sq ft ADU" },
    { label: "Parking required", value: "One space, waived within a half-mile walk of public transit, bus stops included", note: "Also waived in historic districts, near car share, and for units built within an existing or proposed home or accessory structure. Converted garage parking is replaced only in the Parking Replacement Areas and, for uncovered spaces, in the Coastal Zone" },
    { label: "Owner-occupancy", value: "Not required for ADUs", note: "When a JADU shares facilities with the home, the owner must live in the JADU or the home" },
    { label: "Rentals and sale", value: "30-day minimum rental for ADUs, 31 days for JADUs; no separate sale", note: "Coastal Zone units permitted before Jan. 1, 2020 are exempt from the rental minimum" },
    { label: "Lot-size minimum", value: "None" },
    { label: "Approval type & timeline", value: "Administrative, no public hearing: completeness within 15 business days, decision within 60 days of a complete application", note: "Coastal Zone ADUs other than attached units and JADUs also need a Minor Coastal Development Permit" },
  ],
  cityDiffers: [
    {
      heading: "The rulebook: IB-111 and Municipal Code §21.10.030",
      paragraphs: [
        "Carlsbad's ADU rules live in Municipal Code §21.10.030, and the city's working summary of them is Information Bulletin IB-111, revised in August 2026. The bulletin folds in each state ADU law from 2023 through 2025, including AB 2221, SB 897, AB 1033, SB 477, AB 2533 and SB 1211, so it is the document to design from. The city points to the state housing department's ADU Handbook as the companion for how those laws are read.",
        "The coastal program moves on its own track. Carlsbad's 2024 zoning-code cleanup, Coastal Commission item LCP-6-CAR-24-0058-2, was on the Commission's February 2026 agenda and includes changes to §21.10.030. Inside the Coastal Zone the bulletin says the Local Coastal Program wins wherever it conflicts with state ADU law, so a coastal parcel should be checked against the current certified text rather than a summary written for inland lots.",
        "Most of what the bulletin adds beyond state law concerns appearance and use. A detached ADU cannot have a roof deck. Its roofing, trim, walls, windows and colors must match the main house. Rentals run at least 30 days, or 31 for a junior ADU, and the city does not allow an ADU to be sold separately from the home. A new detached ADU must also include solar panels unless an existing system can cover it.",
      ],
    },
    {
      heading: "Coaster stations, roof pitch, and the soils question",
      paragraphs: [
        "Carlsbad is specific about transit. Within a half-mile walk of Carlsbad Village Station or Poinsettia Station, a detached ADU may be 18 feet tall instead of 16, and up to 2 more feet are allowed so its roof pitch can match the main house. The city publishes half-mile walking-distance maps for both stations; check them before choosing between a flat and a pitched roof.",
        "The parking waiver reaches further than the height relief. It applies within a half-mile walk of any public transit stop, NCTD bus stops included, so many lots outside the station maps still owe no parking space. Converting a garage is a separate question: the lost spaces generally need no replacement, except inside the city's Parking Replacement Areas and, for uncovered spaces, in the Coastal Zone.",
        "Soils reports depend on the unit and the ground, not on one size line. The city's permit-ready checklist (Form B-75) says a single-story detached ADU of 500 square feet or less needs no soil investigation report, and one between 500 and 750 square feet may not need one either, though prescriptive minimum design requirements can apply. A detached ADU near a slope, a bluff or another geotechnical hazard needs a geotechnical report at any size, so a coastal-bluff or hillside lot should price that work during feasibility.",
      ],
    },
  ],
  fees: {
    heading: "Cost and fees in Carlsbad",
    paragraphs: [
      "The city estimates permit fees for most ADUs at about $2,000 to $4,000, depending on square footage, under its Master Fee Schedule. Plan check and inspection fees apply to every ADU, and plan check does not start until the review fees are paid.",
      "Impact fees follow state law: none for an ADU of 750 square feet or less of interior livable space or for any junior ADU, and proportional above that. A 1,000 square foot ADU beside a 2,000 square foot house pays 50% of the house-equivalent fee. School districts and other agencies can still charge their own fees. A new utility connection may carry connection and capacity charges, but conversions within the existing home, including expansions of up to 150 square feet, need no new connection.",
      "The city provides free permit-ready plans designed to eliminate custom architectural fees and streamline plan check. When checked on October 10, 2026, the program page listed those plans as temporarily unavailable while they are updated to the 2025 California Building Codes.",
    ],
    bullets: [
      "Permit fees: about $2,000–$4,000 for most ADUs, per the city's estimate from its Master Fee Schedule",
      "Plan check and inspection fees: apply to every ADU; plan check starts after review fees are paid",
      "Impact fees: exempt at 750 sq ft or less or for any JADU; proportional above",
      "School and special-district fees: confirm with the district",
      "Utility connections: possible charges for a new connection; none for conversions within the home",
      "Coastal Zone: budget for the Minor Coastal Development Permit application",
    ],
  },
  processIntro:
    "Carlsbad decides ADU permits administratively, with no public hearing. Under IB-111 the city confirms within 15 business days whether an application is complete, then approves or denies it within 60 days unless you ask for more time. The Building Division issues the building permit; the Planning Division handles coastal permits.",
  processSteps: [
    {
      title: "Check your parcel's maps",
      detail:
        "Before design, look up the Coastal Zone map, the half-mile walking-distance maps for Carlsbad Village and Poinsettia stations (height and parking), and, if you are converting a garage, the Parking Replacement Areas map.",
    },
    {
      title: "Choose custom or permit-ready plans",
      detail:
        "A licensed professional can design a custom ADU, or you can use the city's free permit-ready plans for a single-story detached unit (four sizes, three styles), which get expedited plan check at lower fees. The city lists those plans as unavailable while they are updated to the 2025 building codes.",
    },
    {
      title: "Assemble the building permit application",
      detail:
        "Every ADU and JADU needs a Residential Building Permit Application (Form B-1) with plans and supporting documents; permit-ready projects add the B-75 checklist. Show the solar system a new detached unit requires, and include a geotechnical report if the site is near a slope, bluff or other hazard.",
    },
    {
      title: "File the coastal permit if you need one",
      detail:
        "In the Coastal Zone, ADUs other than attached units and JADUs need a Minor Coastal Development Permit from the Planning Division (Form P-6, with the Land Use Application, Form P-1). Neighbors are notified, the City Planner decides without a hearing, and the coastal permit must be approved before or with the building permit.",
    },
    {
      title: "Submit and pay review fees",
      detail:
        "Apply through the city's Online Permit Portal if the permit type is offered online; otherwise submit a complete hard copy at a Building Division appointment, since walk-ins are not accepted. Review fees are due at submittal (online applicants get an email), and plan check starts once they are paid.",
    },
    {
      title: "Build and inspect",
      detail:
        "After the permit is issued, schedule the required city inspections through final. An ADU built with a new or remodeled main house follows that house's permit timeline.",
    },
  ],
  permitPortal: {
    label: "City of Carlsbad — Accessory Dwelling Units (Building Division)",
    url: "https://www.carlsbadca.gov/departments/community-development/building/accessory-dwelling-units",
  },
  faqs: [
    {
      question: "Can I build an ADU in Carlsbad in 2026?",
      answer:
        "Yes. A single-family lot can have one attached or detached ADU plus one junior ADU, and a detached ADU of up to 800 square feet with 4-foot side and rear setbacks must be approved. Under those mandatory-approval rules a lot can combine one converted ADU, one such detached ADU and one junior ADU. The rules are in Municipal Code §21.10.030, summarized in the city's IB-111 bulletin (August 2026).",
    },
    {
      question: "How do I apply for an ADU permit in Carlsbad?",
      answer:
        "Submit a Residential Building Permit Application (Form B-1) with plans to the Building Division, through the city's Online Permit Portal where offered. In the Coastal Zone, ADUs other than attached units and JADUs also need a Minor Coastal Development Permit from Planning. The city confirms completeness within 15 business days and decides within 60 days of a complete application.",
    },
    {
      question: "Do I need a soils report for a granny flat in Carlsbad?",
      answer:
        "Not always. The city's permit-ready checklist says a single-story detached ADU of 500 square feet or less needs no soil investigation report, and one of 500 to 750 square feet may not. A detached ADU near a slope, bluff or other geotechnical hazard needs a geotechnical report regardless of size.",
    },
    {
      question: "Do I need parking for a casita near the Coaster in Carlsbad?",
      answer:
        "No. The parking space is waived within a half-mile walk of any public transit stop, including Carlsbad Village Station, Poinsettia Station and NCTD bus stops. Elsewhere one space is required, with other exemptions such as historic districts and units built within an existing or proposed home.",
    },
    {
      question: "How tall can a back house be in Carlsbad?",
      answer:
        "One story and 16 feet for a detached ADU, or 18 feet within a half-mile walk of Carlsbad Village or Poinsettia Station, plus up to 2 feet to match the main house's roof pitch. Attached ADUs can reach 25 feet or the zone limit, two stories at most.",
    },
    {
      question: "How much are ADU permit fees in Carlsbad?",
      answer:
        "The city estimates about $2,000 to $4,000 for most ADUs, depending on size, under its Master Fee Schedule. ADUs of 750 square feet or less of interior livable space and all junior ADUs pay no development impact fees, though school districts and other agencies may charge their own.",
    },
    {
      question: "Do I need a coastal permit for an in-law unit in Carlsbad?",
      answer:
        "In the Coastal Zone, yes for most ADUs: a Minor Coastal Development Permit (Form P-6) from the Planning Division. Attached ADUs and junior ADUs are generally exempt. There is no hearing; the City Planner decides after neighbors are notified.",
    },
    {
      question: "How long does ADU approval take in Carlsbad?",
      answer:
        "The city says whether your application is complete within 15 business days, then approves or denies it within 60 days unless you request an extension. An ADU built with a new or remodeled main house follows that house's permit timeline instead.",
    },
  ],
  neighbors: ["oceanside", "escondido"],
  sources: [
    {
      label: "City of Carlsbad Information Bulletin IB-111: Accessory Dwelling Units (Aug. 2026, PDF)",
      url: "https://www.carlsbadca.gov/home/showpublisheddocument/22370/639221532270470000",
    },
    {
      label: "City of Carlsbad — Accessory Dwelling Units (Building Division)",
      url: "https://www.carlsbadca.gov/departments/community-development/building/accessory-dwelling-units",
    },
    {
      label: "City of Carlsbad — Building Permits (how to apply)",
      url: "https://www.carlsbadca.gov/departments/community-development/building/building-permits",
    },
    {
      label: "City of Carlsbad — ADU Permit Ready Program",
      url: "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    },
    {
      label: "City of Carlsbad Permit Ready ADU Checklist, Form B-75 (PDF)",
      url: "https://www.carlsbadca.gov/home/showpublisheddocument/14641/638597459595270000",
    },
    {
      label: "Coastal Commission exhibits, Carlsbad LCP amendment LCP-6-CAR-24-0058-2 (Feb. 2026, PDF)",
      url: "https://documents.coastal.ca.gov/reports/2026/2/Th16c/Th16c-2-2026-exhibits.pdf",
    },
  ],
};
