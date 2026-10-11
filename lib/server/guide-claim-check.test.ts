import { describe, expect, it, vi } from "vitest";
import { sanDiego } from "@/content/adu/ca/san-diego";
import { sanDiegoCost } from "@/content/adu/ca/san-diego-cost";
import {
  STATE_BASELINE_PARAGRAPHS,
  STATE_FLOOR_FACTS,
} from "@/content/adu/state-baseline";
import type { JurisdictionContent } from "@/lib/adu/types";
import {
  buildClaimRequest,
  checkClaim,
  CLAIM_CHECK_TIMEOUT_MS,
  claimsFromCostPage,
  claimsFromGuide,
  claimsFromStateBaseline,
  readClaimAnswers,
  renderReport,
  splitSentences,
  verdictFor,
  type ClaimJudgment,
  type ClaimResult,
  type GuideClaim,
  type PassageJudgment,
} from "./guide-claim-check";
import type { SourcePassage } from "./guide-claim-sources";
import { TypeSafeConfigError, TypeSafeProviderError } from "./typesafe";

const CLAIM: GuideClaim = {
  guide: "san-diego",
  location: "glance[4]",
  section: "Rear and side setbacks",
  context: "Front setbacks follow your base zone.",
  text: "Rear and side setbacks: 0 ft up to 16 ft tall.",
};

function passage(text: string, page = 5): SourcePassage {
  return { sourceId: "sdmc", label: "SDMC § 141.0302", page, text, lines: [0, 0] };
}

const PASSAGES = [
  passage("(C) ... structure height of 16 feet or less ... no minimum interior side yard and rear yard setbacks."),
  passage("(D) ... exceeds 16 feet ... 4 feet or the minimum setback of the applicable base zone, whichever is less.", 6),
];

describe("splitSentences", () => {
  it("splits on sentence ends but not inside abbreviations or decimals", () => {
    expect(
      splitSentences(
        "Codes change, e.g. in 2025. San Diego cites § 141.0302 here. Fees run $1.5k? Yes. 16 ft is the line.",
      ),
    ).toEqual([
      "Codes change, e.g. in 2025.",
      "San Diego cites § 141.0302 here.",
      "Fees run $1.5k?",
      "Yes.",
      "16 ft is the line.",
    ]);
  });

  it("keeps min. and max. inside a sentence", () => {
    expect(splitSentences("Up to 50% of the house (min. 850–1,000 sq ft guaranteed)")).toEqual([
      "Up to 50% of the house (min. 850–1,000 sq ft guaranteed)",
    ]);
  });

  it("keeps a trailing fragment without punctuation", () => {
    expect(splitSentences("150 to 1,200 sq ft")).toEqual(["150 to 1,200 sq ft"]);
  });
});

