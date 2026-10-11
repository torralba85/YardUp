import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADU_CITIES, ADU_COST_PAGES } from "@/lib/adu/content";
import {
  STATE_BASELINE_PARAGRAPHS,
  STATE_FLOOR_FACTS,
} from "@/content/adu/state-baseline";
import {
  buildClaimRequest,
  checkClaim,
  claimsFromCostPage,
  claimsFromGuide,
  claimsFromStateBaseline,
  PASSAGES_PER_CLAIM,
  renderReport,
  verdictFor,
  type ClaimJudgment,
  type ClaimResult,
  type ClaimVerdict,
  type GuideClaim,
} from "./guide-claim-check";
import {
  buildPassages,
  hasLocalSources,
  PassageIndex,
  sourcesForGuide,
  VAULT_DOCUMENTS,
} from "./guide-claim-sources";

/**
 * Opt-in runner for the guide claim check, kept out of normal CI and npm test
 * runs. It needs the Regulatory Vault as text: set GUIDE_CHECK_SOURCES to a
 * folder of `<vault basename>.txt` files made with `pdftotext -enc UTF-8`.
 *
 * - GUIDE_CHECK_DRY_RUN=true: retrieval only, no key, nothing metered.
 *   `npx vitest run lib/server/guide-claim-check.eval.test.ts`
 * - Live: `npm run test:jev-guide-check` with TYPESAFE_API_KEY set; one
 *   metered request per sentence (the report prints the token total).
 *
 * GUIDE_CHECK_GUIDES narrows the run (comma list: `san-diego,ca`). Reports
 * land in GUIDE_CHECK_REPORT_DIR (default: the OS temp folder). Judgments
 * are cached there by request hash, so a rerun only pays for sentences or
 * passages that changed. See docs/jev-guide-claim-check.md.
 */
const sourcesDir = process.env.GUIDE_CHECK_SOURCES ?? "";
const dryRun = process.env.GUIDE_CHECK_DRY_RUN === "true";
const live = process.env.RUN_TYPESAFE_EVAL === "true" && Boolean(process.env.TYPESAFE_API_KEY);
const enabled = Boolean(sourcesDir) && (dryRun || live);
const reportDir =
  process.env.GUIDE_CHECK_REPORT_DIR ?? join(tmpdir(), "lotfoundry-guide-claim-check");
const onlyGuides = process.env.GUIDE_CHECK_GUIDES?.split(",").map((guide) => guide.trim());
const CONCURRENCY = 4;

function loadIndex(guide: string): PassageIndex {
  return new PassageIndex(
    sourcesForGuide(guide).flatMap((id) => {
      const file = join(sourcesDir, `${id}.txt`);
      if (!existsSync(file)) {
        throw new Error(`Missing ${file}. Run pdftotext on the vault PDF first.`);
      }
      return buildPassages({ id, label: VAULT_DOCUMENTS[id], text: readFileSync(file, "utf8") });
    }),
  );
}

interface GuideRun {
  guide: string;
  jurisdiction: string;
  claims: GuideClaim[];
}

function guideRuns(): GuideRun[] {
  const cityName = new Map(ADU_CITIES.map((city) => [city.slug, `${city.city}, ${city.stateName}`]));
  const runs: GuideRun[] = [
    ...ADU_CITIES.map((city) => ({
      guide: city.slug,
      jurisdiction: cityName.get(city.slug)!,
      claims: claimsFromGuide(city),
    })),
    ...ADU_COST_PAGES.map((cost) => ({
      guide: `${cost.slug}/cost`,
      jurisdiction: cityName.get(cost.slug) ?? "California",
      claims: claimsFromCostPage(cost),
    })),
    {
      guide: "ca",
      jurisdiction: "California",
      claims: claimsFromStateBaseline(STATE_BASELINE_PARAGRAPHS, STATE_FLOOR_FACTS),
    },
  ];
  return onlyGuides ? runs.filter((run) => onlyGuides.includes(run.guide)) : runs;
}

/** Runs `work` over `items` with at most `limit` in flight, keeping order. */
async function pool<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        out[index] = await work(items[index]);
      }
    }),
  );
  return out;
}

const cacheFile = join(reportDir, "judgments.jsonl");

function loadCache(): Map<string, ClaimJudgment> {
  const cache = new Map<string, ClaimJudgment>();
  if (!existsSync(cacheFile)) return cache;
  for (const line of readFileSync(cacheFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line) as { key: string; judgment: ClaimJudgment };
    cache.set(entry.key, entry.judgment);
  }
  return cache;
}

async function judge(
  claim: GuideClaim,
  jurisdiction: string,
  index: PassageIndex,
  cache: Map<string, ClaimJudgment>,
): Promise<ClaimResult> {
  const passages = index.search(`${claim.section} ${claim.text}`, PASSAGES_PER_CLAIM);
  if (!live) return { claim, passages, judgment: null };
  const key = createHash("sha256")
    .update(JSON.stringify(buildClaimRequest(claim, jurisdiction, passages)))
    .digest("hex");
  const cached = cache.get(key);
  if (cached) return { claim, passages, judgment: cached };
  try {
    const judgment = await checkClaim(claim, jurisdiction, passages);
    cache.set(key, judgment);
    appendFileSync(cacheFile, `${JSON.stringify({ key, judgment })}\n`);
    return { claim, passages, judgment };
  } catch (err) {
    return { claim, passages, judgment: null, error: (err as Error).name };
  }
}

// A live run without sources would otherwise skip silently.
describe.runIf((dryRun || live) && !sourcesDir)("guide claim check setup", () => {
  it("needs GUIDE_CHECK_SOURCES", () => {
    throw new Error("Set GUIDE_CHECK_SOURCES to a folder of vault .txt files (docs/jev-guide-claim-check.md).");
  });
});

