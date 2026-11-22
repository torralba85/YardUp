import { CANONICAL_ORIGIN } from "./canonical-origin";
import type { Parcel } from "./feasibility";
import { fireZoneLabel, isHighFireZone, parcelFireHazard } from "./fire-hazard";
import { parcelConfidence } from "./parcel-confidence";
import { isSanDiegoName, parcelPermitAuthority } from "./permit-authority";
import { STATE_BASELINE_SOURCES } from "@/content/adu/state-baseline";

/**
 * The Permit & Fee Trap Audit recorded in the paid Certificate of Feasibility:
 * the 750 sq ft impact-fee threshold, the fees that still apply, and the
 * counter-submittal and zoning checks for the scenario's size, height and
 * jurisdiction.
 *
 * Rules come from the HCD ADU Handbook (March 2026), which exempts an ADU of
 * "750 square feet of interior livable space or less", and, for the City of
 * San Diego, the City's DIF FAQ and SDMC § 141.0302 (as summarized in
 * `content/adu/ca/san-diego.ts`), and for unincorporated San Diego County,
 * the County's ADU page and handbook and its Green Building Incentive
 * Program (PDS 273, Rev. 06/12/2026; as summarized in
 * `content/adu/ca/san-diego-county.ts`). The Studio measures the outside footprint,
 * which is never smaller than the interior livable area, so a footprint at or
 * under the limit is always within it.
 *
 * @module certificate-permit-audit
 */

/** Largest ADU, in sq ft, that California exempts from local impact fees. */
export const IMPACT_FEE_EXEMPT_MAX_SQFT = 750;

/** ADUs smaller than this are exempt from school district fees. */
export const SCHOOL_FEE_EXEMPT_BELOW_SQFT = 500;

/** Height every California city must allow for a detached ADU, in feet. */
export const STATE_DETACHED_HEIGHT_FLOOR_FT = 16;

/**
 * Whose fee rules apply: the City of San Diego, unincorporated San Diego
 * County, the rest of California, or neither.
 */
export type FeeJurisdiction = "san-diego" | "san-diego-county" | "california" | "other";

const CITY_DIF_FAQ = {
  label: "City of San Diego DIF FAQ",
  url: "https://www.sandiego.gov/planning/work/public-spaces/faq",
};
const CITY_IB_400 = {
  label: "City of San Diego ADU Information Bulletin 400",
  url: "https://www.sandiego.gov/development-services/forms-publications/information-bulletins/400",
};
const SAN_DIEGO_GUIDE = {
  label: "LotFoundry San Diego ADU rules guide",
  url: `${CANONICAL_ORIGIN}/adu/ca/san-diego`,
};
const COUNTY_ADU_PAGE = {
  label: "County of San Diego PDS — Accessory Dwelling Units",
  url: "https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu.html",
};
const COUNTY_GREEN_BUILDING = {
  label: "County of San Diego — Green Building Incentive Program",
  url: "https://www.sandiegocounty.gov/content/sdc/pds/greenbuildings.html",
};
const SAN_DIEGO_COUNTY_GUIDE = {
  label: "LotFoundry unincorporated San Diego County ADU rules guide",
  url: `${CANONICAL_ORIGIN}/adu/ca/san-diego-county`,
};

function parcelState(parcel: Parcel): string {
  const state = (parcel as { state?: unknown }).state;
  if (typeof state === "string" && state.trim()) return state.trim().toUpperCase();
  // Presets and older saves carry the state only in the city line ("Seattle, WA 98115").
  const match = /,\s*([A-Za-z]{2}|California)(?:\s+\d{5}(?:-\d{4})?)?\s*$/i.exec(parcel.city);
  if (!match) return "";
  return match[1].toLowerCase() === "california" ? "CA" : match[1].toUpperCase();
}

/**
 * Which fee rules to apply. The parcel's permitting jurisdiction decides when
 * the lookup resolved one; otherwise the mailing-address city is the only
 * evidence, and a San Diego mailing address can sit on county land, so the
 * San Diego lines tell the reader to confirm the permitting jurisdiction.
 */
