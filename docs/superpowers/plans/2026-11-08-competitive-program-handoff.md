# Competitive improvement program: handoff plan

Written 2026-11-08 for the next agent. It continues the program in the brief "LotFoundry Competitive Advantage & Product Improvement" (competitor reference: a-du.homes).

Read these first:
- `docs/competitive-improvement-audit-2026-11-08.md`: the requirement audit and evidence so far.
- `CLAUDE.md`: commands, design rules and guardrails.
- `docs/preapproved-plans.md`: the plan catalog contract.
- `docs/analytics-measurement-spec.md`: the event contract.

## State at handoff

- **PR #385** (`ccr-e416d461-910wey`, draft) is green in CI, merges cleanly and has no reviews. It is not merged and not deployed. It contains:
  - official pre-approved plans on six city guides (`components/adu/AduPreapprovedPlans.tsx`)
  - a corrected Carlsbad guide (it wrongly called the plans "unavailable")
  - the `preapproved_plan_selected` analytics event
  - a "See a sample certificate" link at the $29 paywall
  - the audit document
- **Audited in code with no defect found:** guest address onboarding and error recovery, demo labelling, parcel context through auth and checkout, purchase analytics only after a verified grant, HUD and cost provenance labels, and the consent-based builder handoff (`BuilderLeadPanel`).
- **Never verified.** The first session's network policy blocked lotfoundry.net and a-du.homes, and it had no GA4, Search Console or Stripe access. Everything that depends on those is listed below.

## Guardrails (non-negotiable)

- Do not change the $29 price, Stripe or Firebase architecture, `firebase.json` redirects or noindex rules, or the host logic in `proxy.ts`.
- Do not modify or merge the GreatBuildz work: PR #336, PR #337 or their branches.
- Do not invent parcel, cost, rent, approval-time or plan data. Use `needs-verification` where evidence is missing.
- Do not merge or deploy without the user's explicit ask. Push only to the branch you were assigned. Draft PRs only.
- Never claim a journey passed without execution evidence: command output, a screenshot or a test name.
- Before every push, run the release gate: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## Prerequisites to request from the user

Ask for these up front. Tasks that need a missing one become "blocked", not "assumed".

1. Network access to `lotfoundry.net`, plus `a-du.homes` for task 7. In a cloud session, propose this through the environment tools.
2. Stripe **test-mode** keys and a webhook secret for a local or preview run. Never use live keys.
3. A dedicated smoke-test Firebase user (`FIREBASE_SMOKE_EMAIL` and `FIREBASE_SMOKE_PASSWORD`). Never create accounts in production from generic CI.
4. Read access to GA4 and Search Console for the lotfoundry.net property.

## Tasks, in priority order

### 1. Production verification of the plans feature and PR #385 (P0, needs prerequisite 1 and a deploy the user approves)
- Confirm the 2026-11-06 Studio plan integration is live: desktop Design and mobile Shape, then "Pre-approved plans" → confirm authority → "Use this plan" → fit verdict → save → reload restores it.
- After #385 deploys, check each of `/adu/ca/{san-diego,san-diego-county,carlsbad,la-mesa,imperial-beach,sacramento}`:
  - the plans section renders
  - the plan links resolve
  - the Chula Vista and Oceanside guides show no plans section
- Record the results in the audit doc's section C, with dates and screenshots.
- **Done when:** every step has evidence, or a filed issue with reproduction steps.

### 2. End-to-end homeowner journeys (P0, needs prerequisites 1–3)
Run each journey on desktop and on mobile (Pixel 7 emulation):
- **Guest lookup:** a guest looks up a real supported San Diego address. The correct parcel resolves, it is not the demo lot, and the feasibility study is visible.
- **Demo exploration:** the "Demo Mode" banner is shown.
- **Unsupported or failed lookup:** use a nonsense address and an out-of-coverage address. The error message is useful, the typed address is kept, and retry works. The free guest lookup is not spent on a failure.
- **Guest to account:** account creation continues on the same parcel (`stashInitialParcel` path).
- **Certificate purchase (Stripe test mode):**
  - the grant happens exactly once
  - a cancelled checkout shows the cancel notice
  - a fresh session restores the purchase through `/certificates`
  - the webhook signature is verified
  - GA4 `purchase` fires only on a verified return
- **Builder handoff:** the consent checkbox is required and the confirmation is shown.
- Existing helpers: `e2e/*.spec.ts`, `npm run smoke:firebase`. Add a Playwright spec only where a journey has none. Keep it network-independent for CI, or tag it as manual.
- **Done when:** every journey above has pass/fail evidence in the audit doc.