describe("claim extraction", () => {
  it("covers every part of the San Diego guide with unique locations", () => {
    const claims = claimsFromGuide(sanDiego);
    expect(claims.length).toBeGreaterThan(60);
    expect(new Set(claims.map((claim) => claim.location)).size).toBe(claims.length);
    const prefixes = new Set(claims.map((claim) => claim.location.split(/[[.#]/)[0]));
    for (const part of ["metaDescription", "introAnswer", "glance", "cityDiffers", "fees", "processSteps", "faqs"]) {
      expect(prefixes).toContain(part);
    }
  });

  it("reads a glance row as one rule and gives its note that rule as context", () => {
    const claims = claimsFromGuide(sanDiego);
    const index = sanDiego.glance.findIndex((row) => row.label === "Rear and side setbacks");
    const row = sanDiego.glance[index];
    const rule = claims.find((claim) => claim.location === `glance[${index}]`);
    const note = claims.find((claim) => claim.location.startsWith(`glance[${index}].note`));
    expect(rule?.text).toBe(`${row.label}: ${row.value}`);
    expect(note?.context).toBe(rule?.text);
  });

  it("carries the previous sentence across paragraphs as context", () => {
    const content = {
      ...sanDiego,
      cityDiffers: [{ heading: "Setbacks", paragraphs: ["First rule. Second rule.", "Third rule."] }],
    } satisfies JurisdictionContent;
    const claims = claimsFromGuide(content).filter((claim) => claim.section === "Setbacks");
    expect(claims.map((claim) => [claim.text, claim.context])).toEqual([
      ["First rule.", undefined],
      ["Second rule.", "First rule."],
      ["Third rule.", "Second rule."],
    ]);
  });

  it("drops a sentence repeated elsewhere on the page", () => {
    const content = {
      ...sanDiego,
      introAnswer: ["Same sentence."],
      processIntro: "Same sentence.",
    } satisfies JurisdictionContent;
    expect(claimsFromGuide(content).filter((claim) => claim.text === "Same sentence.")).toHaveLength(1);
  });

  it("keys the cost page and state hub as their own guides", () => {
    expect(claimsFromCostPage(sanDiegoCost).every((claim) => claim.guide === "san-diego/cost")).toBe(true);
    const state = claimsFromStateBaseline(STATE_BASELINE_PARAGRAPHS, STATE_FLOOR_FACTS);
    expect(state.length).toBeGreaterThan(0);
    expect(state.every((claim) => claim.guide === "ca")).toBe(true);
  });
});

describe("buildClaimRequest", () => {
  it("asks one checkable Noul plus a relation Choice and an omits Noul per passage", () => {
    const { questions } = buildClaimRequest(CLAIM, "San Diego, California", PASSAGES);
    expect(Object.keys(questions)).toEqual([
      "checkable",
      "relation_0",
      "omits_0",
      "relation_1",
      "omits_1",
    ]);
    expect(questions.checkable.type).toBe("noul");
    expect(questions.relation_1.type).toBe("choice");
    expect(questions.relation_1.instructions).toContain("`passages[1].text`");
    expect(questions.omits_0.instructions).toContain("`passages[0].text`");
    if (questions.relation_0.type === "choice") {
      expect(Object.keys(questions.relation_0.criteria)).toEqual(["supports", "contradicts", "says_nothing"]);
    }
  });

  it("puts the claim, its context and the passages in state, not in the questions", () => {
    const { state } = buildClaimRequest(CLAIM, "San Diego, California", PASSAGES);
    expect(state).toEqual({
      jurisdiction: "San Diego, California",
      section: "Rear and side setbacks",
      context: "Front setbacks follow your base zone.",
      claim: CLAIM.text,
      passages: PASSAGES.map((p) => ({ source: p.label, page: p.page, text: p.text })),
    });
  });

  it("asks only whether the claim is checkable when nothing was retrieved", () => {
    expect(Object.keys(buildClaimRequest(CLAIM, "San Diego, California", []).questions)).toEqual([
      "checkable",
    ]);
  });
});

const relation = (supports: number, contradicts: number) => ({
  supports,
  contradicts,
  says_nothing: Math.max(0, 1 - supports - contradicts),
});

function judgment(passages: PassageJudgment[], checkable = 0.95): ClaimJudgment {
  return { checkable, passages };
}

describe("readClaimAnswers", () => {
  it("reads Noul and Choice answers into probabilities", () => {
    const read = readClaimAnswers(
      {
        model: "jev-1.13.0",
        usage: { input_tokens: 1800, output_tokens: 20 },
        answers: {
          checkable: { type: "noul", noul: 0.97 },
          relation_0: {
            type: "choice",
            choice: "supports",
            confidence: 0.9,
            probabilities: { supports: 0.92, contradicts: 0.03, says_nothing: 0.05 },
          },
          omits_0: { type: "noul", noul: 0.1 },
        },
      },
      1,
    );
    expect(read).toEqual({
      checkable: 0.97,
      passages: [{ relation: { supports: 0.92, contradicts: 0.03, says_nothing: 0.05 }, omits: 0.1 }],
      model: "jev-1.13.0",
      inputTokens: 1800,
    });
  });

  it("turns missing, mistyped or out-of-range answers into null", () => {
    const read = readClaimAnswers(
      {
        answers: {
          checkable: { type: "noul", noul: 1.4 },
          relation_0: {
            type: "choice",
            choice: "supports",
            confidence: 0.9,
            probabilities: { supports: 0.9, contradicts: 0.1 },
          },
          omits_0: { type: "choice", choice: "x", confidence: 1, probabilities: { x: 1 } },
        },
      },
      2,
    );
    expect(read.checkable).toBeNull();
    expect(read.passages).toEqual([
      { relation: null, omits: null },
      { relation: null, omits: null },
    ]);
  });
});

describe("verdictFor", () => {
  it("treats a low checkable probability as copy, whatever the passages say", () => {
    expect(verdictFor(judgment([{ relation: relation(0, 0.99), omits: null }], 0.2)).verdict).toBe("not_a_rule");
  });

  it("flags a confident contradiction with its passage", () => {
    expect(
      verdictFor(judgment([
        { relation: relation(0.1, 0.2), omits: 0.1 },
        { relation: relation(0.05, 0.9), omits: 0.1 },
      ])),
    ).toEqual({ verdict: "contradicted", evidence: [1] });
  });

  it("reports one passage supporting and another contradicting as a disagreement", () => {
    expect(
      verdictFor(judgment([
        { relation: relation(0.9, 0.05), omits: 0.1 },
        { relation: relation(0.05, 0.9), omits: 0.1 },
      ])),
    ).toEqual({ verdict: "sources_disagree", evidence: [0, 1] });
  });

  it("separates a supported claim from one that leaves out a condition", () => {
    expect(verdictFor(judgment([{ relation: relation(0.9, 0.05), omits: 0.3 }])).verdict).toBe("supported");
    expect(verdictFor(judgment([{ relation: relation(0.9, 0.05), omits: 0.85 }]))).toEqual({
      verdict: "supported_but_omits",
      evidence: [0],
    });
  });

  it("sends leaning answers to review and silent passages to no source", () => {
    expect(verdictFor(judgment([{ relation: relation(0.6, 0.1), omits: 0.1 }]))).toEqual({
      verdict: "review",
      evidence: [0],
    });
    expect(verdictFor(judgment([{ relation: relation(0.1, 0.1), omits: 0.1 }])).verdict).toBe("no_source");
    expect(verdictFor(judgment([])).verdict).toBe("no_source");
  });

  it("never guesses from missing answers", () => {
    expect(verdictFor({ checkable: null, passages: [] }).verdict).toBe("unanswered");
    expect(verdictFor(judgment([{ relation: null, omits: null }])).verdict).toBe("unanswered");
  });

  it("applies a caller's policy", () => {
    const leaning = judgment([{ relation: relation(0.7, 0.1), omits: 0.1 }]);
    expect(verdictFor(leaning).verdict).toBe("review");
    expect(verdictFor(leaning, { checkableMin: 0.5, act: 0.65, reviewMin: 0.5, omitsMin: 0.8 }).verdict).toBe(
      "supported",
    );
  });
});

describe("checkClaim", () => {
  const ok = {
    answers: {
      checkable: { type: "noul" as const, noul: 0.9 },
      relation_0: {
        type: "choice" as const,
        choice: "supports",
        confidence: 0.9,
        probabilities: { supports: 0.9, contradicts: 0.05, says_nothing: 0.05 },
      },
      omits_0: { type: "noul" as const, noul: 0.1 },
    },
  };

  it("sends the built request with the batch timeout", async () => {
    const ask = vi.fn().mockResolvedValue(ok);
    const result = await checkClaim(CLAIM, "San Diego, California", PASSAGES.slice(0, 1), ask);
    expect(ask).toHaveBeenCalledWith(
      buildClaimRequest(CLAIM, "San Diego, California", PASSAGES.slice(0, 1)),
      CLAIM_CHECK_TIMEOUT_MS,
    );
    expect(verdictFor(result).verdict).toBe("supported");
  });

  it("retries once on a rate limit or server error", async () => {
    const ask = vi
      .fn()
      .mockRejectedValueOnce(new TypeSafeProviderError("TypeSafe returned 429"))
      .mockResolvedValueOnce(ok);
    await checkClaim(CLAIM, "San Diego, California", PASSAGES.slice(0, 1), ask, 0);
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("does not retry an auth failure or a missing key", async () => {
    for (const error of [new TypeSafeProviderError("TypeSafe returned 401"), new TypeSafeConfigError()]) {
      const ask = vi.fn().mockRejectedValue(error);
      await expect(checkClaim(CLAIM, "San Diego, California", [], ask, 0)).rejects.toBe(error);
      expect(ask).toHaveBeenCalledTimes(1);
    }
  });
});

describe("renderReport", () => {
  const supported: ClaimResult = {
    claim: { ...CLAIM, location: "glance[0]", text: "Front setback: per base zone." },
    passages: PASSAGES.slice(0, 1),
    judgment: { ...judgment([{ relation: relation(0.95, 0.01), omits: 0.05 }]), model: "jev-1.13.0", inputTokens: 1000 },
  };
  const contradicted: ClaimResult = {
    claim: { ...CLAIM, text: "16 ft or taller owes 4 ft." },
    passages: PASSAGES,
    judgment: {
      ...judgment([
        { relation: relation(0.2, 0.1), omits: 0.1 },
        { relation: relation(0.02, 0.93), omits: 0.2 },
      ]),
      inputTokens: 2000,
    },
  };

  it("counts verdicts per guide and quotes the passage behind a flag", () => {
    const report = renderReport([supported, contradicted], {
      generatedAt: "2026-10-11T00:00:00Z",
      hasLocalSources: () => true,
    });
    expect(report).toContain("| Contradicted by a source | 1 |");
    expect(report).toContain("| Supported | 1 |");
    expect(report).toContain("3,000 input tokens");
    expect(report).toContain("16 ft or taller owes 4 ft.");
    expect(report).toContain("SDMC § 141.0302, p. 6 (supports 2%, contradicts 93%, omits a condition 20%)");
    expect(report).toContain("> (D) ... exceeds 16 feet");
    // Supported claims are listed, not quoted.
    expect(report).not.toContain("> (C)");
  });

  it("says when a guide was checked against the state handbook only", () => {
    const report = renderReport([{ ...supported, claim: { ...supported.claim, guide: "carlsbad" } }], {
      generatedAt: "2026-10-11T00:00:00Z",
      hasLocalSources: () => false,
    });
    expect(report).toContain("state handbook only");
  });

  it("lists each claim's top passage in a dry run", () => {
    const report = renderReport([{ ...contradicted, judgment: null }], {
      generatedAt: "2026-10-11T00:00:00Z",
      hasLocalSources: () => true,
    });
    expect(report).toContain("(dry run: retrieval only)");
    expect(report).toContain("→ SDMC § 141.0302, p. 5:");
  });
});
