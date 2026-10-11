/**
 * Source side of the guide claim check: turns Regulatory Vault documents
 * (plain text from `pdftotext`, pages split by form feeds) into overlapping
 * passages, and ranks those passages against a guide claim with BM25 so Jev
 * only reads the few that could bear on it. Pure functions, no network.
 *
 * @see docs/jev-guide-claim-check.md
 */

/** One Regulatory Vault document as plain text. */
export interface SourceDocument {
  /** File basename without extension, as staged in the Regulatory Vault. */
  id: string;
  /** Short human label shown to Jev and in the report. */
  label: string;
  text: string;
}

/** A window of consecutive source lines, small enough to send whole. */
export interface SourcePassage {
  sourceId: string;
  label: string;
  /** 1-based page of the passage's first line. */
  page: number;
  text: string;
  /** First and last line index in the document's cleaned line list. */
  lines: [number, number];
}

/** Vault documents the checker knows, keyed by file basename. */
export const VAULT_DOCUMENTS: Record<string, string> = {
  "CA_HCD_ADU_Handbook_March-2026_with_2026_Addendum": "HCD ADU Handbook (March 2026)",
  "SDMC_Ch14_Art1_Div3_141.0302_ADU_JADU_9-2026": "San Diego Municipal Code § 141.0302 (9-2026)",
  "SD_DSD_IB-400_ADU_JADU_Jan-2026_web-capture_2026-10-09": "San Diego IB-400 (January 2026)",
  "SD_DSD_IB-501_Fee_Schedule_Aug-2026_web-capture_2026-10-09": "San Diego IB-501 fee schedule (August 2026)",
};

const HCD = "CA_HCD_ADU_Handbook_March-2026_with_2026_Addendum";
const SDMC = "SDMC_Ch14_Art1_Div3_141.0302_ADU_JADU_9-2026";
const IB400 = "SD_DSD_IB-400_ADU_JADU_Jan-2026_web-capture_2026-10-09";
const IB501 = "SD_DSD_IB-501_Fee_Schedule_Aug-2026_web-capture_2026-10-09";

/**
 * Which documents each guide is checked against. Guides without their own
 * city sources (Carlsbad, Chula Vista, Escondido, Oceanside: the vault's
 * county folder is still empty) fall back to the state handbook, so their
 * local rules come back as "no source" rather than as errors.
 */
const GUIDE_SOURCES: Record<string, string[]> = {
  ca: [HCD],
  "san-diego": [SDMC, IB400, IB501, HCD],
  "san-diego/cost": [IB501, HCD],
};

export function sourcesForGuide(guide: string): string[] {
  return GUIDE_SOURCES[guide] ?? GUIDE_SOURCES.ca;
}

/** Whether a guide has any city-level source, not just the state handbook. */
export function hasLocalSources(guide: string): boolean {
  return guide in GUIDE_SOURCES && guide !== "ca";
}

/** About one or two code clauses; longer windows let neighbors drown a match. */
const DEFAULT_MAX_CHARS = 900;

/** Digits masked, so "Ch. Art. Div. 14 1 3 5" and "... 14 1 3 6" count as one footer. */
function furnitureKey(line: string): string {
  return line.replace(/\d+/g, "#");
}

/**
 * Drops running headers and footers: a line that repeats (page numbers
 * aside) on at least three pages and on a fifth of them is page furniture,
 * not code text.
 */
function contentLines(text: string): { line: string; page: number }[] {
  const pages = text.split("\f");
  const pageCount = new Map<string, number>();
  const perPage = pages.map((page) => {
    const lines = page
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line !== "");
    new Set(lines.map(furnitureKey)).forEach((key) =>
      pageCount.set(key, (pageCount.get(key) ?? 0) + 1),
    );
    return lines;
  });
  // Headers and footers are short; a long repeated line is real text.
  const furniture = (line: string) => {
    const count = pageCount.get(furnitureKey(line)) ?? 0;
    return (
      (line.length <= 80 && count >= 3 && count >= pages.length / 5) ||
      /^(page )?\d+( of \d+)?$/i.test(line)
    );
  };
  return perPage.flatMap((lines, index) =>
    lines.filter((line) => !furniture(line)).map((line) => ({ line, page: index + 1 })),
  );
}