export function feeJurisdiction(parcel: Parcel): FeeJurisdiction {
  if (parcelState(parcel) !== "CA") return "other";
  const authority = parcelPermitAuthority(parcel);
  if (authority) {
    if (!isSanDiegoName(authority.name)) return "california";
    return authority.kind === "county" ? "san-diego-county" : "san-diego";
  }
  const cityName = parcel.city.split(",")[0].trim().toLowerCase();
  return cityName === "san diego" ? "san-diego" : "california";
}

/** Where a size sits against the 750 sq ft exemption. */
export interface ImpactFeeThreshold {
  /** Modeled ADU footprint, rounded to whole sq ft. */
  sqft: number;
  limitSqft: number;
  /** True at 750 sq ft or less (the HCD handbook's wording). */
  isExempt: boolean;
  /** Footprint to trim to reach the limit; `0` when exempt. */
  sqftOverLimit: number;
  /** Room left under the limit; `0` when over. */
  sqftUnderLimit: number;
}

export function assessImpactFeeThreshold(sqft: number): ImpactFeeThreshold {
  const over = sqft - IMPACT_FEE_EXEMPT_MAX_SQFT;
  return {
    sqft: Math.round(sqft),
    limitSqft: IMPACT_FEE_EXEMPT_MAX_SQFT,
    isExempt: over <= 0,
    sqftOverLimit: over > 0 ? Math.max(1, Math.ceil(over)) : 0,
    sqftUnderLimit: over < 0 ? Math.round(-over) : 0,
  };
}

/**
 * Above 750 sq ft, impact fees must be proportional to the main house: the
 * ADU's share of the fee for a new home the main house's size, as a whole
 * percentage. `null` when the main house's size is unknown.
 */
export function proportionalFeeSharePercent(aduSqft: number, mainHouseSqft: number): number | null {
  if (!(mainHouseSqft > 0) || !(aduSqft > 0)) return null;
  return Math.round((aduSqft / mainHouseSqft) * 100);
}

/** Tone of an audit line; status is always carried by a label and icon too. */
export type AuditTone = "clear" | "review" | "info";

export interface AuditLine {
  title: string;
  detail: string;
  tone: AuditTone;
}

export interface AuditSource {
  label: string;
  url: string;
}

export interface PermitFeeAudit {
  jurisdiction: FeeJurisdiction;
  threshold: ImpactFeeThreshold;
  /** Section heading for this jurisdiction. */
  title: string;
  feeLines: AuditLine[];
  submittalChecklist: string[];
  zoningChecklist: string[];
  sources: AuditSource[];
}

/** Section heading: the 750 sq ft rule only names the audit where it applies. */
export function permitAuditTitle(jurisdiction: FeeJurisdiction): string {
  return jurisdiction === "other"
    ? "Permit fee & submittal audit"
    : "750 sq ft impact-fee & permit audit";
}

/** The locked line titles the paywall previews before purchase. */
export function permitAuditPreviewLines(jurisdiction: FeeJurisdiction): string[] {
  if (jurisdiction === "other") {
    return [
      "Impact, school and utility fee questions for your city",
      "Counter submittal checklist: site plan, energy code, utility connections",
      "Zoning & overlay verification checklist",
    ];
  }
  if (jurisdiction === "san-diego-county") {
    return [
      "SB 13 impact-fee analysis and County Green Building fee discounts",
      "Unincorporated San Diego County counter submittal checklist: site plan, Title 24, septic and fire district",
      "Zoning & overlay verification checklist",
    ];
  }
  return [
    jurisdiction === "san-diego"
      ? "SB 13 and City of San Diego impact-fee (DIF) analysis"
      : "SB 13 impact-fee (DIF) analysis",
    `${jurisdiction === "san-diego" ? "San Diego" : "California"} counter submittal checklist: site plan, Title 24, utility connections`,
    "Zoning & overlay verification checklist",
  ];
}

function formatFeet(value: number): string {
  return `${Number(value.toFixed(1))} ft`;
}

