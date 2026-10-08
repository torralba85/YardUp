/**
 * Typed content model for programmatic ADU jurisdiction pages (`/adu/ca/...`).
 *
 * Ordinance data lives in the repo as typed modules (not Firestore) so the
 * pages are fully server-rendered HTML with a git audit trail behind every
 * as-of date. See `content/adu/ca/` for the batch-one jurisdictions and
 * `content/adu/state-baseline.ts` for the shared state-law block.
 *
 * @module adu/types
 */

/** A labeled link to an authoritative source backing a content claim. */
export interface AduSource {
  /** Display text for the link. */
  label: string;
  /** Destination URL, preferably a city or state primary source. */
  url: string;
}

/**
 * Verification grade for a published jurisdiction fact.
 *
 * - `primary` — sourced to the ordinance or an official city publication.
 *   Renders as a statement of rule.
 * - `secondary` — third-party or estimated. Renders with a visible
 *   "estimate" label.
 * - `unverified` — renders NOTHING. The page silently omits it, so a fact
 *   nobody checked can never reach a visitor as if it were law.
 *
 * A wrong setback on a public page is a liability, not a typo: never promote
 * a fact to `primary` without a link to the ordinance, and never guess,
 * infer from a neighboring city, or fill a null with a plausible number.
 */
export type AduConfidence = "primary" | "secondary" | "unverified";

/** Where on a jurisdiction page a Studio CTA sits. */
export type AduCtaPlacement = "mid" | "end";

/**
 * Analytics event for a Studio CTA submission, separated by placement so
 * mid-page and end-of-page conversion can be told apart. Lives here (not
 * in content.ts) so the client CTA island doesn't bundle all city content.
 */
export function aduCtaEvent(placement: AduCtaPlacement): string {
  return `adu_cta_${placement}`;
}

/** One row of the scannable at-a-glance constraint table. */
export interface AduGlanceRow {
  /** Row label, e.g. "Max height — detached". */
  label: string;
  /** The constraint value for this jurisdiction. */
  value: string;
  /** Optional qualifier, e.g. a transit or overlay condition. */
  note?: string;
  /**
   * Verification grade. Omitted means ungraded legacy copy: rendered as-is
   * with no badge. `secondary` adds a visible "estimate" label;
   * `unverified` omits the row entirely.
   */
  confidence?: AduConfidence;
}

/** One searcher-worded FAQ entry, rendered with `FAQPage` markup. */
export interface AduFaq {
  /** The question in the searcher's own words. */
  question: string;
  /** Plain-text answer; the city name should appear where natural. */
  answer: string;
}

/** A headed block of prose, optionally followed by a bullet list. */
export interface AduContentSection {
  /** Section heading. */
  heading: string;
  /** Body paragraphs. */
  paragraphs: string[];
  /** Optional follow-on bullets (fee categories, checklist items). */
  bullets?: string[];
}

/** One numbered permit-process step. */
export interface AduProcessStep {
  /** Short step title. */
  title: string;
  /** What to do, where, and what it produces. */
  detail: string;
}

/**
 * Full content contract for one jurisdiction page.
 *
 * Anti-thin-content gates (enforced in `content/adu/uniqueness.test.ts`):
 * - `introAnswer` is unique per city — no shared lead paragraph.
 * - `cityDiffers` carries at least 400 substantive words.
 * - At least 60% of rendered words are city-specific (the shared state-law
 *   block is genuinely shared law, so it is the only shared copy allowed).
 * - `glance` must differ from every other city's table.
 * - Fee figures appear only with a sourced as-of date, or not at all.
 */
