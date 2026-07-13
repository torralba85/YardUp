# LotFoundry Completion Register

Last audited: 2026-07-13

This file is the top-level completion and backlog register for LotFoundry. It
separates shipped work, AI-agent-manageable work, human-required launch tasks,
and later product bets. Keep detailed specs in `docs/`; keep this file short
enough to scan during maintainer passes.

## Current Assessment

LotFoundry is app-complete for a production web/PWA beta: the core owner studio,
live parcel/address paths, demo mode, feasibility engine, report/certificate
flows, auth, saved scenarios, builder marketplace, Stripe routes, AI routes, and
Firebase deployment wiring are all present, and the deployed `origin/master`
baseline is green.

It is not launch-complete. The current product still lacks a full member settings
destination, shared account/help/legal navigation, About/Help/Feedback routes, a
Google Play-compliant web deletion resource, current legal disclosures, Sign in
with Apple, store-compliant native billing, native packages, and accepted store
listings. Stripe live-mode checks, Firebase smoke credentials, production domain
decisions, signing work, and real builder-network operations also need human
console access or business decisions.

Latest verification in this audit:

- Remote release truth: `origin/master` at `27197f1`; GitHub run `29243888968`
  passed lint, Vitest, typecheck, build, Playwright, Firebase dry-run, Hosting +
  Firestore deployment, and Functions deployment.
- GitHub: default branch `master`; no open issues and no open pull requests.
- Live HTTP smoke: `/`, `/studio`, `/privacy`, and `/terms` return 200;
  `/about`, `/help`, and `/delete-account` return 404.
- Local checkout is not a release baseline: it is 17 commits behind
  `origin/master`, has 35 modified tracked files plus untracked `.grok/`, and
  `git diff --check` reports two trailing-space errors in the uncommitted
  `firestore.rules` edit.
- Local lint, unit tests, and typecheck were unavailable because `node_modules`
  is absent. Use a clean worktree and `npm ci` before local verification.

## Planning Authority

`TODOS.md` and
`docs/superpowers/plans/2026-07-13-launch-completion-program.md` are the active
launch sources. Older dated plans are implementation/design history; unchecked
boxes in those files do not reopen work already present on `master`.

“100% complete” means all tasks in the active launch plan are verified, no P0/P1
issues remain, the full web/native release gates pass, Firebase production is
healthy, and both store listings are actually available to users.

## Done / Shipped

- Brand and design system: LotFoundry identity, warm field-book palette, font
  trio, money scale, pill-radius rules, landing hero, and store coming-soon
  banner are implemented.
- Core owner flow: landing address handoff, `/studio`, demo presets, live parcel
  search, estimated parcels, aerial fallback, 3D parcel scene, ADU placement,
  feasibility metrics, rent scenarios, and guided desktop/mobile spine are live.
- Feasibility and reporting: deterministic calculations, verdict logic,
  constraints panel, permit guide, report preview, share link, HTML download,
  CSV export, and certificate purchase route are implemented.
- Auth and persistence: login, signup, forgot password, Google sign-in,
  role-aware redirects, saved scenarios, live parcel restore, and in-app account
  deletion are implemented.
- AI backend: server-only OpenAI client, authenticated/rate-limited AI parcel
  insights, ADU concept generation route, gallery-integrated style-match
  requests, and friendly setup/error handling are present.
- AI upload/privacy groundwork: HEIC/HEIF acceptance, downscale to a 2048px max
  edge, JPEG re-encode, EXIF/GPS stripping, preview-confirm, generation states,
  before/after board, and gallery insertion plumbing exist.
- Builder marketplace V1/V2: builder dashboard, inbox, profile/service areas,
  redacted lead previews, unlock slip, locked/confirming/unlocked card states,
  triage tabs, empty states, money band, credit balance, bulk credit checkout,
  credit unlock API, and Firestore redaction rules are implemented.
