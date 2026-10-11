/**
 * Guide claim check: an internal review tool that asks Jev whether each
 * sentence in the SEO city guides is backed by the code text staged in the
 * Regulatory Vault. Code extracts claims and retrieves candidate passages
 * (`guide-claim-sources.ts`); Jev judges each claim against each passage; an
 * explicit policy here turns those judgments into a verdict for a person to
 * review. Nothing here runs in a request path or changes a page.
 *
 * Only public text is sent to TypeSafe: published guide copy and government
 * documents.
 *
 * @see docs/jev-guide-claim-check.md
 * @see https://docs.typesafe.ai/cookbooks/citation_check
 */

import type {
  AduContentSection,
  JurisdictionContent,
  JurisdictionCostContent,
} from "@/lib/adu/types";
import type { SourcePassage } from "@/lib/server/guide-claim-sources";
import {
  askTypeSafe,
  TypeSafeProviderError,
  type TypeSafeAnswer,
  type TypeSafeQuestion,
  type TypeSafeResponse,
} from "@/lib/server/typesafe";

/** One checkable unit of guide copy. */
export interface GuideClaim {
  /** Guide key: a city slug, `<slug>/cost`, or `ca` for the state hub. */
  guide: string;
  /** Where the sentence sits in the content module, e.g. `glance[4].note`. */
  location: string;
  /** Heading or row label the sentence sits under. */
  section: string;
  /** The preceding sentence, sent only to resolve words like "same" or "this". */
  context?: string;
  text: string;
}

const ABBREVIATION_END = /\b(?:e\.g|i\.e|etc|vs|approx|min|max|No|St|Ch|Art|Div|Sec)\.$/;

/** Splits copy into sentences, keeping "e.g.", "min." and "Ch." mid-sentence. */
export function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9§$])/);
  const sentences: string[] = [];
  for (const part of parts) {
    const last = sentences.length - 1;
    if (last >= 0 && ABBREVIATION_END.test(sentences[last])) {
      sentences[last] = `${sentences[last]} ${part}`;
    } else {
      sentences.push(part);
    }
  }
  return sentences.map((sentence) => sentence.trim()).filter((sentence) => sentence !== "");
}

class ClaimCollector {
  readonly claims: GuideClaim[] = [];
  private readonly seen = new Set<string>();

  constructor(private readonly guide: string) {}

  /** Adds each sentence of `text`, with the previous sentence as context. */
  add(location: string, section: string, text: string | undefined, context?: string) {
    if (!text) return;
    let previous = context;
    splitSentences(text).forEach((sentence, index, all) => {
      const key = sentence.toLowerCase();
      if (!this.seen.has(key)) {
        this.seen.add(key);
        this.claims.push({
          guide: this.guide,
          location: all.length > 1 ? `${location}#${index + 1}` : location,
          section,
          ...(previous ? { context: previous } : {}),
          text: sentence,
        });
      }
      previous = sentence;
    });
  }

  section(location: string, content: AduContentSection) {
    let previous: string | undefined;
    content.paragraphs.forEach((paragraph, index) => {
      this.add(`${location}.paragraphs[${index}]`, content.heading, paragraph, previous);
      previous = splitSentences(paragraph).at(-1);
    });
    content.bullets?.forEach((bullet, index) =>
      this.add(`${location}.bullets[${index}]`, content.heading, bullet),
    );
  }
}

