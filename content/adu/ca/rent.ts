import { RENT_SCENARIO_SPREADS } from "@/lib/market/rent-spreads";
import type { BedroomClass } from "@/lib/market/market-types";

/**
 * HUD Fair Market Rents for the 12 California counties LotFoundry resolves
 * parcels in, read from HUD's FY2027 FMR Documentation System on
 * {@link CA_RENT_VERIFIED} (each county's "Final FY 2027 & Final FY 2026
 * FMRs By Unit Bedrooms" table). FY2027 FMRs took effect 2026-10-01.
 *
 * HUD sets FMRs for metro FMR areas, not counties, so counties that share an
 * area (Riverside and San Bernardino; Alameda and Contra Costa) share a row's
 * figures. Re-verify every value against HUD before changing one.
 *
 * @module content/adu/ca/rent
 */

/** ISO date every figure below was read from HUD's FY2027 documentation pages. */
export const CA_RENT_VERIFIED = "2026-10-28";

/** HUD fiscal year of the current figures and the date they took effect. */
export const HUD_FMR_YEAR = "FY2027";
export const HUD_FMR_EFFECTIVE = "2026-10-01";

/** HUD's FY2027 FMR Documentation System (county lookup). */
export const HUD_FMR_FY2027_URL = "https://www.huduser.gov/datasets/fmr/fmr2027";
/** HUD's FMR dataset overview, which defines an FMR (24 CFR 888.113). */
export const HUD_FMR_OVERVIEW_URL = "https://www.huduser.gov/portal/datasets/fmr.html";

/** One county's HUD Fair Market Rents, in dollars per month. */
export interface CountyRent {
  /** County slug, e.g. "san-diego". */
  slug: string;
  /** Display name without "County", e.g. "San Diego". */
  county: string;
  /** HUD metro FMR area the county belongs to, as HUD names it. */
  fmrArea: string;
  /** Final FY2027 FMR by bedroom class. */
  fy2027: Record<BedroomClass, number>;
  /** Final FY2026 FMR by bedroom class, for the year-over-year change. */
  fy2026: Record<BedroomClass, number>;
  /** Site-relative path to a LotFoundry county cost guide, when one exists. */
  guidePath?: string;
}

/** The 12 counties, alphabetical. */
export const CA_COUNTY_RENTS: CountyRent[] = [
  {
    slug: "alameda",
    county: "Alameda",
    fmrArea: "Oakland-Fremont, CA HUD Metro FMR Area",
    fy2027: { studio: 2088, "1br": 2290, "2br": 2805 },
    fy2026: { studio: 2142, "1br": 2385, "2br": 2912 },
  },
  {
    slug: "contra-costa",
    county: "Contra Costa",
    fmrArea: "Oakland-Fremont, CA HUD Metro FMR Area",
    fy2027: { studio: 2088, "1br": 2290, "2br": 2805 },
    fy2026: { studio: 2142, "1br": 2385, "2br": 2912 },
  },
  {
    slug: "los-angeles",
    county: "Los Angeles",
    fmrArea: "Los Angeles-Long Beach-Glendale, CA HUD Metro FMR Area",
    fy2027: { studio: 2151, "1br": 2402, "2br": 2964 },
    fy2026: { studio: 2079, "1br": 2328, "2br": 2903 },
  },
  {
    slug: "orange",
    county: "Orange",
    fmrArea: "Santa Ana-Anaheim-Irvine, CA HUD Metro FMR Area",
    fy2027: { studio: 2580, "1br": 2610, "2br": 3057 },
    fy2026: { studio: 2682, "1br": 2746, "2br": 3236 },
  },
  {
    slug: "riverside",
    county: "Riverside",
    fmrArea: "Riverside-San Bernardino-Ontario, CA MSA",
    fy2027: { studio: 1605, "1br": 1705, "2br": 2103 },
    fy2026: { studio: 1692, "1br": 1777, "2br": 2201 },
  },
  {
    slug: "sacramento",
    county: "Sacramento",
    fmrArea: "Sacramento--Roseville--Arden-Arcade, CA HUD Metro FMR Area",
    fy2027: { studio: 1742, "1br": 1793, "2br": 2201 },
    fy2026: { studio: 1748, "1br": 1832, "2br": 2255 },
  },
  {
    slug: "san-bernardino",
    county: "San Bernardino",
    fmrArea: "Riverside-San Bernardino-Ontario, CA MSA",
    fy2027: { studio: 1605, "1br": 1705, "2br": 2103 },
    fy2026: { studio: 1692, "1br": 1777, "2br": 2201 },
  },
  {
    slug: "san-diego",
    county: "San Diego",
    fmrArea: "San Diego-Chula Vista-Carlsbad, CA MSA",
    fy2027: { studio: 2192, "1br": 2335, "2br": 2823 },
    fy2026: { studio: 2288, "1br": 2459, "2br": 3001 },
    guidePath: "/adu/ca/san-diego/cost",
  },
  {
    slug: "san-mateo",
    county: "San Mateo",
    fmrArea: "San Francisco, CA HUD Metro FMR Area",
    fy2027: { studio: 2574, "1br": 3003, "2br": 3697 },
    fy2026: { studio: 2485, "1br": 2977, "2br": 3604 },
  },
  {
    slug: "santa-barbara",
    county: "Santa Barbara",
    fmrArea: "Santa Maria-Santa Barbara, CA MSA",
    fy2027: { studio: 2479, "1br": 2711, "2br": 3106 },
    fy2026: { studio: 2459, "1br": 2746, "2br": 3124 },
  },
  {
    slug: "santa-clara",
    county: "Santa Clara",
    fmrArea: "San Jose-Sunnyvale-Santa Clara, CA HUD Metro FMR Area",
    fy2027: { studio: 2458, "1br": 2778, "2br": 3272 },
    fy2026: { studio: 2621, "1br": 2982, "2br": 3483 },
  },
  {
    slug: "ventura",
    county: "Ventura",
    fmrArea: "Oxnard-Thousand Oaks-Ventura, CA MSA",
    fy2027: { studio: 1827, "1br": 2035, "2br": 2424 },
    fy2026: { studio: 1998, "1br": 2250, "2br": 2693 },
  },
];