### 3. Content corrections that need a source check (P1, needs web access)
- **Encinitas:** `content/adu/ca/encinitas.ts` says PRADU plans are free and that reviews take "half the standard cycle time". The catalog's 2026-11-05 evidence (`docs/preapproved-plans.md`) supports neither. Read the City's page, then correct the copy or cite it.
- **National rent baseline:** `lib/market/national-baseline.ts` and the `national` row in `lib/server/market/data/fmr.json` present a "U.S. average" HUD FMR with status `observed`. HUD does not publish a national average. Either relabel it as `derived` with a stated derivation, or source it.
  - Update both files together, as the code comment requires.
  - Add a test.
  - Do not change the rent value without a source.
- **Done when:** the claims are sourced or removed, `content/adu/freshness.test.ts` passes, and the dates are recorded.

### 4. Measurement baseline (P0 instrumentation, P2 optimization; needs prerequisite 4)
- In GA4, register `jurisdiction_id`, `plan_id` and `placement_outcome` as custom dimensions. Ask the user before changing GA4 config.
- Use GA4 DebugView to confirm every event in `docs/analytics-measurement-spec.md` fires once, carries no PII, and respects consent.
- Reconcile the spec's implementation checklist, which is currently all unchecked.
- Report what can be measured today:
  - the primary KPI: real-property explorations that reach account creation
  - Certificate purchases per eligible study
  - completed checkout rate
  - builder connections
  - non-branded organic sessions
- Also report the consent opt-in rate, because every count undercounts by that factor.
- Do not claim significance from small samples. Mark gaps as gaps, never as zero.
- **Done when:** the audit doc's section D holds real numbers with date ranges, or explicit "not measurable" reasons.

### 5. SEO pass on existing pages (P1/P2, needs prerequisite 4 for Search Console)
- Pull Search Console queries and pages for `/adu/**`. Prioritize pages with high impressions and low CTR (striking distance) for title and description fixes.
- Internal links:
  - from `/adu/ca`, the cost guides and the rent guide to the city guides that now show official plans
  - from those guides to the Studio address CTA, which already exists
- Structured data only where the page content supports it. Validate any new JSON-LD with a unit test, matching the existing pattern in `components/adu/*.test.tsx`.
- Preserve canonical, preview-noindex, sitemap and `proxy.ts` behavior: `canonical-domain.test.ts`, `proxy.test.ts` and `app/sitemap.test.ts` must pass.
- No new location pages unless they add verified primary-source content.

### 6. Studio interaction audit (P1; brief §3.2, not yet done)
- Measure the initial Studio load (Lighthouse or Playwright tracing on the production build) on desktop and mobile. Record the numbers before changing anything.
- Check:
  - touch placement and drag on mobile
  - keyboard placement (arrow keys)
  - `prefers-reduced-motion`
  - behavior when WebGL is unavailable (launch Chromium with `--disable-gpu --disable-webgl`): an accessible 2D or aerial fallback must appear
  - incomplete parcel data (an unknown footprint shows the caveat, not a verdict)
  - warning repetition
- Fix only friction you have validated. No renderer or framework changes.

### 7. Factual competitor comparison (P2, needs prerequisite 1 for a-du.homes)
- Record what a-du.homes publicly offers, with dated observations: catalog breadth, address flow, pricing visibility, pre-approved plan claims.
- Do not copy text, data or design assets. Do not assert deficiencies you cannot show.
- Update the audit doc's matrix (section A) with "already ahead / improved / out of scope". Propose public comparison content only if it is factual and useful.

### 8. Housekeeping
- Add a short note to `docs/preapproved-plans.md` that city guides now render curated plans through `guidePlanCatalog`.
- Keep `CLAUDE.md` and `AGENTS.md` in sync if you change either.
- Ask the user whether to split PR #385 into separate PRs, one per commit.
- **Shared memory:** the user's Obsidian vault is on their Windows machine. On a machine that can reach it, add a dated entry to `wiki/log.md` summarizing PR #385 and this plan, following the vault protocol in `CLAUDE.md`. Cloud sessions cannot reach it; say so rather than claim a save.

## Out of scope unless the user approves

- True L-shaped massing for irregular plans. It is the documented follow-up in `docs/preapproved-plans.md`, but it touches rendering, placement, persistence and Firestore rules.
- A standalone public plan directory.
- The GreatBuildz partner referral, which needs a business decision.
- Any paid API, pricing change or new dependency.

## Reporting format for the next agent

For each task, report:
- the branch and PR URL
- the files changed
- the tests and commands run, with pass/fail
- the evidence: screenshots or logs
- deployment prerequisites
- remaining risks

Distinguish planned, implemented, tested, merged, deployed and live-verified.
