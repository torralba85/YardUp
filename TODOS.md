# LotFoundry Completion Register

Last audited: 2026-09-06

This file is the top-level completion and backlog register for LotFoundry. It
separates shipped work, AI-agent-manageable work, human-required launch tasks,
and later product bets. Keep detailed specs in `docs/`; keep this file short
enough to scan during maintainer passes.

## Current Assessment

LotFoundry is app-complete for a production web/PWA beta: the owner studio, live
parcel/address paths, demo mode, feasibility engine, report/certificate flows,
auth, saved scenarios, builder marketplace, Stripe routes, AI routes, account
settings, data export, support, legal, feedback, deletion, and Firebase deployment
wiring are present. Purchase routing is also in place for web Stripe, iOS StoreKit,
and Android Play Billing, with server-side verification for native grants.

It is not launch-complete. The blocking item is Play Billing verification: no
`GOOGLE_PLAY_*` or `APPLE_*` secret exists and `ENABLE_NATIVE_STORE_VERIFICATION`
is unset, so an Android purchase is charged and never granted. Stripe live-mode
checks, Firebase smoke credentials, Apple and Google console configuration,
signing, native sandbox validation, store submission, legal review, and real
builder-network operations also still need human access or business decisions.

Latest verification in this audit:

- Repository truth: `origin/master` reached `15e1f59` after PRs #177, #181, and
  #182. GitHub run `34049202784` passed `verify` and deployed Hosting, Functions,
  and Firestore rules. That run is the current release evidence.
- Live HTTP smoke against `https://lotfoundry.net` after that deploy: 200 on `/`,
  `/studio`, `/settings`, `/privacy`, `/terms`, `/help`, `/delete-account`,
  `/builder`, `/api/suggest`, `/api/geocode`, and
  `/.well-known/assetlinks.json`. Places and Geocoding returned live data rather
  than fallbacks, and the 3D studio rendered with no application console errors.
- Production domain is `lotfoundry.net`, served directly with no redirect, which
  is what the TWA requires. `yardup-2026.web.app` remains a working alias.
- Cloud Functions deployed: `app`, `api`, `apiAi`, `apiStripe`, `apiStore` - all
  gen-2 on Node 22. The six `ext-firestore-stripe-payments-*` extension functions
  still run on the deprecated Node 20 runtime; that is an extension update, not a
  code change.
- Android: a signed AAB for v1.0.7 / versionCode 8 was built by run
  `34048176925` - 1,742,113 bytes, SHA-256
  `B6D0F3AA787D70AA1497B5DEB74ECE3DC2A54B7482D8B857F00F5E51126CD43D`, signer
  verified against the trusted upload key. It has **not** been uploaded to Play.
- GitHub: default branch `master`; PR work must compare against live
  `origin/master`, not a potentially stale local `master`.
- Use a clean worktree and `npm ci` for local release verification. Do not use
  untracked tooling directories or another worktree's changes as release evidence.

## Planning Authority

`TODOS.md` and
`docs/superpowers/plans/2026-07-13-launch-completion-program.md` are the active
launch sources. Older dated plans are implementation/design history; unchecked
boxes in those files do not reopen work already present on `master`.

“100% complete” means all tasks in the active launch plan are verified, no P0/P1
issues remain, the full web/native release gates pass, Firebase production is
healthy, and both store listings are actually available to users.

## Done / Shipped

- Brand and design system: the A LOT MORE system (chalk `#F5F5F0`, carbon
  `#161616`, signal orange `#FF5B24`, Space Grotesk + Manrope, square surfaces,
  3px controls, hard-offset elevation) is implemented project-wide as of #180 -
  landing, auth and consent, account, builder, Studio, and generated
  reports/certificates share the global tokens, with no legacy route-theme
  boundary. `docs/design/` is the source of truth. The retired warm field-book
  palette, font trio, and pill-radius rules live in `docs/design/archive/` and
  must not be applied to new work.
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
  requests, friendly setup/error handling, and GPT-5.6 Sol defaults are present.
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
  listing/privacy-copy docs exist. The generated Android TWA/Gradle project,
  Play Billing dependencies, upload-key and Play App Signing fingerprints, and
  manifest screenshots are checked in; signed binaries and signing material
  remain intentionally untracked release artifacts.
