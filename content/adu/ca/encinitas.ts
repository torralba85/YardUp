/**
 * Encinitas ADU jurisdiction content.
 *
 * Primary sources: Encinitas Municipal Code Chapter 30.48, specifically
 * §30.48.040(T) for Accessory Dwelling Units and §30.48.040(U) for Junior
 * Accessory Dwelling Units; the City's Permit-Ready ADU (PRADU) program
 * handbook and plan catalog; the Development Services Department's ADU
 * Submittal Checklist; and the City's Local Coastal Program (LCP) guidelines
 * for Coastal Development Permit (CDP) processing.
 *
 * Encinitas pairs state ADU law with its award-winning PRADU program, which
 * offers pre-approved architectural plan sets with expedited plan check.
 * Much of the city, mostly west of Interstate 5 but extending east of it in places, lies within the California Coastal Zone,
 * where a Coastal Development Permit is required; notably, the City waives
 * its local development processing fees for standard ADU CDPs.
 *
 * @module adu/ca/encinitas
 */
import type { JurisdictionContent } from "@/lib/adu/types";

export const encinitas: JurisdictionContent = {
  state: "ca",
  stateName: "California",
  city: "Encinitas",
  slug: "encinitas",
  county: "San Diego County",
  asOf: "2026-11-08",
  published: "2026-10-30",
  metaTitle: "Encinitas ADU Rules (2026): PRADU Plans, Coastal & Cost",
  metaDescription:
    "Encinitas ADU rules: up to 1,200 sq ft detached, 4 ft setbacks, PRADU plans, and Coastal Zone permit rules. See instant feasibility for your lot.",
  introAnswer: [
    "Yes. The City of Encinitas allows accessory dwelling units (ADUs) on any single-family residential lot: a converted ADU inside existing space, a new detached ADU and a junior ADU (JADU) can all be built together when each meets its own requirements (Gov. Code §66323(a)). Attached and detached ADUs can each reach 1,200 square feet or the primary home's living area, whichever is less, provided lot coverage and required setbacks are satisfied.",
    "Encinitas is famous across California for its Permit-Ready ADU (PRADU) program. Property owners can choose from a curated catalog of pre-approved, code-compliant architectural plan sets designed by licensed architects. Selecting a PRADU plan bypasses custom architectural design expenses and qualifies your project for expedited departmental plan check.",
    "Much of Encinitas lies inside the California Coastal Zone. The boundary mostly follows the land west of Interstate 5 but reaches east of the freeway in places, so check your parcel on the City's Coastal Zone map rather than relying on the freeway. Most new detached ADUs inside the boundary require a Coastal Development Permit (CDP). To encourage backyard home construction, Encinitas waives the local City application processing fees for ADU coastal permits, and decisions are handled administratively without a public hearing.",
  ],
  metaSizeNote: "up to 1,200 sq ft attached or detached, capped at the home's living area",
  metaSetbackNote: "4 ft side and rear for new construction; 0 ft for conversions",
  metaParkingNote: "none within 0.5 miles of transit, including the Coaster station",
  glance: [
    {
      label: "Max size — detached",
      value: "Up to 1,200 sq ft",
      note: "Subject to underlying lot coverage; an ADU up to 800 sq ft with 4 ft setbacks is exempt from local lot coverage limits under state mandate",
    },
    {
      label: "Max size — attached",
      value: "1,200 sq ft or the primary living area, whichever is less",
      note: "§30.48.040(T)(14)(b) applies the same limit to attached and detached units; there is no 50% cap",
    },
    {
      label: "Max size — JADU",
      value: "500 sq ft maximum",
      note: "Must be constructed within the existing or proposed walls of the main residence or attached garage",
    },
    {
      label: "Max height — detached",
      value: "16 ft standard; up to 18 ft near transit stops",
      note: "Additional 2 ft allowed to match the roof pitch of the primary residence; attached ADUs follow underlying zone limits (up to 22–25 ft)",
    },
    {
      label: "Rear and side setbacks",
      value: "4 ft minimum for new detached or attached construction",
      note: "Conversions of legally permitted existing garages or accessory buildings keep existing setbacks (down to 0 ft)",
    },
    {
      label: "Front setback",
      value: "Governed by the underlying residential zone",
      note: "Cannot be applied to preclude the construction of an 800 sq ft detached ADU",
    },
    {
      label: "Parking required",
      value: "1 off-street space, waived within a half-mile walk of transit",
      note: "Exempt within 0.5 miles of the Encinitas Coaster Station or NCTD bus corridors, in historic districts, or for garage conversions; also exempt for a new detached ADU of 800 sq ft or less built under Gov. Code §66323(a)(2)",
    },
    {
      label: "Owner-occupancy",
      value: "Not required for standard ADUs",
      note: "JADUs require owner-occupancy of either the main house or the JADU only if sanitation facilities are shared",
    },
    {
      label: "Rentals and sale",
      value: "Minimum 30-day lease term; separate sale prohibited",
      note: "Short-term vacation rentals (under 30 days) are prohibited in newly permitted ADUs",
    },
    {
      label: "Approval timeline",
      value: "Administrative approval within 60 calendar days",
      note: "Pre-approved PRADU plans qualify for expedited 30-day review under California pre-approved ADU law (Gov. Code §66324 / AB 1332)",
    },
  ],
  cityDiffers: [
    {
      heading: "The Encinitas PRADU program: pre-approved plans and expedited review",
      paragraphs: [
        "Encinitas stands out in Southern California for its Permit-Ready ADU (PRADU) initiative, created to remove the costly hurdle of custom drafting. The City partners with regional architectural firms to maintain a diverse catalog of pre-reviewed building plans, ranging from compact studio floor plans up to multi-bedroom layouts of 1,200 square feet. Each pre-approved set already complies with the California Building Code, structural wind/seismic standards, and Title 24 energy requirements.",
        "Choosing a PRADU plan set dramatically accelerates your timeline. Because the structural engineering and internal layouts have already undergone comprehensive vetting by City plan examiners, staff reviews focus primarily on your property-specific site plan, utility connections, and grading. Modifying exterior materials or window fenestrations is permitted within specified guidelines, but relocating load-bearing walls or altering external dimensions routes the project into custom plan review.",
        "Under Encinitas Municipal Code §30.48.040(T), all ADU applications receive non-discretionary, administrative review. There are no public hearings, design review board delays, or neighbor sign-off hurdles. Building officials verify compliance against standard objective metrics within the statutory 60-day window. In addition, detached units must feature exterior colors, roof materials, and siding that harmonize with the main residence, and a roof deck is allowed on an ADU under §30.48.040(T)(16)(c) using the reduced ADU setbacks, provided the deck and its railings stay within the 16-foot height limit. Under California Title 24, newly constructed detached ADUs must add new solar photovoltaic modules unless a code exception (such as heavy shading) applies. Panels already on the main house do not count, but the new modules may expand the main house's system rather than form a separate system on the ADU.",
      ],
    },
    {
      heading: "Coastal Zone permits, transit corridors, and bluff stability",
      paragraphs: [
        "Properties inside the Coastal Zone boundary, which covers most land west of Interstate 5 and some parcels east of it, are governed by the City's certified Local Coastal Program (LCP). State ADU statutes establish that environmental protections under the California Coastal Act take precedence in cases of direct statutory conflict. Consequently, most detached ADU projects inside the Coastal Zone require a Coastal Development Permit (CDP) in addition to standard building permits.",
        "Encinitas has taken significant steps to reduce coastal development friction: the City administratively processes ADU coastal permits without requiring a public Planning Commission hearing, and local application fees for standard ADU CDPs are fully waived. However, lots located along coastal bluffs or steep inland canyons must satisfy geotechnical setback requirements and demonstrate 75-year bluff edge stability without the reliance on shoreline protective devices.",
        "Parking standards reflect Encinitas's transit infrastructure. If your property is situated within a half-mile walking radius of the Encinitas Coaster station on South Coast Highway 101 or along active North County Transit District (NCTD) bus lines, no dedicated parking space is required. When converting an attached or detached garage into an ADU, state and local ordinances prohibit the City from demanding replacement off-street spaces for the primary house.",
      ],
    },
  ],
  fees: {
    heading: "Permit costs and fee exemptions in Encinitas",
    paragraphs: [
      "Encinitas waives its own plan-review and inspection fees for ADUs, whether you use a pre-approved PRADU plan set or a custom design. The waiver does not cover fees the City must collect for the State, postage, or the recording of the ADU covenant, so expect a small balance for those items.",
      "Development Impact Fees (DIF)—including parkland, traffic, and general municipal facilities charges—are completely exempt for all ADUs of 750 square feet of interior livable space or less, as well as all junior ADUs. For units larger than 750 square feet, impact fees are levied proportionally relative to the square footage of the primary dwelling.",
      "School district impact fees are assessed independently by the San Dieguito Union High School District and the Encinitas Union School District for units exceeding 500 square feet. Water and sewer connection charges vary depending on whether an independent meter is requested; conversions within existing building envelopes require no new utility capacity meters.",
    ],
    bullets: [
      "City plan-review and inspection fees: waived for ADUs; state-mandated fees, postage and covenant recording still apply",
      "Coastal Development Permit: local application processing fee waived for qualifying ADUs",
      "Impact fees: $0 for units of 750 sq ft or less and JADUs; proportional assessment above 750 sq ft",
      "School impact fees: assessed by local school districts on residential additions over 500 sq ft",
      "Utility capacity fees: San Dieguito Water District charges apply only if a new dedicated meter is installed",
    ],
  },
  processIntro:
    "Encinitas approves ADU and JADU permits through an administrative, non-discretionary process. Review is completed within 60 calendar days of receiving a complete application, with expedited routing for PRADU plans.",
  processSteps: [
    {
      title: "Check zoning and Coastal Zone maps",
      detail:
        "Look up your parcel on the City's Coastal Zone map (the boundary extends east of Interstate 5 in places), check proximity to the Encinitas Coaster Station for transit parking exemptions, and verify any geotechnical or steep slope overlays.",
    },
    {
      title: "Select your design pathway",
      detail:
        "Choose between selecting a pre-approved PRADU plan set from the City's architectural catalog or engaging a licensed architect or designer to draft custom blueprints suited to your yard.",
    },
    {
      title: "Prepare site plan and civil drawings",
      detail:
        "Draft a property-specific site plan demonstrating compliance with 4-foot rear and side setbacks, building separation, solar PV placement, utility routing, and drainage.",
    },
    {
      title: "Submit building and coastal permit applications",
      detail:
        "Submit digital plans through the Encinitas Customer Self-Service (CSS) portal. If your parcel is inside the Coastal Zone, include the concurrent Administrative Coastal Development Permit application.",
    },
    {
      title: "Plan check review and corrections",
      detail:
        "City building, planning, fire, and engineering staff review drawings within 15–30 business days. Respond to any code corrections or engineering notes to finalize plan check.",
    },
    {
      title: "Permit issuance and construction inspections",
      detail:
        "Pay remaining building permit fees, pull the job card, and begin construction. Schedule required inspections for foundation, framing, rough MEP, Title 24 insulation, and final occupancy.",
    },
  ],
  permitPortal: {
    label: "City of Encinitas Customer Self-Service (CSS) Permit Portal",
    url: "https://www.encinitasca.gov/government/departments/development-services/permits",
  },
  faqs: [
    {
      question: "Can I build an ADU in Encinitas?",
      answer:
        "Yes. Any single-family zoned parcel in Encinitas can build an ADU and a junior ADU (JADU). In fact, a converted ADU inside existing space, a new detached ADU and a junior ADU (JADU) can all be built together when each meets its own requirements (Gov. Code §66323(a)).",
    },
    {
      question: "What is the Encinitas PRADU program?",
      answer:
        "The Permit-Ready ADU (PRADU) program offers property owners access to pre-approved architectural plan sets designed by participating regional firms. Using a pre-approved plan avoids custom structural drafting delays and qualifies the project for expedited 30-day review under California state law (Gov. Code §66324 / AB 1332).",
    },
    {
      question: "Do I need a Coastal Development Permit for an ADU in Encinitas?",
      answer:
        "If your parcel is inside the California Coastal Zone (mostly west of Interstate 5, but check the City's Coastal Zone map because the boundary extends east of the freeway in places), an Administrative Coastal Development Permit (CDP) is generally required. Encinitas waives its local application processing fee for ADU CDPs.",
    },
    {
      question: "What are the setback requirements in Encinitas?",
      answer:
        "New detached and attached ADUs require a minimum setback of 4 feet from side and rear property lines. Existing legal structures, such as detached garages, can be converted with 0-foot setbacks.",
    },
    {
      question: "How large can an ADU be in Encinitas?",
      answer:
        "Detached ADUs in Encinitas can be built up to 1,200 square feet, subject to lot coverage constraints. Both attached and detached ADUs are capped at 1,200 square feet or the primary dwelling's living area, whichever is less.",
    },
    {
      question: "Is off-street parking required for an ADU in Encinitas?",
      answer:
        "One parking space is standard, but it is completely waived if your home is within 0.5 miles of public transit (including the Encinitas Coaster station), in a historic district, or if you are converting existing space. No parking can be required for a new detached ADU of 800 square feet or less built under the state's Gov. Code §66323(a)(2) pathway either.",
    },
    {
      question: "Can I rent my Encinitas ADU on Airbnb?",
      answer:
        "No. Encinitas Municipal Code prohibits short-term vacation rentals of less than 30 consecutive days in all newly permitted accessory dwelling units. Leases must be for 30 days or longer.",
    },
    {
      question: "Do I have to pay impact fees for an ADU in Encinitas?",
      answer:
        "Development impact fees are fully waived for any ADU of 750 square feet or less. Units larger than 750 square feet pay impact fees proportional to the square footage of the primary home.",
    },
  ],
  neighbors: ["carlsbad", "san-marcos", "san-diego-county"],
  sources: [
    {
      label: "Encinitas Municipal Code Chapter 30.48: Accessory Dwelling Units (§30.48.040.T)",
      url: "https://www.qcode.us/codes/encinitas/",
    },
    {
      label: "City of Encinitas Development Services — Accessory Dwelling Units & PRADU",
      url: "https://www.encinitasca.gov/i-want-to/accessory-dwelling-unit",
    },
    {
      label: "City of Encinitas — Planning & Coastal Zone Overlay Information",
      url: "https://www.encinitasca.gov/government/departments/development-services/planning",
    },
  ],
};