function impactFeeLine(threshold: ImpactFeeThreshold, parcel: Parcel): AuditLine {
  const size = `${threshold.sqft.toLocaleString()} sq ft`;
  if (threshold.isExempt) {
    return {
      title: "Impact fees: exempt under state law",
      detail: `At ${size}, this layout is within California's 750 sq ft impact-fee exemption (SB 13), so local agencies, special districts and water corporations can't charge it impact fees.`,
      tone: "clear",
    };
  }
  const share = parcelConfidence(parcel).footprintKnown
    ? proportionalFeeSharePercent(threshold.sqft, parcel.existingHouseSqft)
    : null;
  const proportional = share === null
    ? "Above it, impact fees must be proportional to the size of the main house."
    : `Above it, impact fees must be proportional to the main house: about ${share}% of the fee for a new home its size (using its modeled ${parcel.existingHouseSqft.toLocaleString()} sq ft footprint).`;
  return {
    title: `Impact fees: ${threshold.sqftOverLimit.toLocaleString()} sq ft over the exemption`,
    detail: `At ${size}, this layout is over California's 750 sq ft impact-fee exemption (SB 13). ${proportional} State law counts interior livable space and this is the outside footprint, so check the livable area on your plans. Trimming ${threshold.sqftOverLimit.toLocaleString()} sq ft of footprint keeps the layout within the exemption.`,
    tone: "review",
  };
}

/** The fire zone checklist line, naming the mapped zone when the lookup found one. */
function fireZoneChecklistLine(parcel: Parcel): string {
  const fire = parcelFireHazard(parcel);
  const label = fire ? fireZoneLabel(fire.zone) : null;
  if (!fire || fire.zone === "unknown") {
    return "Fire hazard severity zone mapping: it can change setbacks, materials and access";
  }
  if (!label) {
    return `Fire hazard severity zone: none mapped at this lot on the ${fire.source}; confirm with the fire department`;
  }
  return isHighFireZone(fire.zone)
    ? `Fire hazard severity zone: mapped ${label} on the ${fire.source}; expect ignition-resistant materials, defensible space and fire access review`
    : `Fire hazard severity zone: mapped ${label} on the ${fire.source}; ask the fire department which material and defensible-space rules apply`;
}

function heightLine(jurisdiction: FeeJurisdiction, totalHeightFt: number, parcel: Parcel): AuditLine {
  const height = `Modeled height is ${formatFeet(totalHeightFt)}.`;
  const overFloor = totalHeightFt > STATE_DETACHED_HEIGHT_FLOOR_FT;
  if (jurisdiction === "san-diego") {
    const fire = parcelFireHazard(parcel);
    if (!overFloor && fire && isHighFireZone(fire.zone)) {
      return {
        title: "Height: 16 ft or less, in a fire hazard zone",
        detail: `${height} This lot is mapped ${fireZoneLabel(fire.zone)} on the ${fire.source}, so San Diego requires 4 ft side and rear setbacks at any height.`,
        tone: "review",
      };
    }
    if (!overFloor && (!fire || fire.zone === "unknown")) {
      // aduSetbacks holds 4 ft here (san-diego-unchecked), so the zero-setback line must not read as clear.
      return {
        title: "Height: 16 ft or less, fire zone not checked",
        detail: `${height} San Diego allows an ADU up to 16 ft tall with no side or rear setback outside High and Very High fire hazard zones, but this lot's zone could not be checked, so the layout holds 4 ft side and rear setbacks. Check the City's fire hazard map before relying on a zero setback.`,
        tone: "review",
      };
    }
    return overFloor
      ? {
          title: "Height: over San Diego's 16 ft line",
          detail: `${height} Over 16 ft next to a residential lot, San Diego requires 4 ft side and rear setbacks (or the base zone's outside the Coastal Overlay Zone, if smaller). In High and Very High fire hazard zones, 4 ft applies at any height.`,
          tone: "review",
        }
      : {
          title: "Height: 16 ft or less",
          detail: `${height} In the City of San Diego, an ADU up to 16 ft tall needs no side or rear setback outside High and Very High fire hazard zones.`,
          tone: "clear",
        };
  }
  return overFloor
    ? {
        title: "Height: above the 16 ft state minimum",
        detail: `${height} Every California city must allow 16 ft for a detached ADU; above that the local limit decides. State law allows up to 18 ft near major transit, plus 2 ft to match the main roof's pitch.`,
        tone: "review",
      }
    : {
        title: "Height: within the state minimum",
        detail: `${height} Every California city must allow at least 16 ft for a detached ADU.`,
        tone: "clear",
      };
}

