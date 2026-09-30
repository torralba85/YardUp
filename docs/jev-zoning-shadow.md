# Jev zoning classification (shadow mode)

Status: implemented on `feat/jev-zoning-shadow-20260928`, off by default, shadow only.

## What it does

`/api/parcel` classifies zoning with two regexes today: `deriveMaxCoverage`
(`lib/server/zoning-heuristics.ts`) and the California residential screen
`residentialZoningCode` (`utils/rules/californiaAduRules.ts`). Both misread
common designations, and the certificate shows the result.

With `TYPESAFE_ZONING_SHADOW=true` and a TypeSafe key, each signed-in Regrid
lookup that has a zoning designation also asks Jev one Choice question, "what
kind of district is this?" (`lib/server/zoning-classifier.ts`), and logs one
`jev_zoning_shadow` event next to the regex verdicts. **Nothing about the parcel
response changes.** Failures, timeouts (1.5 s) and unreadable answers are logged
and ignored. The call starts before the market-data lookup so it overlaps it.

Guests never reach Regrid, so this path adds no guest spend. The CLAUDE.md guest
cost rule is unchanged.

## Rollout

1. Create the repository variable `TYPESAFE_ZONING_SHADOW=true` (CI writes it to
   `functions/.env`). The existing `TYPESAFE_API_KEY_SECRET` is reused; no new secret.
2. Deploy with `FUNCTIONS_DISCOVERY_TIMEOUT=120`.
3. Read events: the line is JSON on stdout, filter
   `jsonPayload.event="jev_zoning_shadow"` (or `textPayload:"jev_zoning_shadow"`).

Each event carries the public zoning designation (first 40 characters), the state,
the outcome, Jev's class, confidence, probability margin, whether it cleared the
provisional bands, both regex verdicts and, in California, whether they disagree
(`residentialAgreement`). It carries no address, coordinates, county, city,
provider description or user identifier. (TypeSafe itself receives the state,
county, site city, designation and description; only the log omits them.)

## Evaluating before anything acts on it

`lib/server/zoning-labeled-cases.ts` holds 49 labeled designations across CA, WA,
OR, TX, AZ, GA, FL, CO, OH and NC. **The labels are Claude's reading of published
city code definitions.** They are a regression set, not independent accuracy
evidence.

- Offline baseline of the existing regexes on that set (September 28, 2026):
  the residential screen is right on 28 of 38 clear cases overall and 9 of 14 in
  California, where the product uses it; every miss is a residential zone read as
  "no" (`RE40-1`, `RA-1`, `[Q]R2-1`, `RX-1-1`, `RT-1-1` in CA). The coverage
  heuristic matches the label's implied tier on 15 of 24 residential cases
  (`NR3` -> 50%, `R-20` -> 45%, `LR2` -> 45%), and gives a residential coverage
  number to all 25 non-residential or special-purpose cases. The tier mapping
  (single-family 40, duplex 45, multifamily 50+) is the heuristic's own ordering,
  not a legal coverage limit.
- Live Jev run: `TYPESAFE_API_KEY=... npm run test:jev-zoning-eval` (one metered
  request per case, roughly 400 tokens each). Set `ZONING_EVAL_REPORT` to a file
  path for a JSON line per case. Individual misses do not fail a case; two
  aggregate floors do (0.75 of cases in an accepted class, 0.90 precision among
  confident answers), set just under the results below so a regression trips them.

### Live result, September 28, 2026 (two runs, same 49 cases)

- 39 and 38 of 49 cases landed in an accepted class. The classes were identical
  on 47 of 49 cases between the runs and confidence moved by up to 0.14, so read
  any single run as plus or minus a case or two. Median time 142-147 ms, p95
  217-218 ms.
- 23 and 22 answers cleared the provisional bands; 22 of 23 and 21 of 22 of
  those were right. 9 of the 10 misses in the first run were below the bands.
- Head to head on the 38 clear residential-or-not cases (first run): Jev is
  right on 31, wrong in direction on none, and declined ("agricultural" or
  "unclear") on 7. The regex screen is right on 28 and wrong on 10, always
  calling a residential zone not residential. In California, where the product
  uses the screen: Jev 12 of 14, regex 9 of 14. Jev's failure mode here is
  declining, which the shadow log treats as "not compared", not contradicting.
- Misses are local code vocabularies read from state and county alone: Miami-Dade
  `RU-1`/`RU-3`, Seattle `NR3` and San Diego `RX-1-1` came back agricultural;
  Phoenix `A-1` and Portland `EG1` came back unclear; Austin `SF-6` was read as
  single-family at 0.87, the one confident miss.
- Sending the parcel's city as well was then tried; see "City context" below.
- These cases were first labeled by the prompt's author, so this is a regression
  baseline, not accuracy evidence. See "Independent labels" for the cross-check.

### Independent labels (September 28, 2026)

Two other models labeled all 49 designations blind: opaque ids, no labels or
notes, the same class definitions. Gemini 3.1 Pro matched the fixture's primary
class on 48 and was compatible on all 49; Muse matched 47 and was compatible on
48. The one incompatible label was Phoenix `A-1`: Muse gave the generic
agricultural reading, while Gemini agreed with the fixture (light industrial
under Phoenix's code). The two labelers agreed with each other on 46 of 49. This
cross-checks the labels; it is still models, not a planner, and they saw class
definitions written by the same author as the prompt.

### City context (September 28, 2026)

Regrid supplies the site city (`scity`, else `city`). The classifier now sends it
to Jev beside state and county when present. The eval's
`ZONING_EVAL_OMIT_CITY=true` is the control (no city, original wording).

- Cases in an accepted class: 39, 38, 39, 39 without a city against 39, 38, 38
  with one. Accuracy did not change.
- Confident answers rose from 22-23 to 25-26 at the same precision (21-22 of
  22-23 without, 24-25 of 25-26 with).
- On the 38 clear residential-or-not cases: 31 right and 7 declined in each of
  the three no-city runs analyzed, against 32-33 right and 5-6 declined with a
  city. Every confident answer there was right with a city; one confident answer
  per no-city run was a decline. No run gave a wrong-direction answer.
  California, the only place the screen is used, stayed at 12 of 14 in all runs.
- Wording matters: naming the city in the instructions when none was sent cost
  three cases (35-36 of 49), so the instructions mention the city only when one
  is sent.
- Verdict: a small, consistent gain in coverage, within run-to-run noise on
  accuracy, so not a proven improvement. It is its own commit so it can be
  dropped. The cost is one more coarse public field in what TypeSafe receives;
  it is not logged.

## Before it can change a parcel

- A person's labels on a sample of the labeled set (two models have cross-checked it; the live runs are done).
- Real designations from `jev_zoning_shadow` events added to the set.
- Thresholds (`ZONING_CONFIDENCE_THRESHOLD` 0.80, margin 0.15) tuned on those,
  since they are provisional carry-overs from the address picker.
- A durable cache (Firestore, keyed by state, county, designation, description)
  instead of the bounded per-instance memory cache.
- A decision on what a low-confidence answer does; the intended default is to
  mark coverage and residential status as estimated, never to invent a number.

## Rollback

Unset the repository variable (or set it to anything but `true`) and redeploy.
With the flag off the route makes no TypeSafe call.
