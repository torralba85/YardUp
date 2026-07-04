# LotFoundry Completion Register

Last audited: 2026-07-04

This file is the top-level completion and backlog register for LotFoundry. It
separates shipped work, AI-agent-manageable work, human-required launch tasks,
and later product bets. Keep detailed specs in `docs/`; keep this file short
enough to scan during maintainer passes.

## Current Assessment

LotFoundry is app-complete for a production web/PWA beta: the core owner studio,
live parcel/address paths, demo mode, feasibility engine, report/certificate
flows, auth, saved scenarios, builder marketplace, Stripe routes, AI routes, and
Firebase deployment wiring are all present and locally healthy.

It is not fully launch-complete for store submission or paid marketplace
operations until live-service checks are complete: Stripe live-mode webhook and
checkout validation, Firebase smoke credentials, production app URL/custom
domain decisions, store wrapper/signing work, and real builder-network
operations still need human console access or business decisions.

Latest verification in this audit:

- `git status --short --branch`: `master...origin/master`, clean after build.
- GitHub: default branch `master`; no open issues; one clean docs PR (#88);
  latest `master` CI run passed.
- `git diff --check`: passed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run test`: passed, 408 tests across 82 files.
- `npm run build`: passed; 23 app routes generated, including studio, builder,
  auth/legal pages, parcel/geocode/suggest, AI, Stripe, and account-delete APIs.
- Live production smoke: `https://yardup-2026.web.app/studio` loaded, address
  input was enabled, `/api/suggest?q=1600%20Pennsylvania%20Ave` returned 200 and
  rendered suggestions. Only WebGL software-driver warnings were observed.

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

- Reconcile the older `AIStyleMatchPanel` in `ConstraintsPanel` with the newer
  gallery-integrated `StyleMatchPanel`: either retire the duplicate or make it a
  thin wrapper around the same shared generation flow.
- Keep `docs/store-deployment-readiness.md` and `docs/store-listing-copy.md`
  current as store assets and cloud settings change.
- Add focused Playwright coverage for the live `/api/suggest` production path
  and the local address-search fallback state.

P1 - release-hardening tasks an agent can prepare:

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
- Decide the native/store wrapper strategy: PWABuilder TWA + iOS wrapper versus
  Capacitor or another wrapper approach.
- Generate store packages, signing keys, Play signing SHA-256, iOS project, and
  App Store / Play Console submissions.
- Capture real-device screenshots and export store graphics: iPhone, iPad,
  Android phone, Android tablet, 1024x1024 App Store icon, 512x512 Play icon,
  and 1024x500 Play feature graphic.
- Fill App Store privacy labels and Google Play Data Safety forms using
  `docs/store-listing-copy.md`; confirm whether Stripe-collected card data is
  declared as payment info.
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
