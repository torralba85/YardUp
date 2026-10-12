# Jev guide claim check

Status: internal review tool, run by hand. Not part of any request path, CI job
or deploy; it never edits a page.

## What it does

The city guides (`content/adu/ca/*.ts`), the San Diego cost page and the
California hub's state-law copy make hundreds of specific claims. Recent fixes
were mostly claims that drifted from the code: a Carlsbad citation to the wrong
section, and San Diego wording ("16 ft or taller") that the code states
differently ("exceeds 16 feet"). This tool checks every sentence against the
government documents staged in the Regulatory Vault and produces a review
queue.

It follows TypeSafe's [citation-check cookbook](https://docs.typesafe.ai/cookbooks/citation_check),
with two changes. The guides carry page-level sources, not one citation per
claim, so code first retrieves candidate passages. Jev is also asked whether
each claim leaves out a condition.

For each sentence (`lib/server/guide-claim-check.ts`):

1. **Code** splits the guide into sentences and keeps the previous sentence as
   context, so "Same 4 feet applies…" can be resolved.
2. **Code** ranks passages from that guide's vault documents with BM25
   (`lib/server/guide-claim-sources.ts`) and keeps the best 4.
3. **Jev** answers one request with all questions in parallel:
   - `checkable` (Noul): is this a concrete rule a code section could settle,
     or copy such as an invitation, advice or a statistic?
   - `relation_i` (Choice, per passage): does the passage support it,
     contradict it, or say nothing about it?
   - `omits_i` (Noul, per passage): does the passage attach a condition the
     claim leaves out, such as an extra fire-zone tier, a "whichever is less"
     alternative or an abutting-use condition?
4. **Code** applies `CLAIM_POLICY` to produce a verdict:

| Verdict | Rule (provisional thresholds) |
| --- | --- |
| Contradicted | some passage contradicts at ≥ 0.8 |
| Sources disagree | one passage supports and another contradicts, both at ≥ 0.8. Which document controls is left to a person. |
| Supported, but leaves out a condition | supported at ≥ 0.8, and that passage's `omits` is ≥ 0.8 |
| Supported | supported at ≥ 0.8 |
| Needs review | best support or contradiction is between 0.5 and 0.8 |
| No source | no retrieved passage addresses it. Either the vault lacks the document or retrieval missed it. |
| Not a checkable rule | `checkable` < 0.5 |

The thresholds come from the cookbook's starting point and have not been tuned
on LotFoundry data. Raw probabilities are kept in the JSONL output, so changing
a threshold means re-rendering, not re-asking.

Only public text is sent to TypeSafe: published guide copy and government
documents. No user data is involved, so the privacy policy needs no change for
this tool.

## Sources

| Guide | Documents |
| --- | --- |
| `san-diego` | SDMC § 141.0302 (9-2026), IB-400 (Jan 2026), IB-501 (Aug 2026), HCD handbook (Mar 2026) |
| `san-diego/cost` | IB-501, HCD handbook |
| `ca`, and every guide without city sources | HCD handbook only |

Carlsbad, Chula Vista, Escondido and Oceanside have no city documents in the
vault yet (`03_California_San_Diego_County` is empty), so their local rules
land in "no source". To add a document, save its PDF to the vault and add it
to `VAULT_DOCUMENTS` and `GUIDE_SOURCES` in `guide-claim-sources.ts`.

## Running it

The vault PDFs live outside the repo (`Documents/LotFoundry/Regulatory Vault`
locally, and the Drive folder of the same name). Convert them to text first,
one `<basename>.txt` per PDF in a single folder:

```bash
mkdir -p /tmp/vault-text
for f in "<vault>"/0*/*.pdf; do pdftotext -enc UTF-8 "$f" "/tmp/vault-text/$(basename "$f" .pdf).txt"; done
```

**Dry run.** Retrieval only, with no key and nothing metered. Use it to check
which passages each sentence will be judged against:

```bash
GUIDE_CHECK_SOURCES=/tmp/vault-text GUIDE_CHECK_DRY_RUN=true \
  npx vitest run lib/server/guide-claim-check.eval.test.ts
```

**Live.** Makes one metered request per sentence. The 2026-10-11 content has
about 460 sentences across all guides. Even at a pessimistic 10,000 input
tokens per request, that is 4.6 million tokens, about $0.19 at $0.042 per
million (output is free). The report prints the actual token total:

```bash
TYPESAFE_API_KEY=… GUIDE_CHECK_SOURCES=/tmp/vault-text npm run test:jev-guide-check
```