- Deployment: Firebase Hosting + Functions + Firestore rules path is configured;
  CI verifies and deploys `master`; `apiAi`, `apiStripe`, `apiStore`, and generic
  `api` rewrites are separated.
- CI hardening (#177): third-party actions pinned to immutable commit SHAs,
  `persist-credentials: false` on checkouts, least-privilege `permissions`
  blocks, and structured GitHub Issue Forms. Note that the new workflow-level
  `concurrency` group keeps only one pending run per branch, so back-to-back
  merges cancel the intermediate run - a given commit is not guaranteed its own
  deploy, only that the newest commit is deployed.
- Scenario persistence (#181): `normalizeLiveParcel` reduces an untrusted parcel
  to exactly the fields `firestore.rules` accepts, and the rules dropped the
  redundant `hasAll()` clauses that pushed a fully populated parcel past
  Firestore's hard ceiling of 1000 evaluated expressions per request. Saving a
  scenario with a complete live parcel previously failed with permission-denied
  in production.

## To Complete - AI-Agent Manageable

P0 - short, high-confidence fixes:

- ~~Build `/settings` and one shared account menu for owner desktop/mobile and
  builder surfaces: profile, email/security, builder details, data export,
  Help, Feedback, Terms & Conditions, Privacy, sign-out, and account
  deletion.~~ ✅ 2026-07-15 — `/settings` + `AccountMenu` shared across
  StudioShell, MobileHeader, and BuilderDashboard.
- ~~Add `/about`, `/help`, `/feedback`, and `/delete-account`; replace
  duplicated footers with shared navigation and add branded 404/error, robots,
  and sitemap routes.~~ ✅ 2026-07-15 — all routes live with `SiteFooter` /
  `LegalPageShell`; `/api/feedback` intake with honeypot + rate limit;
  `e2e/site-completeness.spec.ts` covers them.
- ~~Update Privacy and Terms to match Firebase Hosting/Auth/Firestore/Functions,
  Regrid, Google, OpenAI, Stripe, AI-photo processing, marketplace sharing,
  store billing, and the approved deletion/retention policy. Add explicit AI
  photo-sharing consent.~~ ✅ 2026-07-15 — rewritten (Vercel removed); AI
  photo consent checkbox gates style-match generation. Counsel review before
  store submission still required.
- ~~Complete account deletion across account-associated PII while retaining
  only approved non-PII accounting/fraud records; add authenticated account
  export.~~ ✅ 2026-07-15 — deletion tears down lead `private/contact` PII,
  retains redacted roots/ledgers, retries idempotently; `GET
  /api/account/export` + Settings export button.
- ~~Add Sign in with Apple.~~ ✅ 2026-07-16 — `signInWithApple` in
  `lib/auth-context.tsx` with Apple buttons on the auth modal, login, and
  signup surfaces (email/name scopes only). Human gate: Apple Developer +
  Firebase console configuration before the provider works in production.
  ~~Show Terms & Conditions + Privacy on every account-creation path.~~
  ✅ 2026-07-15 — AuthModal and the signup page now both disclose.
- ~~Introduce purchase-channel routing and server verification: Stripe on web,
  StoreKit on iOS, and Play Billing on Android.~~ ✅ 2026-07-16 — canonical
  products in `lib/commerce/products.ts`, channel detection + clients
  (Stripe / StoreKit bridge / Digital Goods API) in `lib/commerce/`, server
  verification with idempotent `platform:transactionId` grants via
  `POST /api/store/purchases/verify` + `lib/server/store-purchases.ts`;
  certificate and lead-unlock call sites route through the purchase client.
  Native digital purchase grants never trust client-supplied values. Human
  gate: real Apple/Google API credentials and sandbox device validation.
- ~~Reconcile the older `AIStyleMatchPanel` in `ConstraintsPanel` with the newer
  gallery-integrated `StyleMatchPanel`.~~ ✅ Retired 2026-07-08 — `AIStyleMatchPanel`
  deleted; style-match now lives only on the Design step via `StyleMatchPanel` inside
  `InspirationGalleryPanel`.
- Keep `docs/store-deployment-readiness.md` and `docs/store-listing-copy.md`
  current as store assets and cloud settings change.
- ~~Add focused Playwright coverage for the live `/api/suggest` production path
  and the local address-search fallback state.~~ ✅ 2026-07-15 —
  `e2e/address-suggest.spec.ts` covers the mocked local fallback and an opt-in
  live production smoke via `LOTFOUNDRY_E2E_LIVE_SUGGEST=1`.

P1 - release-hardening tasks an agent can prepare:

- ~~Generate and review the Android Trusted Web Activity project.~~ ✅ 2026-07-18
  — Bubblewrap/Gradle source is checked in under `native/android/`; committed
  configuration is covered by `npm run android:validate`.
- Build the iOS native wrapper and add native share/photo/offline-certificate
  value for App Review 4.2.
- Add Android/iOS sandbox purchase, restore, refund/revocation, and account-
  deletion E2E coverage before internal-track/TestFlight promotion.
- ~~Add manifest `screenshots` entries once final mobile/tablet/desktop store
  screenshots are captured and checked into `public/`.~~ ✅ 2026-07-18 — phone
  and tablet screenshots are referenced by `public/manifest.json`.
- ~~Seed upload-key and Play App Signing fingerprints in
  `public/.well-known/assetlinks.json` and TWA manifests.~~ ✅ 2026-07-18 — both
  distinct SHA-256 fingerprints are present and the validator checks parity.
- Mobile studio refresh (2026-07-17): scene chrome no longer clipped by the
  retired bottom-sheet offset; journey CTAs respect home-indicator safe area;
  journey back control is a true 44×44 target.
- Mobile form refresh (2026-07-19): landing, standalone auth, shared auth,
  builder, studio, settings, security, and feedback text controls are protected
  from iOS focus zoom; builder close/submit controls meet the 44×44 target and
  narrow navigation keeps Sign in visible. (The Blue Hour fade referenced here was
  deleted with the old landing on 2026-09-05.)
- Add or extend e2e coverage for certificate purchase return, builder lead
  unlock return, bulk credit purchase return, and credit unlock reveal.
- Add a dashboard billing-ledger surface if the current right-rail purchase
  widget is not enough for launch support workflows.
- Add a "Report this lead" action and bad-lead credit record UI once the
  support policy is finalized.
- Add real-device screenshot capture scripts or docs for iPhone, iPad, Pixel,
  and Android tablet store assets.
- Run an agency-bar visual QA sweep against `docs/design/design-system.md` for
  the landing and mobile breakpoints, and against `docs/design/product-surfaces.md`
  for studio, builder, auth, and certificate/report; file issues for any
  typography, radius, contrast, or semantic-color drift. The "still on the legacy
  palette" caveat that used to sit here was resolved by #180 - every surface is on
  A LOT MORE, so this is drift detection now, not migration.
- ~~Honor parcel query and address handoff on mobile/tablet studio entry so the
  first visible state includes the selected lot and a money figure, not the
  generic onboarding plate.~~ ✅ 2026-07-19 — address handoff already advanced
  the journey on resolution; restored/shared non-default scenario URLs now also
  open on the Earn reveal (`isNonDefaultScenario`), with mobile e2e coverage
  in `e2e/mobile-studio.spec.ts`.
- Expand remaining auth secondary links and footer links to 44px tap targets
  while preserving the compact A LOT MORE auth layout. (This item used to say
  "Golden Hour"; that system was retired 2026-09-05 and must not guide the fix.)
- Audit shared studio controls and tabs for 44px interaction targets; keep
  read-only data chips compact using the A LOT MORE radius rules - `0` for
  surfaces, `3px` for controls. (This item used to reference the retired
  pill-radius system.)
- ~~Associate every `AuthModal` field label with its input via `htmlFor`/`id`,
  then verify the modal with keyboard and screen-reader navigation.~~ ✅
  2026-07-19 — explicit label associations, focus trapping/restoration, Escape
  dismissal, and keyboard coverage are present in `AuthModal` and its tests.
- Reconcile builder-only microtype utilities with the canonical `lf-*`
  typography scale so ledger labels do not drift across inbox surfaces.
- ~~Replace remaining layout/paint-heavy landing motion with transform/opacity
  equivalents where practical, preserving the Blue Hour scroll narrative.~~
  ✅ 2026-09-05 — obsolete. The Blue Hour landing was replaced by A LOT MORE, whose
  motion is already transform/opacity only and fully reduced-motion gated.

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

- ~~Confirm production domain strategy and set `NEXT_PUBLIC_APP_URL`.~~
  ✅ 2026-09-06 - resolved. `lotfoundry.net` is the canonical domain, is the code
  default in `app/layout.tsx`, `app/robots.ts`, and `app/sitemap.ts`, and the live
  `robots.txt` and `sitemap.xml` emit it. Stripe return URLs derive from the
  request origin first, so no secret needs setting. Do not reopen this.
- **BLOCKER - Play Billing grants nothing.** No `GOOGLE_PLAY_PACKAGE_NAME`,
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `APPLE_BUNDLE_ID`, or
  `APPLE_ROOT_CA_FINGERPRINT256` exists in Secret Manager, and
  `ENABLE_NATIVE_STORE_VERIFICATION` is unset. In a TWA the purchase channel
  resolves to `google-play` with no Stripe fallback, so `PaymentRequest.show()`
  charges the card and the server verify then refuses the grant. The purchase is
  never consumed, so Play auto-refunds after three days, but the buyer receives
  nothing at the time of purchase. Provision the Play service account, set all
  four secrets (they are declared as a group, so a missing Apple one breaks the
  deploy), set the flag, redeploy, and confirm a sandbox purchase actually grants
  before opening any paid track - including internal testing. Full sequence in
  `docs/play-production-release.md`.
- Upload the signed v1.0.7 / versionCode 8 AAB to Play. versionCode 7 was
  uploaded 2026-09-06 and rejected for carrying Play Billing Library 7.1.1; code 8
  upgrades to 9.1.0. The artifact from run `34048176925` is retained 14 days -
  rebuild via the **Android release bundle** workflow if it expires.
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
- Keep signing keys secure, upload release candidates, provide reviewer
  credentials, and complete App Store / Play Console reviews and internal-track
  validation.
- Capture real-device screenshots and export final store graphics: iPhone,
  iPad, Android phone, Android tablet, 1024x1024 App Store icon, 512x512 Play
  icon, and 1024x500 Play feature graphic.
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
- Public per-jurisdiction ADU pages generated from `lib/regulations-data.ts`
  (`/adu/seattle`, `/adu/san-diego`, ...), plus an `/adu` index once several
  exist. Nine curated guides sit behind the studio today, leaving seven
  indexable URLs and no organic entry point for city-level ADU search.
  Publish `confidence: "high"` guides only, each carrying `verifiedAt`,
  citations, and the planning-instrument disclaimer. Trigger: native store
  verification live with a sandbox purchase actually granting, and counsel
  signed off on public-facing permit language. A generic HTML sitemap page
  is not wanted - `SiteFooter` already puts every public route one click
  away and `app/sitemap.ts` covers search.
- Financing model: interest rates, loan scenarios, tax assumptions, reserve
  assumptions, and sensitivity analysis.
- Full calculation provenance: explain every number with source, timestamp,
  formula, and confidence if this becomes a headline trust feature.
- Solar/daylight, privacy, view-mode, and aerial polish in the 3D/2D scene.
- Native app value-add after wrapper launch: push reminders, offline saved
  scenarios, camera-native photo capture, and store-specific onboarding.
- Kickstarter campaign submission: reword and align the campaign submission
  to strictly follow Kickstarter guidelines (framing as a finite, deliverable
  release with clear scope boundaries and no recurring operational/hosting costs).
