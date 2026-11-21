import { SAN_DIEGO_PERMIT_STUDY, type PermitArea } from "@/content/adu/ca/san-diego-permits";
import { permitStudyPath, permitStudyUrl } from "./content";
import { laterDate } from "./dates";

export const PERMIT_AREA_PUBLISHED = "2026-11-16";
/** Search titles, comparisons, OG siteName, breadcrumbs and similar-area links. */
export const PERMIT_AREA_UPDATED = "2026-11-21";
export const PERMIT_AREA_MIN_APPROVALS = 50;
export const PERMIT_AREAS = SAN_DIEGO_PERMIT_STUDY.byArea.filter(
  (area) => area.approvals >= PERMIT_AREA_MIN_APPROVALS,
);

const study = SAN_DIEGO_PERMIT_STUDY;
const number = (value: number) => value.toLocaleString("en-US");
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const FROM_YEAR = study.coverage.from.slice(0, 4);
const TO_YEAR = study.coverage.to.slice(0, 4);

export function permitAreaSlug(area: PermitArea): string {
  return area.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function permitAreaPath(area: PermitArea): string {
  return `${permitStudyPath()}/${permitAreaSlug(area)}`;
}

export function permitAreaUrl(area: PermitArea): string {
  return `${permitStudyUrl()}/${permitAreaSlug(area)}`;
}

export function findPermitArea(slug: string): PermitArea | undefined {
  return PERMIT_AREAS.find((area) => permitAreaSlug(area) === slug);
}

export function permitAreaLastModified(): string {
  return laterDate(laterDate(PERMIT_AREA_PUBLISHED, PERMIT_AREA_UPDATED), study.generatedAt);
}

/** 1-based rank by permitted units among every planning area in the study. */
export function permitAreaRank(area: PermitArea): number {
  return 1 + study.byArea.filter((other) => other.units > area.units).length;
}

/** "North Park, San Diego"; "Southeastern San Diego" already names the city. */
export function permitAreaPlace(area: PermitArea): string {
  return area.name.includes("San Diego") ? area.name : `${area.name}, San Diego`;
}

/** The most specific title within Google's ~60-character display: unit count, then city, then years. */
export function permitAreaTitle(area: PermitArea): string {
  const base = `${area.name} ADU Permits`;
  const count = `${base}: ${number(area.units)} Units Since ${FROM_YEAR}`;
  const years = `(${FROM_YEAR}-${TO_YEAR})`;
  const withCity = area.name.includes("San Diego") ? [] : [`${count} | San Diego`, `${base} | San Diego ${years}`];
  return [...withCity, count, `${base} ${years}`].find((title) => title.length <= 60) ?? base;
}

/** Meta description up to 160 characters; drops the rank clause for the longest names. */
export function permitAreaDescription(area: PermitArea): string {
  const lead = `${number(area.units)} ADUs and junior ADUs permitted in ${permitAreaPlace(area)}, ${FROM_YEAR}-${TO_YEAR}`;
  const rank = `, ranked ${permitAreaRank(area)} of ${study.byArea.length} planning areas`;
  const tail = ". See yearly totals, trends and bonus units.";
  return [`${lead}${rank}${tail}`, `${lead}${tail}`].find((text) => text.length <= 160) ?? `${lead}.`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function change(now: number, before: number): string {
  if (before === 0) return now === 0 ? "held steady" : `rose from zero`;
  const delta = now / before - 1;
  if (Math.abs(delta) < 0.01) return "held steady";
  return `${delta > 0 ? "rose" : "fell"} ${Math.round(Math.abs(delta) * 100)}%`;
}

/**
 * Four data-driven sentences that set one area against the city: the change
 * between the last two full years, the partial latest year's pace, size
 * against the median planning area, and the junior ADU share.
 */
export function permitAreaComparisons(area: PermitArea): string[] {
  const years = study.byYear.map((row) => String(row.year));
  const [before, last] = years.filter((year) => year !== TO_YEAR).slice(-2);
  const cityUnits = (year: string) => study.byYear.find((row) => String(row.year) === year)?.units ?? 0;
  const units = (year: string) => area.unitsByYear[year] ?? 0;

  const trend = `Permitted units in ${area.name} ${change(units(last), units(before))} from ${before} to ${last} (${number(units(before))} to ${number(units(last))}), while the citywide total ${change(cityUnits(last), cityUnits(before))}.`;

  const pace = units(TO_YEAR) / (units(last) || 1);
  const cityPace = Math.round((cityUnits(TO_YEAR) / cityUnits(last)) * 100);
  const paceText = units(TO_YEAR) > units(last)
    ? `already more than its ${last} total of ${number(units(last))}`
    : `${Math.round(pace * 100)}% of its ${last} total`;
  // "Oct 27" rather than the ISO date, which breaks mid-date on a phone.
  const through = new Date(`${study.coverage.to}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const partial = `So far in ${TO_YEAR} (through ${through}), permits have added ${number(units(TO_YEAR))} units, ${paceText}; citywide, ${TO_YEAR} stands at ${cityPace}% of ${last}.`;

  const typical = median(study.byArea.map((other) => other.units));
  const ratio = area.units / typical;
  const scale = ratio >= 1.15
    ? `Its ${number(area.units)} units are ${ratio.toFixed(1)} times the median planning area's ${number(typical)}.`
    : ratio <= 0.85
      ? `Its ${number(area.units)} units are below the median planning area's ${number(typical)}.`
      : `Its ${number(area.units)} units are close to the median planning area's ${number(typical)}.`;

  const share = area.jaduUnits / area.units;
  const cityShare = study.totals.jaduUnits / study.totals.units;
  const mix = area.jaduUnits === 0
    ? `No junior ADUs were permitted here, against ${percent(cityShare)} of units citywide.`
    : `Junior ADUs make up ${percent(share)} of its units, ${Math.abs(share - cityShare) < 0.01 ? "in line with" : share > cityShare ? "above" : "below"} the citywide ${percent(cityShare)}.`;

  return [trend, partial, scale, mix];
}

/** The published areas nearest in total units, two above and two below where they exist. */
export function similarPermitAreas(area: PermitArea, count = 4): PermitArea[] {
  const index = PERMIT_AREAS.findIndex((other) => other.name === area.name);
  if (index < 0) return [];
  const start = Math.min(Math.max(index - count / 2, 0), PERMIT_AREAS.length - count - 1);
  return PERMIT_AREAS.slice(start, start + count + 1).filter((other) => other.name !== area.name);
}