Options:

- `GUIDE_CHECK_GUIDES=san-diego,ca` limits the run to those guides.
- `GUIDE_CHECK_REPORT_DIR` sets where reports go. The default is
  `<os tmp>/lotfoundry-guide-claim-check`.

Each run writes `guide-claim-check.md` (the review queue) and
`guide-claim-check.jsonl` (every sentence, its passages, raw probabilities and
verdict). Judgments are cached in `judgments.jsonl` by a hash of the exact
request, so a rerun pays only for sentences or passages that changed.
Malformed answers are never cached and count as failures. The request names
`jev-latest`, an alias, so delete the cache when the report shows a new model
version.

The live run also checks 12 labeled San Diego claims. They were written by the
same author as the prompt, so they are a regression set, not accuracy
evidence. The one hard floor is that a claim a source contradicts must never
come back "supported".

## First live runs (October 11, 2026)

There were three runs on master `6eb7550` content. The last full run came
after the fixes from a Codex review, which restored IB-501's fee amounts that
footer removal had been dropping.

- 461 sentences, 0 failed or malformed requests, `jev-1.13.0`, 1.19 million
  input tokens (about $0.05).
- San Diego: 4 contradicted, 2 sources disagree, 22 supported but leaves out a
  condition, 11 review, 8 no source, 20 supported, 23 not a rule.
- Labeled cases: 11 of 12, then 12 of 12 twice. Cases moved between verdicts
  on identical input, so expect plus or minus a case per run. No contradicted
  claim ever came back "supported".
- Between the last two full runs, 35 of 461 verdicts changed. Most were
  answers near the 0.8 threshold moving, which is why the cache keeps one
  run's judgments stable for review.

All "contradicted" sentences were read against the documents by hand (20 in
the first run, 19 in the last; the San Diego timeline item below is new).

- **Worth fixing.**
  - San Diego says "an ADU cannot go in a front yard" in two places. IB-400 and
    HCD allow one ADU of 800 sq ft or less into the front setback.
  - San Diego's "no setback up to 16 ft" sentence leaves out that SDMC also
    requires 4 ft in High fire zones, not only Very High.
  - Chula Vista and Escondido call 850 to 1,000 sq ft "minimums". State law
    makes those the size a city must allow, not a minimum.
  - Carlsbad says an attached ADU is "never limited to less than 800 sq ft".
    HCD gives 850 to 1,000 sq ft as the floor for percentage caps.
- **Leads to verify.**
  - Oceanside's four sentences on units over 1,000 sq ft taking the district's
    setbacks. HCD says side and rear setbacks of no more than 4 ft apply to
    any ADU (Gov. Code § 66314(d)(7)), with a Coastal Zone exception. Jev
    judged these against the 800 sq ft unit passage instead, so this is a
    lead, not proof.
  - Carlsbad's replacement-parking note (state law bars replacement outside
    Coastal Zone rules).
  - Carlsbad's "at least 30 days" (HCD says "longer than 30 days").
  - San Diego's "5 to 7 months inside the Coastal Zone". HCD says the coastal
    permit is decided concurrently with the ADU application, within 60 days,
    where a certified coastal program covers ADUs. The row is marked as a
    secondary-source estimate.
- **False positives.**
  - The California hub's 850/1,000 sq ft sentence, which matches HCD.
  - Carlsbad's meta description and Escondido's JADU sentence. Jev applied the
    800 sq ft unit rule (66323) to general rules.
  - Oceanside's coastal-track sentences.

The `omits` Noul separates on-topic from off-topic passages (median 0.63 when
a passage supports the claim, 0.18 when it says nothing). It still crosses 0.8
on 132 of 595 supporting passages, so "leaves out a condition" is the noisiest
queue; read it last.

## Reading the report

Work top-down: contradicted, sources disagree, leaves out a condition, then
review. Each flagged sentence lists its location in the content module (for
example `cityDiffers[1].paragraphs[2]#2` is the second sentence of that
paragraph), the passages behind the verdict with page numbers, and the
probabilities. A flag is a prompt to read the source, not a ruling. Fix the
guide only after confirming against the document itself.

## Limits

- Retrieval is lexical. A claim worded very differently from the code can
  miss its clause and land in "no source". The dry run shows this.
- Jev judges each sentence against at most 4 passages. A rule split across
  distant sections, such as a definition far from where it is used, can look
  unsupported.
- The verdict is about the vault's edition of each document. IB-400 and IB-501
  are web captures from 2026-10-09; recapture them when the City updates them.