/** Every sentence of a city rules guide, in page order, deduplicated. */
export function claimsFromGuide(content: JurisdictionContent): GuideClaim[] {
  const collect = new ClaimCollector(content.slug);
  collect.add("metaDescription", "Meta description", content.metaDescription);
  content.introAnswer.forEach((text, index) =>
    collect.add(`introAnswer[${index}]`, "Intro", text),
  );
  content.glance.forEach((row, index) => {
    const rule = `${row.label}: ${row.value}`;
    collect.add(`glance[${index}]`, row.label, rule);
    collect.add(`glance[${index}].note`, row.label, row.note, rule);
  });
  collect.add("coastalCallout", "Coastal Zone callout", content.coastalCallout);
  if (content.setbackDiagram) {
    const diagram = content.setbackDiagram;
    collect.add("setbackDiagram.short", "Setback diagram", `${diagram.shortLabel}: ${diagram.shortRule}`);
    collect.add("setbackDiagram.tall", "Setback diagram", `${diagram.tallLabel}: ${diagram.tallRule}`);
  }
  content.cityDiffers.forEach((section, index) => collect.section(`cityDiffers[${index}]`, section));
  collect.section("fees", content.fees);
  collect.add("processIntro", "Permit process", content.processIntro);
  content.processSteps.forEach((step, index) =>
    collect.add(`processSteps[${index}]`, step.title, step.detail),
  );
  content.faqs.forEach((faq, index) => collect.add(`faqs[${index}]`, faq.question, faq.answer));
  return collect.claims;
}

/** Every typed sentence of a city cost page (computed figures are not typed). */
export function claimsFromCostPage(content: JurisdictionCostContent): GuideClaim[] {
  const collect = new ClaimCollector(`${content.slug}/cost`);
  collect.add("metaDescription", "Meta description", content.metaDescription);
  content.introAnswer.forEach((text, index) =>
    collect.add(`introAnswer[${index}]`, "Intro", text),
  );
  collect.section("fees", content.fees);
  collect.section("conversions", content.conversions);
  collect.section("quoteChecklist", content.quoteChecklist);
  content.faqs.forEach((faq, index) => collect.add(`faqs[${index}]`, faq.question, faq.answer));
  return collect.claims;
}

/** The California hub's shared state-law copy. */
export function claimsFromStateBaseline(paragraphs: string[], facts: string[]): GuideClaim[] {
  const collect = new ClaimCollector("ca");
  paragraphs.forEach((text, index) => collect.add(`paragraphs[${index}]`, "State baseline", text));
  facts.forEach((text, index) => collect.add(`facts[${index}]`, "State floor facts", text));
  return collect.claims;
}

/** Passages Jev reads per claim; each adds two questions to the request. */
export const PASSAGES_PER_CLAIM = 4;

/** Generous: this is a batch tool, not a request path. */
export const CLAIM_CHECK_TIMEOUT_MS = 10_000;

export type Relation = "supports" | "contradicts" | "says_nothing";
const RELATIONS: Relation[] = ["supports", "contradicts", "says_nothing"];

const CHECKABLE: TypeSafeQuestion = {
  type: "noul",
  instructions:
    "Does `claim` state a specific rule, limit, number, fee, exemption, timeline or legal " +
    "requirement for building an ADU that the text of a code section or official bulletin " +
    "could confirm or contradict?",
  criteria: {
    true:
      "A concrete regulatory statement, such as a size limit, setback, height threshold, " +
      "parking rule, fee or fee exemption, approval pathway or review deadline.",
    false:
      "An invitation to use a product, advice, an opinion, a historical statistic, or a " +
      "general statement that no code text could settle.",
  },
};

function relationQuestion(index: number): TypeSafeQuestion {
  const passage = `passages[${index}]`;
  return {
    type: "choice",
    instructions:
      `How does the source text in \`${passage}.text\` (from \`${passage}.source\`) relate to ` +
      "`claim` for `jurisdiction`? Judge `claim` only. `section` and `context` show where it " +
      "sits on the page and only help resolve words like \"this\" or \"same\".",
    criteria: {
      supports: "The source text states the claim or directly implies that it is true.",
      contradicts:
        "The source text states something incompatible with the claim for the same " +
        "situation: a different number, threshold, zone, condition or outcome.",
      says_nothing: "The source text does not address the situation the claim describes.",
    },
  };
}

function omitsQuestion(index: number): TypeSafeQuestion {
  const passage = `passages[${index}]`;
  return {
    type: "noul",
    instructions:
      `Does the source text in \`${passage}.text\` attach a condition, exception, limit or ` +
      "scope to the rule in `claim` that `claim` leaves out, so that a homeowner relying on " +
      "`claim` alone could plan something the source does not allow?",
    criteria: {
      true:
        "The source adds a condition the claim omits, such as an additional zone or overlay, " +
        "a \"whichever is less\" alternative, or a condition on neighboring uses.",
      false: "The claim already carries the source's conditions, or the source is about something else.",
    },
  };
}