/**
 * Builds the audit for the scenario.
 *
 * @param input.parcel - The active parcel (jurisdiction and main-house size).
 * @param input.aduSqft - Modeled ADU footprint in sq ft.
 * @param input.totalHeightFt - Modeled overall height including the roof; omit when unknown.
 */
export function buildPermitFeeAudit(input: {
  parcel: Parcel;
  aduSqft: number;
  totalHeightFt?: number | null;
}): PermitFeeAudit {
  const { parcel, aduSqft, totalHeightFt } = input;
  const jurisdiction = feeJurisdiction(parcel);
  const threshold = assessImpactFeeThreshold(aduSqft);
  const size = `${threshold.sqft.toLocaleString()} sq ft`;
  const knownHeight = typeof totalHeightFt === "number" && Number.isFinite(totalHeightFt) && totalHeightFt > 0
    ? totalHeightFt
    : null;

  if (jurisdiction === "other") {
    return {
      jurisdiction,
      threshold,
      title: permitAuditTitle(jurisdiction),
      feeLines: [
        {
          title: "Impact fees: ask the city",
          detail: "California's 750 sq ft impact-fee exemption applies only in California. Ask the local permit office for an itemized estimate of impact, school and utility connection fees before you settle the size.",
          tone: "info",
        },
        {
          title: "Utility connections",
          detail: "Ask each utility whether the backyard home needs its own meter or connection, and what that costs.",
          tone: "info",
        },
      ],
      submittalChecklist: [
        "Site plan: lot lines, setbacks, existing buildings, the backyard home and utility routes",
        "Floor plan, elevations, sections and roof plan",
        "Structural drawings and calculations",
        "Energy code compliance documents",
        "Utility plan: sewer, water service and electrical load calculation",
        "Grading and drainage plan, if the site needs one",
        "Any fee receipts the city needs before it issues the permit",
      ],
      zoningChecklist: [
        "Confirm the zone allows a backyard home on this lot",
        "Confirm the side and rear setbacks for an accessory unit",
        "Check coastal, historic, hillside and flood overlays",
        "Check fire hazard zone mapping: it can change setbacks, materials and access",
        "Check easements and utility lines the backyard home can't sit on",
        "Confirm parking and owner-occupancy rules",
        "Check HOA rules and recorded deed restrictions",
      ],
      sources: [],
    };
  }

  const sanDiego = jurisdiction === "san-diego";
  const county = jurisdiction === "san-diego-county";
  const feeLines: AuditLine[] = [impactFeeLine(threshold, parcel)];
  if (sanDiego) {
    feeLines.push({
      title: "City of San Diego: first two ADUs exempt from DIF",
      detail: "If this lot is inside City of San Diego limits, the City's DIF FAQ exempts the first two ADUs on a lot from Development Impact Fees regardless of size, and any ADU under 750 sq ft of gross floor area. A San Diego mailing address can be county land, so confirm the permitting jurisdiction first.",
      tone: "clear",
    });
  }
  if (county) feeLines.push(...sanDiegoCountyLines(parcel));
  feeLines.push(
    aduSqft < SCHOOL_FEE_EXEMPT_BELOW_SQFT
      ? {
          title: "School district fees: exempt",
          detail: "State law exempts ADUs under 500 sq ft from school district fees.",
          tone: "clear",
        }
      : {
          title: "School district fees: expect them",
          detail: `At ${size}, expect the school district's per-square-foot fee. ${county ? "The County" : "The city"} needs the district's receipt before it issues the building permit.`,
          tone: "review",
        },
    {
      title: "Utility connections",
      detail: "A new detached ADU can be charged a water or sewer connection fee or capacity charge, proportional to its burden (its size or plumbing fixtures). Converting space inside the main house needs no new connection or capacity charge. Ask each provider whether it requires a separate meter.",
      tone: "info",
    },
    {
      title: "Fire sprinklers",
      detail: "California can't require fire sprinklers in an ADU when the main house doesn't need them. Confirm the main house's status with the fire department.",
      tone: "info",
    },
  );
  if (knownHeight !== null) feeLines.push(heightLine(jurisdiction, knownHeight, parcel));

  return {
    jurisdiction,
    threshold,
    title: permitAuditTitle(jurisdiction),
    feeLines,
    submittalChecklist: [
      ...(sanDiego ? ["The City's ADU submittal requirements in Information Bulletin 400"] : []),
      ...(county ? ["The County's minimum submittal list for single-family dwellings and accessory structures (PDS 658)"] : []),
      "Site plan: lot lines, setbacks, existing buildings, the backyard home and utility routes",
      "Floor plan, elevations, sections and roof plan",
      "Structural drawings and calculations",
      "Title 24 energy compliance forms, including solar PV for a new detached unit",
      "Utility plan: sewer lateral, water service and electrical load calculation",
      ...(county ? ["Septic layout approval from the Department of Environmental Health and Quality, if the house is on septic"] : []),
      "Grading and drainage plan, if the site needs one",
      "Fire access and distance to the nearest hydrant, if the fire department asks",
      "School district fee receipt, when the unit is 500 sq ft or more",
    ],
    zoningChecklist: [
      ...(county ? ["Confirm the lot is outside city limits on the County's map of unincorporated areas"] : []),
      "Confirm the zone allows a backyard home on this lot (single-family or multifamily)",
      sanDiego
        ? "Side and rear setbacks: 0 ft up to 16 ft tall; 4 ft above that or in High and Very High fire hazard zones"
        : county
          ? "Side and rear setbacks: 4 ft for a new ADU, plus any setback your fire protection district requires"
          : "Side and rear setbacks: state law caps them at 4 ft for a new detached ADU",
      "Coastal zone mapping: a coastal development permit may be needed",
      fireZoneChecklistLine(parcel),
      ...(county ? ["Fire protection district: fire setbacks, sprinklers and hydrant requirements"] : []),
      "Historic district or landmark status",
      "Easements and utility lines the backyard home can't sit on",
      "Parking: none can be required within a half-mile walk of public transit",
      "HOA rules: an HOA can't ban an ADU, but it can set reasonable standards",
    ],
    sources: [
      STATE_BASELINE_SOURCES[0],
      ...(sanDiego ? [CITY_DIF_FAQ, CITY_IB_400, SAN_DIEGO_GUIDE] : []),
      ...(county ? [COUNTY_ADU_PAGE, COUNTY_GREEN_BUILDING, SAN_DIEGO_COUNTY_GUIDE] : []),
    ],
  };
}

