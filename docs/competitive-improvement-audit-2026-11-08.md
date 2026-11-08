# Competitive improvement audit — 2026-11-08

Scope: the "LotFoundry Competitive Advantage & Product Improvement" program (reference competitor: a-du.homes). Baseline `origin/master` at `054f5a4`. Work branch `ccr-e416d461-910wey`.

**Limits of this audit.** The session's network policy blocked `lotfoundry.net` and `a-du.homes` (proxy `connect_rejected`), so nothing here is production-verified and no competitor page was read. GA4, Search Console and Stripe dashboards were not reachable, so there is no measured baseline. Everything below is checked against the repository and a local production build only.

Open work that overlaps and was left alone: #336 and #337 (GreatBuildz referral, flag-gated, awaiting business approval, protected), #374 (house massing), #381 (article schema and cookie banner).

## A. Requirement audit

| Requirement | Existing implementation | Production check | Gap found | Change | Validation |
| --- | --- | --- | --- | --- | --- |
| Real-address guest onboarding | `lib/parcel-context.tsx` gives guests one keyless lookup (`lib/guest-lookup.ts`). Failed lookups keep the typed address and the current lot, show `parcelError`, and don't use up the free try. Mobile Find only advances when a real lot resolves. | Not possible | None found in code. Demo lots carry the "Demo Mode" banner (desktop) or "Demo figures" (mobile Earn). | None | Existing unit and e2e suites pass |
| Parcel context through auth and checkout | `stashInitialParcel` runs before the auth modal and checkout. The purchase intent resumes after sign-in. | Not possible | None found | None | `CertificatePanel` tests pass |
| Free vs paid disclosure | `StudioPreview` shows rent range, build cost, NOI and payback for free. Financed cash flow is locked. Exclusions are stated. | Not possible | The sample Certificate was linked only from the Studio footer, below the fold. | Link added at the paywall | Unit test |
| $29 Certificate, Stripe, entitlement | GA4 `purchase` fires only after a verified grant on a checkout return, deduplicated per opaque order id. Cancel and recovery states are handled. | Not possible | None found | None. Price and Stripe unchanged. | Existing tests pass. Live checkout not run (no Stripe access). |
| Pre-approved plans in Studio | The catalog, authority confirmation, footprint sizing, fit check, persistence and restore were all built on 2026-11-06 (`docs/preapproved-plans.md`). | Docs say "not deployed or checked on production" | None in the Studio | None | `e2e/preapproved-plans.spec.ts` 4/4 (desktop + mobile) |
| Plan discovery from public pages | City guides described programs in hand-written copy. They never showed the curated plans. | Not possible | Plans couldn't be found outside the Studio. The Carlsbad guide wrongly said its plans were "temporarily unavailable" (the catalog re-checked them on 2026-11-05). | `AduPreapprovedPlans` on guides with a verified program and curated plans (San Diego, unincorporated SD County, Carlsbad, La Mesa, Imperial Beach, Sacramento). Carlsbad copy corrected. | Unit tests, including a guard that fails if any such guide calls its plans unavailable. Browser check on desktop + mobile, no overflow. |
| Funnel analytics | `lib/analytics/events.ts` covers studio_opened, address_search_submitted, parcel_lookup_completed (success, fallback and error), feasibility_result_viewed, adu_design_committed, auth and sign_up, certificate paywall, checkout started/redirected/cancelled, verified `purchase`, builder_connection_submitted. All are consent-gated and carry no PII. | Not possible | No event for official-plan selection | `preapproved_plan_selected` added | Unit + Studio integration tests |
| Cost and rent provenance | California counties use FY2027 HUD FMR (`content/adu/ca/rent.ts`, `fmr.json` `californiaCountiesAsOf`). Non-CA seed rows are labelled FY2026. Cost factors are marked "Curated regional factor; verify against current local bids". | n/a | No mislabelled vintage found. HUD is never labelled as observed ADU rent. | None. Formulas unchanged. | — |
| Professional handoff | `BuilderLeadPanel` already has explicit consent, lists exactly what is shared, discloses that builders pay to unlock, and points to the CSLB license check. The ledger is `lib/server/lead-unlocks.ts`. | n/a | Satisfied. The GreatBuildz partner path waits on a business decision (#336/#337). | None | — |

## B. Changes in this branch

1. `feat(adu)`: verified official pre-approved plans on city guides, plus the Carlsbad stale-claim fix.
2. `feat(analytics)`: `preapproved_plan_selected` event, documented in `docs/analytics-measurement-spec.md` §5a.
3. `feat(certificate)`: sample-certificate link at the paywall.

No Firestore rules, Stripe, pricing, Firebase hosting or `proxy.ts` changes. Deploying the app is enough. No migration is needed.

## C. Verified journeys (local production build, port 4571)

| Journey | Result |
| --- | --- |
| Official plan selection and placement (desktop + mobile) | Passed: `e2e/preapproved-plans.spec.ts` 4/4 |
| City guide plan discovery (desktop + mobile) | Passed: 4 Carlsbad cards render, no horizontal overflow. Screenshots: [desktop](verification/city-guide-plans-desktop.png), [mobile](verification/city-guide-plans-mobile.png) |
| Mobile/desktop guest address lookup, demo exploration, account creation, error recovery | Not executed against live parcel services. Covered only by the existing unit suite. |
| Certificate purchase and restoration | Not executed. Needs Stripe test credentials. |
| Professional handoff | Existing flow; not re-run |

Release gate: `npm run lint` passed; `npm run test` 3,051 passed / 91 skipped; `npx tsc --noEmit` clean; `npm run build` succeeded.

## D. Measurement baseline

No metrics were available to this session. Gaps to close before reading any funnel:
- Confirm `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set in production and that the consent opt-in rate is known. Events fire only after opt-in, so raw counts undercount every step.
- Register `jurisdiction_id`, `plan_id` and `placement_outcome` as GA4 custom dimensions.
- The implementation checklist in `docs/analytics-measurement-spec.md` is still all unchecked, though most events are implemented. Reconcile it against GA4 DebugView before using it as a status record.
- Organic and paid separation depends on GA4 channel grouping and the existing `lib/analytics/entry-source.ts`. Not verified.

## E. Remaining opportunities (evidence-backed only)

- **Confirmed:** `docs/preapproved-plans.md` records the plan integration as not deployed or checked on production. Verify it after the next deploy.
- **Confirmed, needs a source check:** `content/adu/ca/encinitas.ts` says PRADU plans "typically complete initial plan-check reviews in half the standard cycle time" and describes the plans as free. The catalog evidence (2026-11-05) supports neither. Re-verify against the City's page, then correct or cite.
- **Confirmed, needs data:** `lib/market/national-baseline.ts` gives a "U.S. average" HUD FMR with status `observed`. HUD publishes area FMRs, not a national average. Relabel it as derived, or cite the derivation.
- **Idea:** true L-shaped massing for irregular plans. This is already listed as the follow-up in `docs/preapproved-plans.md`.
- **Idea:** a public plan directory page. Deferred. The city-guide sections now cover discovery without adding thin pages.