/**
 * One request per claim: whether it is a checkable rule, and for each
 * passage how it relates to the claim and whether it adds a condition the
 * claim leaves out. All questions share the state and run in parallel; code
 * reads the relation answers only for checkable claims.
 */
export function buildClaimRequest(
  claim: GuideClaim,
  jurisdiction: string,
  passages: SourcePassage[],
): { state: unknown; questions: Record<string, TypeSafeQuestion> } {
  const questions: Record<string, TypeSafeQuestion> = { checkable: CHECKABLE };
  passages.forEach((_, index) => {
    questions[`relation_${index}`] = relationQuestion(index);
    questions[`omits_${index}`] = omitsQuestion(index);
  });
  return {
    state: {
      jurisdiction,
      section: claim.section,
      context: claim.context ?? "",
      claim: claim.text,
      passages: passages.map((passage) => ({
        source: passage.label,
        page: passage.page,
        text: passage.text,
      })),
    },
    questions,
  };
}

/** Jev's answers about one passage; `null` where an answer was missing or malformed. */
export interface PassageJudgment {
  relation: Record<Relation, number> | null;
  omits: number | null;
}

export interface ClaimJudgment {
  /** Probability that the claim is a checkable rule. */
  checkable: number | null;
  /** Same order as the passages sent. */
  passages: PassageJudgment[];
  model?: string;
  inputTokens?: number;
}

