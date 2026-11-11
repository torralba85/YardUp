/**
 * Vista ADU jurisdiction content.
 *
 * Primary sources: Vista Municipal Code Chapter 18.31 (Accessory Dwelling
 * Units), incorporating Ordinance No. 2020-14 and subsequent amendments; the
 * City of Vista Planning and Community Development ADU Handout; the City's
 * ADU Impact Fee Waiver Program guidelines; and North County Fire Protection
 * District residential access standards.
 *
 * Vista permits ADUs across single-family, agricultural, and estate zones
 * (R-1, R-1-B, E-1, A-1, O-R). Notably, beyond state-mandated fee exemptions
 * for units of 750 sq ft or less, Vista runs a progressive local Fee Waiver
 * Program for units over 750 sq ft when owners commit to affordable rents
 * or house a family member or caregiver who cares for the primary unit's
 * owner or occupant. A 5-foot building separation is enforced between
 * detached structures, and transit parking waivers cover Sprinter rail stops.
 *
 * @module adu/ca/vista
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const vista: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Vista",
  slug: "vista",
  county: "San Diego County",
  asOf: "2026-10-30",
  published: "2026-10-30",
  metaTitle: "Vista ADU Rules (2026): Size, Fee Waivers & Setbacks",
  metaDescription:
    "Vista ADU rules: 1,200 sq ft detached units, 4 ft setbacks, 5 ft building separation, and the local fee waiver program. Check your lot, free.",
  introAnswer: [
    "Yes. The City of Vista allows single-family property owners to build accessory dwelling units on the same residential lot: a converted ADU inside existing space, a new detached ADU and a junior ADU (JADU) can all be built together when each meets its own requirements (Gov. Code §66323(a)). A detached backyard home can be built up to 1,200 square feet, while an attached unit can measure up to 50% of the primary residence.",
    "Beyond state law standards, Vista features a progressive ADU Impact Fee Waiver Program under Chapter 18.31. While state law automatically exempts units of 750 square feet or less from municipal impact fees, Vista waives development fees on larger units (over 750 sq ft) for property owners who agree to a 10-year regulatory covenant renting to lower-income households or housing a family member or caregiver who provides regular care to an owner or occupant of the primary home.",
    "Vista requires 5 feet of separation, measured eave to eave, between a new detached ADU and the primary home or other structures such as patio covers and sheds. Parcels located within a half-mile walking distance of public transit—including the Vista Transit Center and North County Transit District (NCTD) Sprinter light rail stops—are completely exempt from off-street parking requirements.",
  ],
  metaSizeNote: "up to 1,200 sq ft detached; attached up to 50% of home",
  metaSetbackNote: "4 ft side and rear; 5 ft building separation required",
  metaParkingNote: "none within 0.5 miles of Sprinter stations or bus routes",
  glance: [
    {
      label: "Max size — detached",
      value: "Up to 1,200 sq ft",
      note: "Allowed by right across residential and agricultural zones (R-1, R-1-B, E-1, A-1, O-R) subject to lot coverage constraints",
    },
    {
      label: "Max size — attached",
      value: "50% of existing living area or 1,200 sq ft, whichever is less",
      note: "State law guarantees an attached unit can be built up to at least 850 sq ft (studio/1BR) or 1,000 sq ft (2+ BR) regardless of percentage",
    },
    {
      label: "Max size — JADU",
      value: "500 sq ft maximum",
      note: "Must be created entirely within the existing or proposed walls of the main house or attached garage",
    },
    {
      label: "Max height — detached",
      value: "16 ft standard; up to 18 ft near transit corridors",
      note: "Attached ADUs may reach up to 25 ft or the underlying zone's maximum height limit",
    },
    {
      label: "Rear and side setbacks",
      value: "4 ft minimum for new detached or attached construction",
      note: "Conversions of legally permitted existing accessory structures (like garages) can maintain existing setbacks down to 0 ft",
    },
    {
      label: "Front setback",
      value: "Governed by underlying zoning district standards",
      note: "Cannot be enforced if it precludes an 800 sq ft detached ADU meeting 4 ft rear/side setbacks",
    },
    {
      label: "Building separation",
      value: "5 ft minimum, measured eave to eave",
      note: "Applies between a detached ADU and the main dwelling or other structures such as patio covers and sheds",
    },
    {
      label: "Parking required",
      value: "1 off-street space, waived within 0.5 miles of transit",
      note: "Exempt within a half-mile walk of NCTD Sprinter rail stations or Breeze bus lines, in historic districts, or for garage conversions; also exempt for a new detached ADU of 800 sq ft or less built under Gov. Code §66323(a)(2)",
    },
    {
      label: "Owner-occupancy",
      value: "Not required for standard ADUs",
      note: "Mandatory only for junior ADUs (JADUs) where kitchen or sanitation facilities are shared with the primary house",
    },
    {
      label: "Rentals and sale",
      value: "Minimum 30-day lease duration; separate sale prohibited",
      note: "Short-term vacation rentals (under 30 days) are prohibited; ADU cannot be subdivided or sold separately from the primary lot",
    },
  ],
  cityDiffers: [
    {
      heading: "The Vista rulebook: Chapter 18.31 and local fee waiver covenants",
      paragraphs: [
        "ADU regulations in Vista are established in Municipal Code Chapter 18.31. The ordinance permits backyard homes across traditional suburban single-family zones (R-1, R-1-B) as well as estate and agricultural zones (E-1, A-1, O-R) common throughout the city's rolling hills. Detached ADUs can reach up to 1,200 square feet, enabling two- and three-bedroom floor plans with full kitchen and laundry facilities.",
        "A standout feature of Vista's local framework is the City's Affordable ADU Fee Waiver Program. Under state law, municipal development impact fees are waived for any ADU of 750 square feet of interior livable space or less. For units larger than 750 square feet, which would normally pay proportional traffic and parkland fees, Vista will waive these municipal impact fees if the property owner records a 10-year deed restriction ensuring the home is rented to a certified lower-income household or occupied by a family member or caregiver who provides regular care to an owner or occupant of the primary unit. Housing a relative who receives care in the ADU does not, by itself, qualify.",
        "Vista also specifies structural eligibility criteria: manufactured homes, modular units, and stick-built homes on permanent foundation systems are permitted, but recreational vehicles (RVs), converted shipping containers, and pre-fabricated tool sheds are explicitly prohibited as permanent dwelling units.",
      ],
    },
    {
      heading: "Building separation, Sprinter transit access, and fire clearance",
      paragraphs: [
        "Vista enforces a 5-foot building separation, measured eave to eave rather than wall to wall, between a detached ADU and the main residence, and the same separation applies to other structures such as patio covers and sheds. Roof overhangs therefore push the walls farther apart than 5 feet. This standard ensures adequate emergency egress, private outdoor space, and structural fire protection. While side and rear property line setbacks require only 4 feet, the 5-foot separation between on-site buildings must be reflected accurately on your architectural site plan. In addition, architectural finishes and exterior wall colors should complement the architectural design of the main house without requiring discretionary design review.",
        "Public transit access plays an important role in parking standards. Vista is connected via the North County Transit District (NCTD) Sprinter hybrid rail line, serving the Vista Transit Center and Civic Center stations. Parcels situated within a half-mile walking distance of any Sprinter station or high-frequency NCTD bus line require zero dedicated off-street parking spaces. When an existing garage or carport is converted, replacement parking for the primary residence is not required.",
        "Properties situated in Vista's hillside terrain or designated wildland-urban interface (WUI) zones must coordinate with the Vista Fire Department. Building designs must incorporate Class A fire-rated roofing, ember-resistant attic vents, non-combustible exterior siding, and maintain 100 feet of defensible space brush management. Fire sprinklers are required only if the primary dwelling already features an active fire sprinkler system.",
      ],
    },
  ],
  fees: {
    heading: "Permit costs and fee waiver incentives in Vista",
    paragraphs: [
      "Building permit, plan review, and inspection fees for a typical ADU in Vista generally total between $2,400 and $4,200, collected by the Community Development Department based on project valuation and conditioned square footage.",
      "Development impact fees are $0 for all units of 750 square feet or less. For units larger than 750 square feet, owners can either pay proportional impact fees or apply for Vista's 10-year affordable fee waiver program to eliminate City impact charges entirely.",
      "School district impact fees apply to units larger than 500 square feet, on the unit's full square footage rather than only the area above 500, assessed by the Vista Unified School District. Water and sewer connection fees are administered by the Vista Irrigation District (VID) or the City of Vista sewer utility depending on parcel location; conversions within the home envelope trigger no new meter fees.",
    ],
    bullets: [
      "City permit fees: $2,400–$4,200 for building, electrical, mechanical, and plumbing plan checks",
      "Impact fees: $0 at 750 sq ft or less; fee waiver program available above 750 sq ft with a qualifying covenant",
      "School district fees: units of 500 sq ft or less are exempt; larger units pay on their full square footage to Vista Unified School District",
      "Water capacity fees: Vista Irrigation District (VID) charges them for a separate meter, or the capacity-fee difference when an existing meter is upsized (e.g., 3/4 to 1 inch)",
      "Fire review fee: assessed by the Vista Fire Department for access and defensible space review",
    ],
  },
  processIntro:
    "Vista reviews ADU applications through a non-discretionary administrative process. The Planning and Building Divisions complete reviews within 60 calendar days of receiving a complete submittal.",
  processSteps: [
    {
      title: "Confirm zoning, setbacks, and building separation",
      detail:
        "Verify your parcel lies within an eligible zone (R-1, R-1-B, E-1, A-1, O-R) and ensure your layout provides 4-foot property line setbacks and 5-foot eave-to-eave separation from the main dwelling and other structures.",
    },
    {
      title: "Evaluate fee waiver qualification",
      detail:
        "If designing a unit over 750 square feet, decide whether to participate in Vista's 10-year affordable covenant fee waiver program to eliminate municipal development impact fees.",
    },
    {
      title: "Complete architectural plans and Title 24 energy calculations",
      detail:
        "Draft structural plans, foundation engineering, architectural elevations, electrical/plumbing diagrams, and Title 24 energy compliance documentation.",
    },
    {
      title: "Submit application to Community Development",
      detail:
        "Upload complete drawing sets and application forms through the City of Vista's online permitting portal for concurrent planning, building, and fire review.",
    },
    {
      title: "Address plan check corrections",
      detail:
        "City departments return initial plan check comments within 15–25 business days. Coordinate with your design team to revise sheets and clear all comments.",
    },
    {
      title: "Obtain building permit and schedule inspections",
      detail:
        "Pay remaining permit and inspection fees, pull the permit, and begin construction. Schedule required milestones: foundation footings, framing, rough MEP, insulation, and final inspection.",
    },
  ],
  permitPortal: {
    label: "City of Vista Community Development & Online Permitting",
    url: "https://www.cityofvista.com/departments/community-development/building",
  },
  faqs: [
    {
      question: "Can I build an ADU on my property in Vista?",
      answer:
        "Yes. Any legal parcel in Vista zoned for residential or agricultural use developed with a single-family home can build an ADU (detached or attached) plus a junior ADU (JADU). In fact, a converted ADU inside existing space, a new detached ADU and a junior ADU (JADU) can all be built together when each meets its own requirements (Gov. Code §66323(a)).",
    },
    {
      question: "What is Vista's ADU fee waiver program?",
      answer:
        "Under Chapter 18.31, Vista waives municipal impact fees on ADUs larger than 750 square feet if the homeowner agrees to record a 10-year covenant renting the unit at affordable rates to a lower-income household, or to house a family member or caregiver who provides regular care to an owner or occupant of the primary unit.",
    },
    {
      question: "What are the setback requirements for an ADU in Vista?",
      answer:
        "New detached and attached ADUs require a minimum setback of 4 feet from side and rear property lines. In addition, detached ADUs must maintain at least 5 feet of separation, measured eave to eave, from the primary residence and other structures.",
    },
    {
      question: "How large can an ADU be in Vista?",
      answer:
        "A detached ADU can measure up to 1,200 square feet. An attached ADU is capped at 50% of the primary residence's living space or 1,200 square feet, whichever is less (with a state-protected minimum of 800 to 1,000 square feet).",
    },
    {
      question: "Is off-street parking required for an ADU in Vista?",
      answer:
        "One parking space is standard, but it is completely waived if the parcel is within 0.5 miles of public transit (including NCTD Sprinter stations and bus stops) or when converting an existing garage. No parking can be required for a new detached ADU of 800 square feet or less built under the state's Gov. Code §66323(a)(2) pathway either.",
    },
    {
      question: "Can I use a shipping container or RV as an ADU in Vista?",
      answer:
        "No. Vista Municipal Code explicitly prohibits recreational vehicles (RVs), shipping containers, and prefabricated tool sheds from being used as permanent accessory dwelling units.",
    },
    {
      question: "Can I rent an ADU in Vista on Airbnb?",
      answer:
        "No. Vista regulations require newly permitted accessory dwelling units to be rented for terms of more than 30 consecutive days. Short-term vacation rentals are prohibited.",
    },
    {
      question: "Do I need fire sprinklers in my Vista ADU?",
      answer:
        "Fire sprinklers can only be required in the ADU if they are required in the primary single-family dwelling. Where fire access or water supply falls short, the Vista Fire Department may accept sprinklers as one optional way to comply, but they cannot be mandated on that basis.",
    },
  ],
  neighbors: ["oceanside", "carlsbad", "san-marcos", "san-diego-county"],
  sources: [
    {
      label: "Vista Municipal Code Chapter 18.31: Accessory Dwelling Units",
      url: "https://www.qcode.us/codes/vista/",
    },
    {
      label: "City of Vista Community Development — Planning & ADU Guidelines",
      url: "https://www.cityofvista.com/departments/community-development/planning",
    },
    {
      label: "City of Vista Housing Division — ADU Impact Fee Waiver Program",
      url: "https://www.cityofvista.com/departments/community-development/housing",
    },
  ],
};