/**
 * Splits a document into windows of whole lines up to `maxChars`, each new
 * window starting about halfway through the previous one so a clause that
 * straddles a boundary (or a page break) appears whole in at least one.
 */
export function buildPassages(
  doc: SourceDocument,
  maxChars: number = DEFAULT_MAX_CHARS,
): SourcePassage[] {
  const lines = contentLines(doc.text);
  const passages: SourcePassage[] = [];
  let start = 0;
  while (start < lines.length) {
    let end = start;
    let length = lines[start].line.length;
    while (end + 1 < lines.length && length + 1 + lines[end + 1].line.length <= maxChars) {
      end += 1;
      length += 1 + lines[end].line.length;
    }
    passages.push({
      sourceId: doc.id,
      label: doc.label,
      page: lines[start].page,
      text: lines
        .slice(start, end + 1)
        .map((entry) => entry.line)
        .join("\n"),
      lines: [start, end],
    });
    if (end + 1 >= lines.length) break;
    // Advance to the first line past the window's midpoint (always at least one).
    let next = start + 1;
    let consumed = lines[start].line.length;
    while (next < end && consumed < length / 2) {
      consumed += 1 + lines[next].line.length;
      next += 1;
    }
    start = next;
  }
  return passages;
}

const STOPWORDS = new Set(
  (
    "a an and are as at be by can for from has have if in into is it its may must no not of on or " +
    "that the their then there these this to under up was were when where which will with within you your"
  ).split(" "),
);

/**
 * Lowercased word and number tokens. Units are normalized so a guide's
 * "16 ft" meets the code's "16 feet" and "1,200 sq ft" meets "1200 square
 * feet". Single letters, mostly clause markers like "(C)", are dropped.
 */
export function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/(\d),(\d{3})/g, "$1$2")
    .replace(/\bsq\.?\s*ft\.?|\bsquare[- ]f(?:ee|oo)t\b/g, " sqft ")
    .replace(/\b(?:ft|foot)\b\.?/g, " feet ")
    .replace(/[’']/g, "");
  return (normalized.match(/[a-z]+|\d+(?:\.\d+)?/g) ?? []).filter(
    (token) => !STOPWORDS.has(token) && (token.length > 1 || /\d/.test(token)),
  );
}

interface IndexedPassage {
  passage: SourcePassage;
  terms: Map<string, number>;
  length: number;
}

/** A BM25 index over one guide's passages, built once and queried per claim. */
export class PassageIndex {
  private readonly items: IndexedPassage[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number;

  constructor(passages: SourcePassage[]) {
    this.items = passages.map((passage) => {
      const terms = new Map<string, number>();
      const tokens = tokenize(passage.text);
      for (const token of tokens) terms.set(token, (terms.get(token) ?? 0) + 1);
      terms.forEach((_, token) =>
        this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1),
      );
      return { passage, terms, length: tokens.length };
    });
    this.averageLength =
      this.items.reduce((sum, item) => sum + item.length, 0) / Math.max(this.items.length, 1);
  }

  /**
   * The `k` highest-scoring passages for `query`, skipping any that share most
   * of their lines with a better-ranked passage from the same document (the
   * overlapping windows otherwise crowd out other sources).
   */
  search(query: string, k: number): SourcePassage[] {
    const k1 = 1.2;
    const b = 0.75;
    const n = this.items.length;
    const queryTerms = Array.from(new Set(tokenize(query)));
    const scored = this.items
      .map((item) => {
        let score = 0;
        for (const term of queryTerms) {
          const tf = item.terms.get(term);
          if (!tf) continue;
          const df = this.documentFrequency.get(term) ?? 0;
          const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
          score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * item.length) / this.averageLength));
        }
        return { passage: item.passage, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);

    const picked: SourcePassage[] = [];
    for (const { passage } of scored) {
      if (picked.length === k) break;
      const overlapsPicked = picked.some(
        (other) =>
          other.sourceId === passage.sourceId &&
          overlapShare(other.lines, passage.lines) > 0.5,
      );
      if (!overlapsPicked) picked.push(passage);
    }
    return picked;
  }
}

function overlapShare(a: [number, number], b: [number, number]): number {
  const shared = Math.min(a[1], b[1]) - Math.max(a[0], b[0]) + 1;
  if (shared <= 0) return 0;
  return shared / Math.min(a[1] - a[0] + 1, b[1] - b[0] + 1);
}