function probability(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

/** Reads a response defensively: a bad answer becomes `null`, never a guess. */
export function readClaimAnswers(
  response: TypeSafeResponse<TypeSafeAnswer>,
  passageCount: number,
): ClaimJudgment {
  const answers = response.answers ?? {};
  const noul = (id: string) => {
    const answer = answers[id];
    return answer?.type === "noul" ? probability(answer.noul) : null;
  };
  const relation = (id: string): Record<Relation, number> | null => {
    const answer = answers[id];
    if (answer?.type !== "choice" || !answer.probabilities) return null;
    const read = RELATIONS.map((key) => probability(answer.probabilities[key]));
    if (read.some((value) => value === null)) return null;
    return { supports: read[0]!, contradicts: read[1]!, says_nothing: read[2]! };
  };
  return {
    checkable: noul("checkable"),
    passages: Array.from({ length: passageCount }, (_, index) => ({
      relation: relation(`relation_${index}`),
      omits: noul(`omits_${index}`),
    })),
    ...(response.model ? { model: response.model } : {}),
    ...(response.usage ? { inputTokens: response.usage.input_tokens } : {}),
  };
}

type Ask = typeof askTypeSafe<TypeSafeAnswer>;

/**
 * Judges one claim. Retries once after a short pause on a rate-limit or
 * server error; anything else, or a second failure, propagates to the caller.
 */
export async function checkClaim(
  claim: GuideClaim,
  jurisdiction: string,
  passages: SourcePassage[],
  ask: Ask = askTypeSafe<TypeSafeAnswer>,
  retryDelayMs = 1500,
): Promise<ClaimJudgment> {
  const body = buildClaimRequest(claim, jurisdiction, passages);
  let response: TypeSafeResponse<TypeSafeAnswer>;
  try {
    response = await ask(body, CLAIM_CHECK_TIMEOUT_MS);
  } catch (err) {
    if (!(err instanceof TypeSafeProviderError) || !/\b(429|5\d\d)\b/.test(err.message)) throw err;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    response = await ask(body, CLAIM_CHECK_TIMEOUT_MS);
  }
  return readClaimAnswers(response, passages.length);
}

/**
 * Thresholds that turn probabilities into verdicts. `act` follows the
 * citation-check cookbook's starting point; none of these is tuned on
 * LotFoundry data yet, so treat the report as a review queue, not a ruling.
 */
export const CLAIM_POLICY = {
  /** Below this the sentence is treated as copy, not a rule. */
  checkableMin: 0.5,
  /** A supports or contradicts probability at or above this counts. */
  act: 0.8,
  /** A leaning answer below `act` but at or above this goes to review. */
  reviewMin: 0.5,
  /** An omitted-condition probability at or above this flags a supported claim. */
  omitsMin: 0.8,
};

export type ClaimPolicy = typeof CLAIM_POLICY;

export type ClaimVerdict =
  | "contradicted"
  | "sources_disagree"
  | "supported_but_omits"
  | "review"
  | "no_source"
  | "supported"
  | "not_a_rule"
  | "unanswered";

/** Verdicts in report order, most actionable first. */
export const VERDICT_ORDER: ClaimVerdict[] = [
  "contradicted",
  "sources_disagree",
  "supported_but_omits",
  "review",
  "no_source",
  "supported",
  "not_a_rule",
  "unanswered",
];

/**
 * Applies the policy. `evidence` lists the indexes of the passages behind the
 * verdict, so the report can quote them. A claim one passage supports and
 * another contradicts is reported as a disagreement between sources rather
 * than resolved here: which document controls is a person's call.
 */
export function verdictFor(
  judgment: ClaimJudgment,
  policy: ClaimPolicy = CLAIM_POLICY,
): { verdict: ClaimVerdict; evidence: number[] } {
  if (judgment.checkable === null) return { verdict: "unanswered", evidence: [] };
  if (judgment.checkable < policy.checkableMin) return { verdict: "not_a_rule", evidence: [] };
  if (judgment.passages.length === 0) return { verdict: "no_source", evidence: [] };
  if (judgment.passages.every((passage) => passage.relation === null)) {
    return { verdict: "unanswered", evidence: [] };
  }

  const where = (test: (passage: PassageJudgment) => boolean) =>
    judgment.passages.flatMap((passage, index) => (test(passage) ? [index] : []));
  const contradicting = where((passage) => (passage.relation?.contradicts ?? 0) >= policy.act);
  const supporting = where((passage) => (passage.relation?.supports ?? 0) >= policy.act);

  if (contradicting.length > 0 && supporting.length > 0) {
    return { verdict: "sources_disagree", evidence: [...supporting, ...contradicting] };
  }
  if (contradicting.length > 0) return { verdict: "contradicted", evidence: contradicting };
  if (supporting.length > 0) {
    const omitting = supporting.filter(
      (index) => (judgment.passages[index].omits ?? 0) >= policy.omitsMin,
    );
    return omitting.length > 0
      ? { verdict: "supported_but_omits", evidence: omitting }
      : { verdict: "supported", evidence: supporting };
  }
  const leaning = where((passage) =>
    Math.max(passage.relation?.supports ?? 0, passage.relation?.contradicts ?? 0) >= policy.reviewMin,
  );
  if (leaning.length > 0) return { verdict: "review", evidence: leaning };
  return { verdict: "no_source", evidence: [] };
}

/** One claim's full record: what was sent, and what came back. */
export interface ClaimResult {
  claim: GuideClaim;
  passages: SourcePassage[];
  /** `null` in a dry run (retrieval only) or when the request failed. */
  judgment: ClaimJudgment | null;
  error?: string;
}

const VERDICT_TITLES: Record<ClaimVerdict, string> = {
  contradicted: "Contradicted by a source",
  sources_disagree: "Sources disagree",
  supported_but_omits: "Supported, but leaves out a condition",
  review: "Needs review (no confident answer)",
  no_source: "No retrieved passage addresses it",
  supported: "Supported",
  not_a_rule: "Not a checkable rule",
  unanswered: "Unanswered (request failed or malformed)",
};

/** Verdicts whose claims and evidence are written out in full. */
const DETAILED = new Set<ClaimVerdict>([
  "contradicted",
  "sources_disagree",
  "supported_but_omits",
  "review",
]);

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function quote(text: string, maxChars = 700): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxChars ? `${flat.slice(0, maxChars)}…` : flat;
}

/**
 * Renders a Markdown review queue: a count per guide and verdict, then each
 * flagged claim with the passages behind its verdict. In a dry run (no
 * judgments) it lists each claim's retrieved passages instead, which is how
 * retrieval is checked before spending anything.
 */
