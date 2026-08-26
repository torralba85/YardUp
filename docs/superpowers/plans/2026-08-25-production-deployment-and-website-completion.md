# LotFoundry Production Deployment and Website Completion Plan

**Date:** 2026-08-25
**Status:** Proposed - implementation has not started
**Goal:** Deploy `lotfoundry.net` as a secure, accessible, fully working LotFoundry web product, with every supported critical journey verified in production.

## Scope and definition of done

This is a web-production plan. Android and iOS store publication are separate release tracks: Android may use the same backend only after its own signed-artifact and device gates; iOS is not a prerequisite to making the website production-ready.

"100% functional" means every supported path below has a passing automated or documented manual acceptance check. It does not mean guaranteeing live third-party providers never fail.

| Supported journey | Production acceptance result |
| --- | --- |
| Landing and address handoff | Guest can either complete a bounded anonymous estimate or is clearly asked to sign in before any metered address lookup; the chosen path resumes after authentication. |
| Studio | Demo parcels work without credentials; signed-in address search, parcel load, 3D placement, feasibility math, and error/retry states work. |
| Account | Sign-up, sign-in, reset, sign-out, settings, export, and deletion work without trapping users. |
| AI | Auth, consent, input limits, provider failure states, and rate limits work; privacy text accurately names every enabled provider. |
| Marketplace | Builder data is visible only to authorized recipients; lead redaction and unlock grants are enforced server-side. |
| Web commerce | Checkout accepts only server-created orders; webhooks validate product, amount, currency, and entitlement before granting access. |
| SEO and trust | `https://lotfoundry.net` is canonical, `robots.txt`, sitemap, privacy, terms, help, and deletion pages return expected content and headers. |
| Accessibility | Keyboard users can operate every custom control; focus is visible; mobile option groups follow radio/button semantics. |

## Non-negotiable release gates

- No production deployment while plaintext judge credentials remain usable or committed in current documentation.
- No deployment of Firestore rules that expose builder contact data to all authenticated users.
- No native-store/RTDN enablement until refund/revocation policy and live secret bindings are implemented and tested.
- No merge to `master` without a clean PR, green CI, `git diff --check`, and review of the complete deployment diff.
- Do not treat a successful build, a Firebase dry run, an uploaded artifact, or a CI job as proof that production is healthy.

## Phase 0 - Establish the release baseline

- [ ] Fetch `origin`, confirm the default branch and current PR state, and create a clean production-readiness worktree from current `origin/master`.
- [ ] Compare `feature/map-quality-improvements` with current `origin/master`; split design-system work from security/release work into focused PRs.
- [ ] Reconcile `TODOS.md`, `docs/AGENTS.md`, deployment documentation, and this plan. Correct stale repository/name/version statements without rewriting incident history.
- [ ] Record exact Firebase project, Hosting target, `lotfoundry.net` custom-domain ownership, service accounts, and rollback procedure in a restricted operational handoff.

**Exit criteria:** one clean implementation branch, a known merge base, and no reliance on the legacy `yardup-2026.web.app` URL as the public canonical address.

## Phase 1 - Remove exposed credentials and establish operational access

- [ ] Disable and recreate the two published judge Firebase accounts; invalidate their current passwords before changing the repository copy.
- [ ] Remove plaintext passwords from `README.md`, `docs/devpost-submission.md`, and any other tracked content. Replace them with a time-limited reviewer-access process that does not store credentials in Git.
- [ ] Add a repository check that rejects known credential examples and other high-risk password tables, while keeping the secret scanner focused on real secret formats.
- [ ] Confirm Firebase Auth rate limits, abuse controls, support ownership, and account-recovery contact are configured outside Git.

**Tests:** public-repository check fails on a fixture containing a reviewer password; the clean repository passes; sign-in works only with newly provisioned reviewer access.

## Phase 2 - Close authorization and payment integrity gaps

- [ ] Redesign builder Firestore documents into public match data and private owner/contact data, or move builder discovery to a server-side authorized endpoint. Add emulator tests that deny cross-user list/query reads.
- [ ] Replace metadata-only Stripe fulfilment with a server-created pending-order record or immutable Stripe Price IDs. Verify product, currency, amount, purchaser identity, target entitlement, and idempotency in the webhook.
- [ ] Add negative webhook tests for altered metadata, wrong price/currency, unknown purchase type, duplicate event, and missing owner/target data.
- [ ] Decide and implement the Google Play void/refund policy. Cover unspent credits, spent credits, certificate unlocks, partial refunds, replay delivery, and support escalation.
- [ ] Bind `PLAY_RTDN_VERIFICATION_TOKEN` and all native-store secrets to `apiStore` through the deployment path. Keep native verification disabled until sandbox and RTDN tests pass.
- [ ] Move paid public data endpoints to a shared, trusted-identity rate limiter/WAF policy; do not trust raw forwarded headers as the quota identity.

**Exit criteria:** no P0/P1 authorization or entitlement finding remains; Firestore emulator and webhook/RTDN test suites pass.

## Phase 3 - Make the web experience complete and accessible

