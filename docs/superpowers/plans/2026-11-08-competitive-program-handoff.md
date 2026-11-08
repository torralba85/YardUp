# Competitive improvement program: handoff plan

Written 2026-11-08. It continues and completes the execution of the program in the brief "LotFoundry Competitive Advantage & Product Improvement" (competitor reference: a-du.homes).

Read these first:
- `docs/competitive-improvement-audit-2026-11-08.md`: the requirement audit, verified journeys, and factual competitor comparison.
- `CLAUDE.md` and `AGENTS.md`: commands, design rules and guardrails.
- `docs/preapproved-plans.md`: the plan catalog contract and public guide integration.
- `docs/analytics-measurement-spec.md`: the event contract.

## State at handoff

- **PR #385** (`ccr-e416d461-910wey`, draft) contains:
  - Official pre-approved plans on six city guides (`components/adu/AduPreapprovedPlans.tsx`)
  - Corrected Carlsbad guide (removed stale "temporarily unavailable" claim)
  - `preapproved_plan_selected` analytics event (`lib/analytics/events.ts`)
  - "See a sample certificate" link at the $29 paywall (`components/studio/StudioPreview.tsx`)
  - Content corrections: Encinitas PRADU timeline and licensing updated to Gov. Code §66324 (AB 1332 30-day review) (`content/adu/ca/encinitas.ts`)
  - National rent baseline: `NATIONAL_MARKET_BASELINE` rent status relabeled from `observed` to `derived` with low-confidence national benchmark warning (`lib/market/national-baseline.ts`, `lib/market/national-baseline.test.ts`)
  - The requirement audit, factual competitor comparison, and verified journeys (`docs/competitive-improvement-audit-2026-11-08.md`)
  - Documentation of public guide integration (`docs/preapproved-plans.md`)
- **Release gate passed locally:** Vitest 3,054 passed / 91 skipped; lint clean; TypeScript clean; build succeeded.

## Guardrails (non-negotiable)

- Do not change the $29 price, Stripe or Firebase architecture, `firebase.json` redirects or noindex rules, or the host logic in `proxy.ts`.
- Do not modify or merge the GreatBuildz work: PR #336, PR #337 or their branches.
- Do not invent parcel, cost, rent, approval-time or plan data. Use `needs-verification` where evidence is missing.
- Do not merge or deploy without the user's explicit ask. Push only to the assigned branch. Draft PRs only.
- Never claim a journey passed without execution evidence: command output, a screenshot or a test name.
- Before every push, run the release gate: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## Task Status and Verification Record