/**
 * The lines only unincorporated San Diego County gets: who issues the permit,
 * the ended fee waiver, the Green Building Incentive Program and septic.
 * Facts as summarized in `content/adu/ca/san-diego-county.ts`.
 */
function sanDiegoCountyLines(parcel: Parcel): AuditLine[] {
  const community = parcelPermitAuthority(parcel)?.community;
  return [
    {
      title: "Permit: unincorporated San Diego County",
      detail: `This lot appears to be outside city limits${community ? `, in ${community}` : ""}, so County Planning & Development Services issues the permit and County rules apply. A city name in the mailing address doesn't change that. Confirm on the County's map of unincorporated areas before you rely on County rules.`,
      tone: "review",
    },
    {
      title: "County fees: the ADU fee waiver has ended",
      detail: "The County's trial ADU fee waiver ran from January 9, 2019 to January 9, 2024, so expect County plan check and building permit fees. Plan check starts once its invoice is paid, and the County's fee estimator gives a figure for your design.",
      tone: "info",
    },
    {
      title: "Green Building Incentive Program: up to 15% off County permit fees",
      detail: "Meeting CALGreen Tier 1 energy performance cuts the County's plan check and building permit fees by 7.5%, and Tier 2 by 15%, with faster plan check. A permitted graywater system, straw bale exterior walls or qualifying recycled-content materials each earn 7.5%. The discounts don't stack and don't reduce impact, school or utility fees, so ask County staff at the permit counter when you submit.",
      tone: "info",
    },
    {
      title: "Septic: check capacity before plans",
      detail: "If the house is on septic, an onsite wastewater professional prepares a layout application for the Department of Environmental Health and Quality, which decides whether the system can take the ADU or needs an added tank or a new system.",
      tone: "info",
    },
  ];
}