- Payments backend: Stripe checkout routes for lead unlocks, certificates, and
  credit packs; webhook grant handling; idempotent server grants; Firebase
  Function secret binding; and demo unlock path are implemented.
- PWA/store groundwork: manifest, icons, service worker/offline page,
  `public/.well-known/assetlinks.json`, privacy policy, terms, and draft store
  listing/privacy-copy docs exist.
- Deployment: Firebase Hosting + Functions + Firestore rules path is configured;
  CI verifies and deploys `master`; `apiAi`, `apiStripe`, and generic `api`
  rewrites are separated.

## To Complete - AI-Agent Manageable

P0 - short, high-confidence fixes:

- Build `/settings` and one shared account menu for owner desktop/mobile and
  builder surfaces: profile, email/security, builder details, data export,
  Help, Feedback, Terms & Conditions, Privacy, sign-out, and account deletion.
- Add `/about`, `/help`, `/feedback`, and `/delete-account`; replace duplicated
  footers with shared navigation and add branded 404/error, robots, and sitemap
  routes.
- Update Privacy and Terms to match Firebase Hosting/Auth/Firestore/Functions,
  Regrid, Google, OpenAI, Stripe, AI-photo processing, marketplace sharing,
  store billing, and the approved deletion/retention policy. Add explicit AI
  photo-sharing consent.
- Complete account deletion across account-associated PII while retaining only
  approved non-PII accounting/fraud records; add authenticated account export.
- Add Sign in with Apple and show Terms & Conditions + Privacy on every
  account-creation path.
- Introduce purchase-channel routing and server verification: Stripe on web,
  StoreKit on iOS, and Play Billing on Android. Native digital purchase grants
  must be idempotent and must not trust client-supplied values.
- ~~Reconcile the older `AIStyleMatchPanel` in `ConstraintsPanel` with the newer
  gallery-integrated `StyleMatchPanel`.~~ ✅ Retired 2026-07-08 — `AIStyleMatchPanel`
  deleted; style-match now lives only on the Design step via `StyleMatchPanel` inside
  `InspirationGalleryPanel`.
- Keep `docs/store-deployment-readiness.md` and `docs/store-listing-copy.md`
  current as store assets and cloud settings change.
- Add focused Playwright coverage for the live `/api/suggest` production path
  and the local address-search fallback state.

P1 - release-hardening tasks an agent can prepare:

- Generate and test the Android Trusted Web Activity and iOS native wrapper;
  add native share/photo/offline-certificate value on iOS for App Review 4.2.
- Add Android/iOS sandbox purchase, restore, refund/revocation, and account-
  deletion E2E coverage before internal-track/TestFlight promotion.
- Add manifest `screenshots` entries once final mobile/tablet/desktop store
  screenshots are captured and checked into `public/`.
- Replace the placeholder Play signing fingerprint in
  `public/.well-known/assetlinks.json` after the human supplies the real
  SHA-256.
- Add or extend e2e coverage for certificate purchase return, builder lead
  unlock return, bulk credit purchase return, and credit unlock reveal.
- Add a dashboard billing-ledger surface if the current right-rail purchase
  widget is not enough for launch support workflows.
- Add a "Report this lead" action and bad-lead credit record UI once the
  support policy is finalized.
- Add real-device screenshot capture scripts or docs for iPhone, iPad, Pixel,
  and Android tablet store assets.
- Run an agency-bar visual QA sweep against `DESIGN.md` for landing, studio,
  builder, auth, certificate/report, and mobile breakpoints; file issues for
  any typography, radius, or semantic-color drift.
- Honor parcel query and address handoff on mobile/tablet studio entry so the
  first visible state includes the selected lot and a money figure, not the
  generic onboarding plate.
- Expand auth secondary links and footer links to 44px tap targets while
  preserving the compact Golden Hour auth layout.
- Audit shared studio controls and tabs for 44px interaction targets; keep
  read-only data chips compact per the pill-radius system.