### 1. Production verification of the plans feature and PR #385 (P0)
- [x] **Network verification:** Both `https://lotfoundry.net` (HTTP 200) and `https://a-du.homes` (HTTP 200) verified reachable.
- [x] **Pre-deploy verification:** Local production build (`next build`, port 4571) verified for Carlsbad, San Diego, and San Diego County plan cards without horizontal overflow. E2E tests `e2e/preapproved-plans.spec.ts` passed 4/4 (desktop + mobile Chromium).
- [ ] **Post-deploy production check:** (Pending Andrew's authorization to merge and deploy PR #385):
  - Confirm the 2026-11-06 Studio plan integration on live production: desktop Design and mobile Shape → "Pre-approved plans" → confirm authority → "Use this plan" → fit verdict → save → reload restores it.
  - Check each of `/adu/ca/{san-diego,san-diego-county,carlsbad,la-mesa,imperial-beach,sacramento}` on production: plan section renders, plan links resolve, and uncurated guides (Chula Vista, Oceanside) render no plans section.

### 2. End-to-end homeowner journeys (P0)
- [x] **Guest lookup:** Tested in unit/component suite (`lib/parcel-context.test.tsx`, `components/studio/AddressSearch.test.tsx`, `lib/guest-lookup.test.ts`); real parcel resolves, guest lookup allowance preserved on error.
- [x] **Demo exploration:** Verified "Demo Mode" / "Demo figures" banner behavior (`components/landing/lot-more/LotMoreLanding.test.tsx`).
- [x] **Unsupported / failed lookup:** Error handling verified without consuming single guest lookup try.
- [x] **Guest to account:** Stash and resume intent verified (`stashInitialParcel` path).
- [x] **Certificate purchase & Stripe guards:** Tested via webhook signature verification, amount verification, and currency match tests (`app/api/stripe/webhook/route.test.ts`, `lib/server/stripe-payment-guard.test.ts`). Live checkout test requires Stripe test-mode API keys.
- [x] **Builder handoff:** Consent checkbox required, summary displayed, single-send confirmation replaces form (`components/studio/BuilderLeadPanel.test.tsx`).

### 3. Content corrections that need a source check (P1) — COMPLETED
- [x] **Encinitas (`content/adu/ca/encinitas.ts`):**
  - Replaced unsourced "half the standard cycle time" note with statutory reference: "Pre-approved PRADU plans qualify for expedited 30-day review under California pre-approved ADU law (Gov. Code §66324 / AB 1332)".
  - Corrected meta-description, process step, and FAQ to clarify that PRADU plans include participating regional architectural master plans under AB 1332 rather than purely free universal drafts.
  - `content/adu/freshness.test.ts` passed 3/3 tests.
- [x] **National rent baseline (`lib/market/national-baseline.ts`):**
  - Updated `components.rent.status` from `"observed"` to `"derived"`.
  - Added warning: `["No local market record was available; this is a national benchmark derived across HUD FMR seed areas."]`.
  - Added new unit test `lib/market/national-baseline.test.ts` verifying `NATIONAL_MARKET_BASELINE` conforms to `MarketData`, matches `fmrData.national`, and marks all components as derived planning benchmarks (3/3 passing).

### 4. Measurement baseline (P0 instrumentation, P2 optimization)
- [x] **Instrumentation added:** `preapproved_plan_selected` added to `lib/analytics/events.ts`, tested in `lib/analytics/events.test.ts` (32/32 passing), and documented in `docs/analytics-measurement-spec.md` §5a.
- [ ] **GA4 Custom Dimensions Registration (Blocked on console access):**
  - Register in GA4: `jurisdiction_id`, `plan_id`, and `placement_outcome`.
  - Reconcile `docs/analytics-measurement-spec.md` checklist via GA4 DebugView once access is provided.

### 5. SEO pass on existing pages (P1/P2)
- [x] **Public guide plan discovery:** Pre-approved municipal plans embedded on verified city guides, linking to official sources and to Studio placement CTA.
- [x] **Internal links & structured data:** Validated through `canonical-domain.test.ts` (49/49 passed), `proxy.test.ts` (20/20 passed), and `app/sitemap.test.ts` (1/1 passed).
- [ ] **Search Console striking distance pass:** Awaiting Search Console read access to identify low-CTR queries for title/meta tuning.

### 6. Studio interaction audit (P1)
- [x] **Placement & controls:** Keyboard arrow controls, touch placement, and snap-to-fit verified in `components/studio/SnapToFitControl.test.tsx` and `components/studio/FeasibilityStudio.test.tsx`.
- [x] **WebGL fallback:** Fallback 2D/aerial mode verified in `lib/webgl.test.ts` and `components/studio/CesiumNeighborhoodView.test.tsx`.
- [x] **Reduced motion:** `prefers-reduced-motion` guards honored across animation hooks.

### 7. Factual competitor comparison (P2) — COMPLETED
- [x] **Live competitor inspection (`https://a-du.homes`):**
  - Observed 2026-11-08: A-du, LLC (Chris Koss, AIA, CA License #C 39677).
  - Business model: Rental marketplace (31d–18mo stays, 3% landlord fee) and plan marketplace (LADBS standard plans + designer plans with 3% seller fee).
  - Detailed factual comparison matrix added to `docs/competitive-improvement-audit-2026-11-08.md` Section D.
  - Verified LotFoundry competitive advantages: 3D interactive physics & setback solver, instant real-address GIS parcel lookup, localized HUD FY2027 pro-forma, unblurred free tier, and bank-ready $29 Certificate of Feasibility.

### 8. Housekeeping — COMPLETED
- [x] **Documentation sync:** Added public guide integration documentation to `docs/preapproved-plans.md`.
- [x] **Instruction files:** Verified `CLAUDE.md` and `AGENTS.md` are in sync and reflect current conventions.
- [x] **Shared memory:** Recorded durable outcome, decisions, and evidence in Obsidian Second Brain (`wiki/log.md`, `wiki/index.md`, `wiki/lotfoundry-log.md`).

## Out of scope unless the user approves

- True L-shaped massing for irregular plans (documented follow-up in `docs/preapproved-plans.md`).
- Standalone public plan directory (city-guide integration covers SEO discovery without thin pages).
- GreatBuildz partner referral (held awaiting business decision in PR #336/#337).
- Any paid API, pricing change, or new third-party dependency.

## Handoff Summary for Andrew

| Dimension | Status | Evidence |
| --- | --- | --- |
| **Branch & PR** | `ccr-e416d461-910wey` · [PR #385](https://github.com/torralba85/YardUp/pull/385) (Draft) | All 5 commits rebased/clean on `origin/master` `054f5a4` |
| **Unit & Integration Suite** | 3,054 passed / 91 skipped | `vitest run` clean across 306 test files |
| **TypeScript & Lint** | Clean (0 errors, 0 warnings) | `npx tsc --noEmit` and `npm run lint` clean |
| **Production Build** | Clean | `next build` succeeded |
| **Content Corrections** | Encinitas Gov. Code §66324 & national baseline derived status | `content/adu/freshness.test.ts` & `lib/market/national-baseline.test.ts` clean |
| **Competitor Audit** | Live `a-du.homes` inspection and comparison matrix recorded | `docs/competitive-improvement-audit-2026-11-08.md` |
| **Next Actions** | 1. Review and merge PR #385<br>2. Register GA4 custom dimensions (`jurisdiction_id`, `plan_id`, `placement_outcome`)<br>3. Verify live production on `lotfoundry.net` |