export function renderReport(
  results: ClaimResult[],
  options: {
    generatedAt: string;
    hasLocalSources: (guide: string) => boolean;
    policy?: ClaimPolicy;
  },
): string {
  const policy = options.policy ?? CLAIM_POLICY;
  const dryRun = results.every((result) => result.judgment === null && !result.error);
  const guides = Array.from(new Set(results.map((result) => result.claim.guide)));
  const lines: string[] = [
    `# Guide claim check${dryRun ? " (dry run: retrieval only)" : ""}`,
    "",
    `Generated ${options.generatedAt}. ${results.length} sentences across ${guides.length} guides.`,
  ];
  if (!dryRun) {
    const models = Array.from(new Set(results.flatMap((result) => result.judgment?.model ?? [])));
    const tokens = results.reduce((sum, result) => sum + (result.judgment?.inputTokens ?? 0), 0);
    lines.push(
      `Model ${models.join(", ") || "unknown"}; ${tokens.toLocaleString("en-US")} input tokens. ` +
        `Thresholds: checkable ≥ ${policy.checkableMin}, act ≥ ${policy.act}, ` +
        `review ≥ ${policy.reviewMin}, omits ≥ ${policy.omitsMin}.`,
      "",
      "Verdicts are a review queue, not rulings. Jev judges each sentence against the passages " +
        "retrieved for it, so \"no source\" can mean the vault lacks the document or retrieval " +
        "missed the clause.",
    );
  }

  for (const guide of guides) {
    const forGuide = results.filter((result) => result.claim.guide === guide);
    lines.push("", `## ${guide}`, "");
    if (!options.hasLocalSources(guide)) {
      lines.push(
        "_Checked against the state handbook only: the vault has no city sources for this " +
          "guide yet, so local rules land in \"no source\"._",
        "",
      );
    }

    if (dryRun) {
      for (const { claim, passages } of forGuide) {
        lines.push(`- \`${claim.location}\` ${claim.text}`);
        if (passages.length === 0) lines.push("  → no passage");
        for (const passage of passages) {
          lines.push(`  → ${passage.label}, p. ${passage.page}: “${quote(passage.text, 160)}”`);
        }
      }
      continue;
    }

    const byVerdict = new Map<ClaimVerdict, { result: ClaimResult; evidence: number[] }[]>();
    for (const result of forGuide) {
      const { verdict, evidence } = result.judgment
        ? verdictFor(result.judgment, policy)
        : { verdict: "unanswered" as const, evidence: [] };
      byVerdict.set(verdict, [...(byVerdict.get(verdict) ?? []), { result, evidence }]);
    }
    lines.push(
      "| Verdict | Sentences |",
      "| --- | ---: |",
      ...VERDICT_ORDER.filter((verdict) => byVerdict.has(verdict)).map(
        (verdict) => `| ${VERDICT_TITLES[verdict]} | ${byVerdict.get(verdict)!.length} |`,
      ),
    );

    for (const verdict of VERDICT_ORDER) {
      const entries = byVerdict.get(verdict);
      if (!entries) continue;
      lines.push("", `### ${VERDICT_TITLES[verdict]}`, "");
      for (const { result, evidence } of entries) {
        const { claim } = result;
        if (!DETAILED.has(verdict)) {
          lines.push(`- \`${claim.location}\` ${claim.text}${result.error ? ` _(${result.error})_` : ""}`);
          continue;
        }
        lines.push(`- \`${claim.location}\` (${claim.section}): ${claim.text}`);
        for (const index of evidence) {
          const passage = result.passages[index];
          const judged = result.judgment!.passages[index];
          const relation = judged.relation;
          const scores = relation
            ? `supports ${percent(relation.supports)}, contradicts ${percent(relation.contradicts)}` +
              (judged.omits !== null ? `, omits a condition ${percent(judged.omits)}` : "")
            : "unanswered";
          lines.push(
            `  - ${passage.label}, p. ${passage.page} (${scores})`,
            `    > ${quote(passage.text)}`,
          );
        }
      }
    }
  }
  return `${lines.join("\n")}\n`;
}