- [ ] Choose the guest funnel explicitly: bounded anonymous estimate end-to-end, or sign-in before address suggestions. Implement it consistently on landing, studio, and post-auth return.
- [ ] Replace non-operable hero SVG controls with real buttons or remove interactive semantics; add visible focus and Enter/Space behavior.
- [ ] Convert mobile ADU size and exterior-style selections to native radios or a fully implemented roving-tabindex radio pattern.
- [ ] Add auth-resolution timeout, retry, and demo/offline escape for `/studio`; preserve the existing demo-parcel contract.
- [ ] Add keyboard, focus-visible, dialog focus-return, custom-control, and failure-state Playwright coverage across landing, auth, studio, builder, and mobile widths.
- [ ] Verify every interactive target meets the project touch-target and design-token rules in `DESIGN.md`.

**Exit criteria:** all critical journeys in the definition-of-done table pass at desktop, tablet, and phone widths; no keyboard-blocking custom control remains.

## Phase 4 - Canonical domain, privacy, and browser hardening

- [ ] Configure `https://lotfoundry.net` and `https://www.lotfoundry.net` as the intended canonical hosts. Set production `NEXT_PUBLIC_APP_URL` to `https://lotfoundry.net`; verify redirects, metadata, JSON-LD, Stripe callback URLs, sitemap URLs, and email links use it.
- [ ] Fix production `robots.txt` delivery and make sitemap modification dates stable and meaningful (or omit them).
- [ ] Add CSP, HSTS at the Hosting/domain layer, `X-Content-Type-Options`, frame protection, `Referrer-Policy`, and a least-privilege `Permissions-Policy`. Validate Maps, Firebase, Stripe, OpenAI routes, and the service worker under the policy.
- [ ] Update privacy disclosures for every enabled data processor, including Firebase AI/Gemini if it remains shipped; remove dormant client AI code if it is not a supported feature.
- [ ] Re-check privacy, terms, help, support, and deletion surfaces with an authenticated and signed-out user.

**Exit criteria:** canonical-domain, robots, sitemap, legal pages, and security headers are verified from the public Internet.

## Phase 5 - Verification, staging, and release approval

- [ ] Run the clean-install automated gate: `npm ci`, `npm run repo:public-check`, `npm run lint`, `npm run test`, `npx tsc --noEmit`, `npm run build`, and `npm run test:e2e`.
- [ ] Add and run Firestore emulator rules tests, Stripe webhook tests, production-safe API rate-limit tests, and focused live-domain smoke checks.
- [ ] Build Firebase output and run `npm run deploy:dry-run` from a clean release environment with production-safe variables; do not deploy from a machine whose local URL can be baked into static output.
- [ ] Require a human owner to verify live Firebase secrets, Google Maps/Regrid restrictions, Stripe live webhook configuration, support email, privacy/legal approval, and rollback authority.
- [ ] Open a focused PR to `master`; require green CI, security review, and no unresolved P0/P1 findings before merge.

## Phase 6 - Controlled production deployment and proof

- [ ] Deploy through the protected `master` workflow after approval; capture the GitHub run, Firebase revisions, deployment timestamp, and rollback target.
- [ ] Run post-deploy smoke checks on `lotfoundry.net`: landing, auth, guest/demo studio, signed-in parcel search, save/load, export, deletion, AI configuration failure/success handling, Stripe test/live-safe webhook validation, privacy/terms/help, robots, sitemap, and headers.
- [ ] Verify analytics/error monitoring and server logs for authorization errors, rate-limit spikes, payment failures, and failed function revisions.
- [ ] Publish a short release record with tested version/commit, domain, known limitations, owner, and rollback instructions.

**Production success condition:** the live site passes all supported journeys and post-deploy checks, no P0/P1 audit findings remain, and the release owner explicitly accepts the live evidence.

## Separate mobile tracks (do not block web deployment)

- Android: reconcile store docs to v1.0.4/versionCode 5, fix TWA offline launch behavior and manifest typo, build a signed AAB in a protected release workspace, then complete internal-track device purchase/restore/refund/deletion tests.
- iOS: create a real Capacitor/Xcode application with native value beyond a web shell, privacy manifests and usage descriptions, StoreKit sandbox coverage, TestFlight device validation, and App Review evidence before any App Store submission claim.

## Manual gates requiring owner or account access

- Firebase/Auth/Secret Manager and Firestore console configuration
- Stripe Dashboard products, webhook endpoint, live-mode payment evidence, and refund policy
- Google Maps, Regrid, and OpenAI provider restrictions/billing
- DNS/custom-domain ownership and TLS configuration for `lotfoundry.net`
- Legal/privacy review, support SLA, and incident/rollback authority
- Google Play Console and Apple Developer/App Store Connect access

## Decision log

| Decision | Rationale |
| --- | --- |
| Web production is the release objective | `lotfoundry.net` is the public site; iOS does not yet exist and should not block web security remediation. |
| Native commerce remains disabled until verified | Current refund policy and RTDN binding are not production-safe. |
| `lotfoundry.net` is canonical | User confirmed it is the site; current redirect to `yardup-2026.web.app` is legacy hosting behavior to replace. |
| Audit P0/P1 work precedes design polish | Credentials, PII, and entitlement integrity create material user and business risk. |
