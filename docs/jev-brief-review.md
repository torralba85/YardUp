# Jev project-brief review

The optional checker asks whether the brief's summary, best-fit description and
risk explanations are supported by the inputs used to generate it. This is an
experiment for measuring consistency. It does not verify the underlying parcel
data, local law, permit eligibility, costs, or financial returns.

## Behavior

- Disabled unless `TYPESAFE_BRIEF_REVIEW=shadow` and `TYPESAFE_API_KEY` are set.
- Runs after brief generation on the existing authenticated, rate-limited route.
- Uses selected parcel, configuration and calculation fields plus the actual
  permit-tool results captured for that request. Generated permit fields are
  never used as evidence for generated narrative.
- Makes at most one Jev request, with a 1,500 ms provider timeout. The request is
  awaited before responding so Cloud Functions can finish it reliably.
- Returns the existing full or preview response. It does not delete, rewrite,
  publish, or save a reviewed version of the brief.
- Logs aggregate counts and duration. Missing or malformed answers and provider
  failures are distinct from a completed review and do not fail the brief.

The initial score bands are >=0.8 supported, <=0.2 flagged, and the middle range
uncertain. These are provisional model-score bands, not measured accuracy or
calibrated probabilities. A field may contain multiple sentences; one weak claim
can flag the whole field. Only the selected narrative fields are checked.

## Data and cost

When enabled, TypeSafe receives the selected evidence and narrative text. Parcel
IDs, street-address fields, coordinates and ZIP fields are excluded from the
evidence allowlist. Narrative text, city names or warnings can still contain
identifying information, so this payload is not guaranteed anonymous.

Logs omit claim text, input data, addresses, account identifiers, provider error
messages and provider-returned model strings. They use event
`jev_project_brief_review`. Scores indicate support relative to supplied evidence;
client-supplied fields are not upgraded to independently verified facts.

The batch is bounded to 12 narrative fields, 2,000 characters per field and 24,000
serialized characters for state plus questions. Oversized input is skipped
without truncating evidence. Normal unit tests use mocks and spend no quota.
Enabling the feature adds up to one paid TypeSafe request per generated brief.

## Configuration and rollout

Local use reads `TYPESAFE_BRIEF_REVIEW=shadow` and a server-only
`TYPESAFE_API_KEY`. Production binds `TYPESAFE_API_KEY_SECRET` to `apiAi` only for
this flag; the existing geocode flag independently controls the key on `api`.
Neither flag adds the key to Hosting, Stripe or native-store handlers.

CI writes the review flag from the GitHub repository variable
`TYPESAFE_BRIEF_REVIEW`. It never writes the key into an environment artifact.
Leave this variable unset until evaluation and the TypeSafe data-processing
disclosure for project briefs are ready. This implementation does not activate
the feature or change production configuration.

Before activation, evaluate labeled synthetic cases for supported claims,
invented site facts, contradictory numbers, uncertainty, and instructions
embedded in narrative. Review false negatives as well as false positives.
Then measure review duration, provider failures, skipped batches, token usage
and the distribution of model scores in a limited experiment. Aggregate logs
alone cannot establish factual accuracy. Customer-facing enforcement is a
separate future change.

Rollback: unset `TYPESAFE_BRIEF_REVIEW` and redeploy `apiAi`. The geocode flag
and existing customer response remain independent.

## Verification

```powershell
npx.cmd vitest run lib/server/typesafe.test.ts lib/server/project-brief-grounding.test.ts lib/server/panels/project-brief.test.ts lib/server/ai-pipeline.test.ts lib/firebase-functions-secret-bindings.test.ts lib/server/geocode-candidate-picker.test.ts
```

Provider contract: [TypeSafe HTTP API](https://docs.typesafe.ai/api). Noul questions
return a score from 0 to 1; callers validate every expected answer at runtime.

## Opt-in live evaluation

With `TYPESAFE_API_KEY` set in the current process, run:

```powershell
npm.cmd run test:jev-brief-eval
```

This makes ten sequential metered calls with synthetic data through the actual
checker and its 1,500 ms deadline. It covers supported dimensions, cost estimates,
uncertainty and permit benchmarks; contradictory dimensions, invented utility
facts, approval guarantees, certainty upgrades, mixed statements, and embedded
instructions. The suite is skipped during normal tests. A provider error, timeout,
uncertain answer or wrong classification fails the relevant case. Logs contain
case identifiers and aggregate outcomes only.

Passing this small set is a smoke check, not a representative accuracy estimate.

### Initial live result — September 28, 2026

The first run matched 9 of 10 labels: the cost estimate was marked uncertain.
The checker received `costLow` and `costHigh` without their units or meaning.
Adding their construction-cost meaning and US-dollar units from the calculation
contract resolved that case without changing either threshold or any test label.
The second run matched all 10 labels, with observed review durations of 92–228 ms.
Both runs used synthetic inputs and the existing server credential, held only in
process memory. No production flag was changed.

This set was used to refine the prompt and is therefore a regression set.
Broader, independent examples and the processing disclosure remain necessary
before activation; these results do not establish production accuracy or latency.
