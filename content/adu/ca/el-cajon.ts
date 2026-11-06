/**
 * El Cajon ADU jurisdiction content.
 *
 * Primary sources: El Cajon Municipal Code Title 17 (Zoning), Chapter 17.140
 * (Residential Zones), Section 17.140.180 (Accessory Dwelling Units), as
 * amended by Ordinance Nos. 5142 and 5148; the City of El Cajon Community
 * Development Department ADU Submittal Guidelines; and City Building Division
 * Plan Check Checklists.
 *
 * El Cajon features a distinctive setback-to-height tier system in §17.140.180
 * that provides design flexibility: a 3-foot setback allows up to a 12-foot
 * roof height, a 4-foot setback allows up to 16 feet, and a 5-foot setback
 * unlocks heights up to 20 feet, with 18-foot exceptions near transit and
 * beside two-story homes. Transit parking exemptions apply across
 * major trolley and bus corridors connected to the El Cajon Transit Center.
 *
 * @module adu/ca/el-cajon
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const elCajon: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "El Cajon",
  slug: "el-cajon",
  county: "San Diego County",
  asOf: "2026-10-30",
  published: "2026-10-30",
  metaTitle: "El Cajon ADU Rules (2026): Size, Setback Tiers & Cost",
  metaDescription:
    "El Cajon ADU rules: 1,200 sq ft detached units, unique 3-5 ft setback-height tiers, trolley transit waivers, and permit steps. Calculate feasibility free.",
  introAnswer: [
    "Yes. The City of El Cajon permits accessory dwelling units on any legal lot developed with a single-family home: a converted ADU inside existing space, a new detached ADU and a junior ADU (JADU) can all be built together when each meets its own requirements (Gov. Code §66323(a)). A detached backyard home can be constructed up to 1,200 square feet, providing ample room for multi-bedroom family or rental living quarters.",
    "El Cajon's zoning code features a unique setback-to-height tier system under Municipal Code §17.140.180. While standard California state law establishes a flat 4-foot side and rear setback for a 16-foot unit, El Cajon allows a 3-foot setback for single-story structures capped at 12 feet, a 4-foot setback for units up to 16 feet, and allows heights up to 20 feet when setbacks are expanded to 5 feet. Two exceptions skip the 5-foot tier: within half a mile of a major transit stop or high-quality transit corridor a detached ADU may reach 18 feet (plus 2 feet to match the primary home's roof pitch), and on a lot whose primary dwelling has two or more stories it may reach 18 feet (§17.140.180(E)(2)(b)).",
    "The city is well-served by the San Diego Trolley's Orange and Green Lines at the El Cajon Transit Center and Arnele Avenue Station. Parcels within a half-mile walking radius of these transit hubs or high-frequency bus routes are exempt from all off-street parking mandates, and garage conversions never require replacement parking.",
  ],
  metaSizeNote: "up to 1,200 sq ft attached or detached",
  metaSetbackNote: "tiered: 3 ft (12 ft high), 4 ft (16 ft high), 5 ft (20 ft high)",
  metaParkingNote: "waived within 0.5 miles of trolley stations and bus stops",
  glance: [
    {
      label: "Max size — detached",
      value: "Up to 1,200 sq ft",
      note: "Subject to lot coverage and zoning standards; state law exempts an 800 sq ft unit from local coverage restrictions",
    },
    {
      label: "Max size — attached",
      value: "Up to 1,200 sq ft",
      note: "§17.140.180 applies the same maximum size to attached and detached units, with no percentage-of-home cap",
    },
    {
      label: "Max size — JADU",
      value: "500 sq ft maximum",
      note: "Must be created within the existing or proposed walls of the main residence or an attached garage",
    },
    {
      label: "Max height — detached",
      value: "16 ft standard; up to 20 ft with 5 ft setbacks",
      note: "Tiered by setback: 12 ft with 3 ft, 16 ft with 4 ft, up to 20 ft with 5 ft; 18 ft allowed near qualifying transit (plus 2 ft for matching roof pitch) or beside a two-story primary home",
    },
    {
      label: "Rear and side setbacks",
      value: "3 ft to 5 ft depending on structure height",
      note: "Existing permitted accessory buildings and garages converted to ADUs can maintain existing 0-foot setbacks",
    },
    {
      label: "Front setback",
      value: "Conforms to the underlying residential zoning district",
      note: "Cannot be enforced if it prevents the construction of an 800 sq ft detached ADU with 4 ft setbacks",
    },
    {
      label: "Parking required",
      value: "1 space per unit, waived near transit stops",
      note: "Exempt within 0.5 miles of transit stops (including El Cajon Transit Center and Arnele Ave Trolley Station) or for conversions; also exempt for a new detached ADU of 800 sq ft or less built under Gov. Code §66323(a)(2)",
    },
    {
      label: "Owner-occupancy",
      value: "Not required for standard ADUs",
      note: "No owner-occupancy mandate applies to standard ADUs; JADU rules follow California Government Code standards",
    },
    {
      label: "Rentals and sale",
      value: "Minimum 30-day rental duration; no separate sale",
      note: "ADUs must be rented for terms longer than 30 consecutive days and cannot be subdivided or sold independently",
    },
    {
      label: "Approval timeline",
      value: "Administrative review within 60 calendar days",
      note: "Staff issues decisions ministerially without public hearings or discretionary board approvals",
    },
  ],
  cityDiffers: [
    {
      heading: "The El Cajon setback and height tier system (§17.140.180)",
      paragraphs: [
        "El Cajon's zoning ordinance for accessory dwelling units is codified in Municipal Code §17.140.180. Unlike many California jurisdictions that strictly default to the state minimum 4-foot setback with a 16-foot ceiling, El Cajon introduced a graduated tier structure that connects boundary setbacks directly to building massing. This allows homeowners with tight yards to build closer to lot lines if they maintain a low roof profile.",
        "Under this tier structure, a single-story detached ADU with a maximum roof height of 12 feet can be positioned with a side and rear setback of just 3 feet. If you require standard 8-to-9-foot interior ceilings with a traditional 16-foot exterior roofline, standard 4-foot setbacks apply. Homeowners seeking a two-story or pitched-roof ADU up to 20 feet in height can achieve approval by providing 5-foot setbacks from property lines. Two exceptions skip the 5-foot tier: within half a mile of a major transit stop or high-quality transit corridor a detached ADU may reach 18 feet (plus 2 feet to match the primary home's roof pitch), and on a lot whose primary dwelling has two or more stories it may reach 18 feet (§17.140.180(E)(2)(b)).",
        "Existing accessory buildings—such as detached carports, storage workshops, or garages—can be converted into conditioned living space along their existing building footprint. The City allows these conversions to maintain their nonconforming setbacks, even if built directly on a property line, provided current California fire and building safety separation codes are fulfilled.",
      ],
    },
    {
      heading: "Trolley transit corridors, utility connections, and multi-family rules",
      paragraphs: [
        "El Cajon serves as a major regional transit center in East San Diego County, hosting two lines of the San Diego Metropolitan Transit System (MTS) Trolley. Under California Government Code §66314 and local code, any parcel within a half-mile walking distance of a public transit station or bus stop is fully exempt from off-street parking mandates. Properties near Main Street, Broadway, and Fletcher Parkway frequently qualify for this waiver.",
        "For multi-family residential parcels, El Cajon adheres to state allowances that make infill additions highly lucrative. Owners of duplexes, triplexes, or apartment buildings can convert non-livable common spaces—such as storage basements, laundry facilities, or carports—into ADUs for up to 25% of the total existing unit count. Detached ADUs depend on whether the multifamily development already exists: a proposed multifamily development may include up to two detached ADUs, while an existing multifamily development may add up to eight detached ADUs, never more than the number of existing primary units (§17.140.180(B)(2)). Detached units follow 4-foot setbacks and 16-foot height caps.",
        "Utility connections depend on the scope of construction. While JADUs and garage conversions within the main house require no new capacity charges, new detached ADUs typically require coordinated connections with Padre Dam Municipal Water District or Helix Water District, as well as the City of El Cajon wastewater system. Fire sprinklers are required only if sprinklers are already installed in the primary dwelling, and solar panels are mandated for new detached units under California Title 24.",
      ],
    },
  ],
  fees: {
    heading: "Permit fees and development charges in El Cajon",
    paragraphs: [
      "Permitting an ADU in El Cajon incurs plan check, building permit, and inspection fees collected by the Community Development Department. Total municipal building permit fees generally range between $2,200 and $4,200 depending on total square footage and structural valuation.",
      "In compliance with California Government Code, El Cajon levies zero Development Impact Fees (DIF) for any ADU of 750 square feet or less. For units larger than 750 square feet, impact fees (including transportation, parks, and regional drainage) are assessed proportionately to the size of the main house.",
      "School district impact fees apply once a project exceeds 500 square feet, and then on the whole assessable area, not just the area above 500 (a 700-square-foot ADU is assessed on 700 square feet). They are assessed by the Cajon Valley Union School District (elementary/middle) and the Grossmont Union High School District (high school). Water and sewer agency fees are determined by either Padre Dam Municipal Water District or Helix Water District.",
    ],
    bullets: [
      "City permit fees: $2,200–$4,200 covering building, plumbing, electrical, and mechanical plan review",
      "Impact fees: 100% exempt for units of 750 sq ft or less; scaled proportionately for larger units",
      "School district fees: projects of 500 sq ft or less are exempt; larger projects pay on their full square footage to Cajon Valley and Grossmont districts",
      "Water & sewer fees: determined by Padre Dam or Helix Water District depending on parcel service area",
      "Fire review fees: assessed by Heartland Fire & Rescue for access and hydrants",
    ],
  },
  processIntro:
    "El Cajon processes ADU applications through a streamlined ministerial review. The Community Development Department issues decisions within 60 calendar days of submittal without public notice or hearings.",
  processSteps: [
    {
      title: "Confirm zoning and setback tiers",
      detail:
        "Locate your property lines and determine whether your proposed unit will utilize the 3-foot (12 ft height), 4-foot (16 ft height), or 5-foot (20 ft height) setback tier under §17.140.180, or qualifies for an 18-foot exception near transit or beside a two-story primary home.",
    },
    {
      title: "Draft architectural blueprints and engineering",
      detail:
        "Prepare complete architectural plans, structural engineering calculations, Title 24 energy calculations, and a detailed site plan illustrating building separations and utility runs.",
    },
    {
      title: "Submit plans to Community Development",
      detail:
        "Submit plan sets and application documents to the City of El Cajon Community Development Department through the City's online permitting portal or front counter.",
    },
    {
      title: "Plan check review across city departments",
      detail:
        "Building, planning, engineering, and Heartland Fire & Rescue staff review the submission for code compliance. Plan check cycles typically take 20 to 30 business days.",
    },
    {
      title: "Respond to plan check corrections",
      detail:
        "Coordinate with your draftsman, architect, or engineer to update drawings based on plan check correction notices, then resubmit revised sheets.",
    },
    {
      title: "Pull permit and start construction",
      detail:
        "Pay final building and inspection fees, receive your approved job card and stamped blueprints, and commence site grading and foundation excavation.",
    },
  ],
  permitPortal: {
    label: "City of El Cajon Community Development Online Permitting",
    url: "https://www.elcajon.gov/your-government/departments/community-development",
  },
  faqs: [
    {
      question: "Can I build an ADU in El Cajon?",
      answer:
        "Yes. Any residential property in El Cajon developed with a single-family home can add a full ADU (detached or attached) plus a junior accessory dwelling unit (JADU). In fact, a converted ADU inside existing space, a new detached ADU and a junior ADU (JADU) can all be built together when each meets its own requirements (Gov. Code §66323(a)).",
    },
    {
      question: "What are the setback requirements in El Cajon?",
      answer:
        "El Cajon uses a tiered setback system: 3 feet from side and rear lines for units up to 12 feet high; 4 feet for units up to 16 feet high; and 5 feet for units up to 20 feet high. Near qualifying transit, or beside a primary home of two or more stories, a detached ADU may reach 18 feet without moving to the 5-foot tier.",
    },
    {
      question: "How big can an ADU be in El Cajon?",
      answer:
        "A detached ADU can be built up to 1,200 square feet. El Cajon applies the same 1,200-square-foot maximum to attached ADUs; its code does not cap an attached unit at a percentage of the primary home.",
    },
    {
      question: "Do I need to add parking for an ADU in El Cajon?",
      answer:
        "No parking space is required if the property is located within 0.5 miles of public transit, including the El Cajon Transit Center and local bus lines. Converting an existing garage also requires no replacement parking. No parking can be required for a new detached ADU of 800 square feet or less built under the state's Gov. Code §66323(a)(2) pathway either.",
    },
    {
      question: "Can I build an ADU on a multi-family property in El Cajon?",
      answer:
        "Yes. Multi-family parcels can convert existing non-livable spaces (such as storage rooms or carports) into ADUs for up to 25% of existing units, plus build detached ADUs with 4-foot setbacks: up to two on a proposed multifamily development, or up to eight on an existing one, capped at the number of existing primary units.",
    },
    {
      question: "Are fire sprinklers required for an ADU in El Cajon?",
      answer:
        "Fire sprinklers can only be required in the ADU if they are required in the primary single-family home. Where fire access or water supply falls short, Heartland Fire may accept sprinklers as one optional way to comply, but they cannot be mandated on that basis.",
    },
    {
      question: "Can I rent my El Cajon ADU as an Airbnb?",
      answer:
        "No. Newly permitted ADUs in El Cajon must be leased for terms longer than 30 consecutive days. Short-term vacation rentals are prohibited.",
    },
    {
      question: "How long does it take to get an ADU permit in El Cajon?",
      answer:
        "Permit reviews are administrative and legally required to be decided within 60 calendar days of receiving a complete application. Average initial plan check takes approximately 3 to 4 weeks.",
    },
  ],
  neighbors: ["la-mesa", "san-diego-county"],
  sources: [
    {
      label: "El Cajon Municipal Code Title 17, Chapter 17.140: Accessory Dwelling Units (§17.140.180)",
      url: "https://www.ecode360.com/EL3698",
    },
    {
      label: "City of El Cajon Community Development — Planning & Housing Resources",
      url: "https://www.elcajon.gov/your-government/departments/community-development",
    },
    {
      label: "Heartland Fire & Rescue — Residential Development Standards",
      url: "https://www.heartlandfire.org/",
    },
  ],
};