export interface JurisdictionContent {
  /** URL state segment, e.g. "ca". */
  state: string;
  /** Display state name, e.g. "California". */
  stateName: string;
  /** Display city name, e.g. "Chula Vista". */
  city: string;
  /** URL city segment, e.g. "chula-vista". */
  slug: string;
  /** County display name, e.g. "San Diego County". */
  county: string;
  /** ISO date (`YYYY-MM-DD`) the city's figures were last verified. */
  asOf: string;
  /** 2–3 sentence direct answer to the permission question. Unique per city. */
  introAnswer: string[];
  /** Optional override for page <title> and OpenGraph title. */
  metaTitle?: string;
  /** Optional override for <meta name="description"> and OpenGraph description. */
  metaDescription?: string;
  /** Optional override for H1 heading text. */
  h1?: string;
  /** Short size claim for the meta description, e.g. "up to 1,200 sq ft detached". */
  metaSizeNote: string;
  /** Short setback claim for the meta description, e.g. "4 ft side and rear". */
  metaSetbackNote: string;
  /** Short parking claim for the meta description. */
  metaParkingNote: string;
  /** At-a-glance constraint table. Must differ between cities. */
  glance: AduGlanceRow[];
  /** The heart of the page: where this city differs. >= 400 words total. */
  cityDiffers: AduContentSection[];
  /** Cost and fees. Figures only with a sourced as-of date, else omitted. */
  fees: AduContentSection;
  /** Lead-in for the numbered permit process. */
  processIntro: string;
  /** Numbered permit steps: department, submission, realistic timeline. */
  processSteps: AduProcessStep[];
  /** The city's official ADU page or permit portal entry point. */
  permitPortal: AduSource;
  /**
   * Prominent overlay warning, e.g. the Coastal Zone amendment carve-out.
   * Rendered as a callout directly after the at-a-glance table. Omit when
   * the jurisdiction has no equivalent load-bearing caveat.
   */
  coastalCallout?: string;
  /**
   * Data for the setback diagram: the short-ADU rule versus the tall-ADU
   * rule, e.g. "Up to 16 ft: 0 ft side/rear" vs "Over 16 ft: 4 ft".
   * Omit when the jurisdiction's setback structure has no such split — the
   * diagram renders nothing without it.
   */
  setbackDiagram?: {
    /** Label for the low/short side, e.g. "Up to 16 ft tall". */
    shortLabel: string;
    /** Rule text for the short side, e.g. "0 ft — build to the line". */
    shortRule: string;
    /** Label for the tall side, e.g. "Over 16 ft tall". */
    tallLabel: string;
    /** Rule text for the tall side, e.g. "4 ft side and rear". */
    tallRule: string;
  };
  /** 6–9 searcher-worded questions, including terminology aliases. */
  faqs: AduFaq[];
  /** Neighboring jurisdiction slugs (bidirectional, geographic, 1–6). */
  neighbors: string[];
  /** Municipal code and program sources cited on the page. */
  sources: AduSource[];
}

/**
 * Content contract for a jurisdiction cost page (`/adu/{state}/{city}/cost`).
 *
 * The page answers cost searches ("how much does an ADU cost in San Diego")
 * that the rules guide at `/adu/{state}/{city}` should not compete for. No
 * build-cost, rent, or payback figure is typed here: the page computes every
 * one at build time from `cityMarketAggregate`, so a cost page can only exist
 * for a city with a market anchor, and its numbers can never drift from the
 * calculator's.
 */
export interface JurisdictionCostContent {
  /** URL state segment; must match a {@link JurisdictionContent}. */
  state: string;
  /** URL city segment; must match a {@link JurisdictionContent} and a market anchor. */
  slug: string;
  /** ISO date (`YYYY-MM-DD`) the fee and scope copy was last checked. */
  asOf: string;
  /** Page <title> and OpenGraph title, 60 characters or fewer. */
  metaTitle: string;
  /** Meta description, 70–160 characters. */
  metaDescription: string;
  /** H1 heading text. */
  h1: string;
  /** Lead paragraphs after the computed headline estimate. */
  introAnswer: string[];
  /** Rules-guide slugs in the same county whose fees differ but whose rent anchor is shared. */
  coveredCities: string[];
  /** Permit and impact fees. Figures only with a source, labeled when reported rather than official. */
  fees: AduContentSection;
  /** What the model leaves out for conversions and junior ADUs. No invented figures. */
  conversions: AduContentSection;
  /** What to ask a builder for, so quotes compare like for like. */
  quoteChecklist: AduContentSection;
  /** Plain-text FAQs. Questions that need a computed figure are built by the page. */
  faqs: AduFaq[];
  /** Sources cited on the page. */
  sources: AduSource[];
}