describe.skipIf(!enabled)("guide claim check over the published guides", () => {
  it("writes the review report", { timeout: 30 * 60_000 }, async () => {
    mkdirSync(reportDir, { recursive: true });
    const cache = loadCache();
    const results: ClaimResult[] = [];
    for (const run of guideRuns()) {
      const index = loadIndex(run.guide);
      results.push(
        ...(await pool(run.claims, CONCURRENCY, (claim) =>
          judge(claim, run.jurisdiction, index, cache),
        )),
      );
    }

    const report = renderReport(results, {
      generatedAt: new Date().toISOString(),
      hasLocalSources,
    });
    const name = live ? "guide-claim-check" : "guide-claim-check-dry-run";
    writeFileSync(join(reportDir, `${name}.md`), report);
    writeFileSync(
      join(reportDir, `${name}.jsonl`),
      results
        .map((result) =>
          JSON.stringify({
            ...result,
            passages: result.passages.map(({ sourceId, page, lines }) => ({ sourceId, page, lines })),
            verdict: result.judgment ? verdictFor(result.judgment).verdict : null,
          }),
        )
        .join("\n") + "\n",
    );
    console.log(`Guide claim check: ${results.length} sentences -> ${join(reportDir, `${name}.md`)}`);

    const failed = results.filter((result) => result.error).length;
    expect(failed, `${failed} requests failed`).toBeLessThanOrEqual(results.length * 0.05);
  });
});

/**
 * Claims with known answers against San Diego's sources, from the vault's
 * 2026-10-09 answer key (SDMC § 141.0302(b)(8)-(10)) and the HCD handbook's
 * impact-fee exemption. Written by the prompt's author, so this is a
 * regression set, not accuracy evidence. Its one hard floor is the safety
 * property the tool exists for: a claim a source contradicts must never come
 * back "supported".
 */
const LABELED: { text: string; section: string; accept: ClaimVerdict[] }[] = [
  {
    section: "Setbacks",
    text: "Outside a High or Very High Fire Hazard Severity Zone, an ADU 16 feet tall or less needs no interior side or rear setback.",
    accept: ["supported", "supported_but_omits"],
  },
  {
    section: "Setbacks",
    text: "An ADU 16 feet or taller owes a 4-foot side and rear setback.",
    accept: ["contradicted", "sources_disagree", "supported_but_omits", "review"],
  },
  {
    section: "Setbacks",
    text: "Every ADU taller than 16 feet must be set back 4 feet from the side and rear lot lines.",
    accept: ["supported_but_omits", "contradicted", "sources_disagree", "review"],
  },
  {
    section: "Setbacks",
    text: "The 4-foot fire-zone setback applies only in Very High Fire Hazard Severity Zones, not in High zones.",
    accept: ["contradicted", "sources_disagree", "review"],
  },
  {
    section: "Height",
    text: "On lots zoned for single dwelling units only, a detached ADU can be up to three stories.",
    accept: ["contradicted", "review"],
  },
  {
    section: "Height",
    text: "On lots that permit single dwelling units but not multiple dwelling units, a detached ADU may not exceed two stories.",
    accept: ["supported", "supported_but_omits"],
  },
  {
    section: "Setbacks",
    text: "The front yard setback of an ADU follows the base zone.",
    accept: ["supported", "supported_but_omits"],
  },
  {
    section: "Parking",
    text: "No off-street parking is required for an ADU except in the cases the code lists.",
    accept: ["supported", "supported_but_omits"],
  },
  {
    section: "Fees",
    text: "An ADU with less than 750 square feet of floor area is exempt from development impact fees.",
    accept: ["supported", "supported_but_omits"],
  },
  {
    section: "Fees",
    text: "Every ADU under 1,200 square feet is exempt from all development impact fees.",
    accept: ["contradicted", "sources_disagree", "review", "supported_but_omits"],
  },
  {
    section: "Size",
    text: "A junior ADU may be as large as 1,000 square feet.",
    accept: ["contradicted", "review", "no_source"],
  },
  {
    section: "Intro",
    text: "Enter your address and see what fits on your lot in 3D.",
    accept: ["not_a_rule"],
  },
];

const SHOULD_NOT_PASS = new Set(
  LABELED.filter((testCase) => !testCase.accept.includes("supported")).map((testCase) => testCase.text),
);

describe.skipIf(!live || !sourcesDir)("guide claim check labeled cases", () => {
  it("never calls a contradicted claim supported", { timeout: 5 * 60_000 }, async () => {
    mkdirSync(reportDir, { recursive: true });
    const index = loadIndex("san-diego");
    const rows = await pool(LABELED, CONCURRENCY, async (testCase) => {
      const claim: GuideClaim = {
        guide: "labeled",
        location: "labeled",
        section: testCase.section,
        text: testCase.text,
      };
      const result = await judge(claim, "San Diego, California", index, new Map());
      const verdict = result.judgment ? verdictFor(result.judgment).verdict : "unanswered";
      return { ...testCase, verdict, ok: testCase.accept.includes(verdict) };
    });
    for (const row of rows) console.log(`${row.ok ? "ok  " : "MISS"} ${row.verdict.padEnd(20)} ${row.text}`);
    console.log(`Labeled: ${rows.filter((row) => row.ok).length} of ${rows.length} in an accepted verdict`);

    const wrongDirection = rows.filter(
      (row) => SHOULD_NOT_PASS.has(row.text) && row.verdict === "supported",
    );
    expect(wrongDirection.map((row) => row.text)).toEqual([]);
  });
});