P2 - larger agent work that needs a focused branch:

- Implement 48-hour head-start enforcement and countdown display for paid lead
  unlocks if this remains part of the launch business model.
- Persist selected AI-generated concepts into saved scenarios and optionally
  attach them to certificates/reports.
- Add OpenAI prompt/eval fixtures for common home styles and failure cases.
- Add Firestore/Storage rules and deployment wiring only if future AI photo or
  render persistence is introduced. Current code treats uploaded photos as
  transient.
- Move homeowner lead matching from client-side `matchedBuilderIds` computation
  to a server endpoint before marketplace scale or routing abuse becomes likely.

## To Complete - Human Required

- Confirm production domain strategy and set `NEXT_PUBLIC_APP_URL` to the final
  canonical URL if it should not remain `https://yardup-2026.web.app`.
- Verify in Google Cloud Console that the browser Places key behind
  `NEXT_PUBLIC_GOOGLE_PLACES_KEY` is the intended restricted key and that the
  server key has Maps Static, Geocoding, and Places access without an invalid
  referrer restriction.
- Verify Stripe Dashboard setup: live/test webhook endpoint points at
  `/api/stripe/webhook`, event `checkout.session.completed` is enabled, signing
  secret matches `STRIPE_WEBHOOK_SECRET`, and one live/test checkout succeeds
  for certificate, lead unlock, and credit-pack flows.
- Run `FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm
  run smoke:firebase` with a dedicated smoke user against `yardup-2026`.
- Provision Apple Developer/App Store Connect and Play Console organization,
  tax, banking, signing, Sign in with Apple, StoreKit, and Play Billing access.
- Generate signing keys and the Play signing SHA-256, upload release candidates,
  provide reviewer credentials, and complete App Store / Play Console reviews.
- Capture real-device screenshots and export store graphics: iPhone, iPad,
  Android phone, Android tablet, 1024x1024 App Store icon, 512x512 Play icon,
  and 1024x500 Play feature graphic.
- Fill App Store privacy labels and Google Play Data Safety forms using
  `docs/store-listing-copy.md`; confirm whether Stripe-collected card data is
  declared as payment info.
- Enter `/help` as the support URL and `/delete-account` as the Google Play data
  deletion URL; verify both are live before submission.
- Decide retention policy for marketplace `connectionRequests` PII after a
  builder has paid to unlock a lead. Account deletion intentionally retains
  shared business records today.
- Build the real builder network: onboarding, coverage areas, lead response
  operations, refund/credit support process, and support inbox ownership.
- Complete legal/compliance review for financial estimates, AI-generated
  concepts, lead resale/refunds, privacy disclosures, and store claims.

## Future Features / Scale Triggers

- Lead inbox table + certificate-pane view. Trigger: builders regularly see
  10+ leads/week and card scanning becomes inefficient.
- Inbox read denormalization. Trigger: lead volume makes the current per-lead
  fan-out expensive or visibly slow.
- Server-side builder matching. Trigger: matching-quality work begins or any
  routing-abuse signal appears.
- Builder CRM loop: saved notes, follow-up reminders, win/loss tracking,
  credits/refunds, and pipeline analytics.
- Owner-side comparison workspace: multiple saved ADU concepts per parcel,
  side-by-side finances, and report versioning.
- More jurisdiction-specific zoning: per-city rules, utility constraints,
  parking overlays, owner-occupancy flags, and permit checklist data.
- Financing model: interest rates, loan scenarios, tax assumptions, reserve
  assumptions, and sensitivity analysis.
- Full calculation provenance: explain every number with source, timestamp,
  formula, and confidence if this becomes a headline trust feature.
- Solar/daylight, privacy, view-mode, and aerial polish in the 3D/2D scene.
- Native app value-add after wrapper launch: push reminders, offline saved
  scenarios, camera-native photo capture, and store-specific onboarding.