/** Percent change from FY2026 to FY2027, rounded to one decimal place. */
export function rentChangePercent(row: CountyRent, bedroom: BedroomClass): number {
  const before = row.fy2026[bedroom];
  return Math.round(((row.fy2027[bedroom] - before) / before) * 1000) / 10;
}

/**
 * Planning range for one HUD rent anchor, using the same conservative /
 * market / optimistic spreads the Studio applies to a parcel.
 */
export function planningRange(anchor: number): { conservative: number; market: number; optimistic: number } {
  return {
    conservative: Math.round(anchor * RENT_SCENARIO_SPREADS.conservative),
    market: Math.round(anchor * RENT_SCENARIO_SPREADS.market),
    optimistic: Math.round(anchor * RENT_SCENARIO_SPREADS.optimistic),
  };
}

/** CSV of the county table: HUD figures, change and planning range. */
export function rentCsv(): string {
  const header = [
    "county",
    "hud_fmr_area",
    `${HUD_FMR_YEAR.toLowerCase()}_studio`,
    `${HUD_FMR_YEAR.toLowerCase()}_1br`,
    `${HUD_FMR_YEAR.toLowerCase()}_2br`,
    "fy2026_studio",
    "fy2026_1br",
    "fy2026_2br",
    "change_1br_pct",
    "planning_1br_conservative",
    "planning_1br_market",
    "planning_1br_optimistic",
  ];
  const quote = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = CA_COUNTY_RENTS.map((row) => {
    const range = planningRange(row.fy2027["1br"]);
    return [
      `${row.county} County`,
      row.fmrArea,
      row.fy2027.studio,
      row.fy2027["1br"],
      row.fy2027["2br"],
      row.fy2026.studio,
      row.fy2026["1br"],
      row.fy2026["2br"],
      rentChangePercent(row, "1br"),
      range.conservative,
      range.market,
      range.optimistic,
    ]
      .map(quote)
      .join(",");
  });
  return `${[header.join(","), ...lines].join("\n")}\n`;
}

/**
 * One row per HUD FMR area (counties that share an area collapse to one),
 * so area-level statements ("fell in 8 of 10 areas") don't double-count.
 */
export function fmrAreas(): { fmrArea: string; counties: string[]; row: CountyRent }[] {
  const areas = new Map<string, { fmrArea: string; counties: string[]; row: CountyRent }>();
  for (const row of CA_COUNTY_RENTS) {
    const existing = areas.get(row.fmrArea);
    if (existing) existing.counties.push(row.county);
    else areas.set(row.fmrArea, { fmrArea: row.fmrArea, counties: [row.county], row });
  }
  return Array.from(areas.values());
}
