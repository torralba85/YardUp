# Changelog

All notable changes to LotFoundry are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The Signup Canary now fails when Google sign-in is broken, not only email
  and password. After each production deploy it checks that the Firebase
  `authDomain` resolves, that its `/__/auth/handler` and `init.json` answer 200
  over valid TLS, and that Google accepts its handler as an OAuth redirect URI
  (`npm run smoke:google-sign-in`). The 2026-10-15 Google sign-in outage would
  have turned it red.

### Changed

- Login, signup and the auth modal no longer offer Apple sign-in. The
  `apple.com` provider was never configured in Firebase Auth (it needs a paid
  Apple Developer membership), so the button could only fail. It returns when a
  build sets `NEXT_PUBLIC_APPLE_SIGN_IN=true`, and the consent and help copy
  name only the providers on offer.

### Fixed

- The Studio places a California backyard home against ADU setbacks, not the
  house's assumed zoning setbacks. Live California lots held it 20 ft from the
  rear line and 5 ft from the sides, although state law caps an ADU's side and
  rear setbacks at 4 ft (Gov. Code § 66314(d)(7)). City of San Diego lots now
  allow 0 ft side and rear at 16 ft tall or less and 4 ft above that, with a note
  to confirm the fire hazard and Coastal Zone maps. The plan view, 3D setback
  lines, placement check, verdict, certificate and AI brief share one rule
  (`lib/adu-setbacks.ts`). Lots outside California are unchanged.
- A lot-coverage limit no longer blocks a California backyard home of up to
  800 sq ft. State law bars coverage, floor-area, open-space, front-setback and
  minimum-lot-size limits that would prevent one (Gov. Code § 66321(b)(3)), but
  the Studio flagged, for example, a 600 sq ft unit beside a 2,350 sq ft house
  on a 7,297 sq ft lot as 31 sf over its assumed 40% coverage. When coverage
  leaves less than 800 sq ft, the room is now measured against 800 sq ft
  (`capacityBasis: "california-800"`). The site-fit status, verdict rows and
  certificate say so, and anything above 800 sq ft is still flagged.

### Security

- The Studio's "Email My 3D Link" route can no longer be scripted into sending
  mail from support@lotfoundry.net. Each request must carry a fresh,
  single-use App Check token (reCAPTCHA Enterprise), verified and consumed on
  the server. Each inbox gets at most 3 layout emails a day, and the address,
  city and rent-basis text printed into the email must be short single-line
  text with no links, domains or `@`. A slow Resend call now times out after
  8 s, and the email is rendered once. The privacy policy lists Resend as a
  subprocessor.

## [1.0.2] - 2026-10-12

### Added

- A California ADU cost guide at `/adu/ca/cost`, built on the existing cost engine,
  with HCD, HUD and CSLB sources, structured data and an Open Graph image (#269).
- The ADU cost calculator itemizes its budget: construction plus an 18% design and
  permits allowance (the total is unchanged), site work and financing shown as
  unpriced, quote replacements, and a free address check beside the result (#275).
- Certificate checkout analytics separate the paywall CTA, the Stripe redirect and
  Stripe cancellations (`certificate_checkout_started`, `_redirected`, `_cancelled`)
  (#265).
- Desktop and mobile end-to-end coverage of the web certificate checkout
  (`e2e/stripe-checkout.spec.ts`) (#267).
- A Jev claim check that compares each ADU guide sentence with the Regulatory Vault
  documents and produces a review queue. It runs by hand, outside CI and the
  deploy, and never edits a page (`docs/jev-guide-claim-check.md`) (#273).
- An IndexNow key and `npm run seo:indexnow` (#275).

### Fixed

- Studio entry paths share one live parcel acquisition. Reopening a saved scenario
  restores its own brief and image, and a certificate return waits up to 30 seconds
  for the grant before offering a retry. A cancelled checkout can no longer replay
  after an account or parcel change (#276).
- Paid builder purchases no longer look failed while the Stripe webhook grant is
  pending, and credit packs keep one checkout attempt id, so a double click or a
  second tab cannot open a second payable session (#267).
- Certificate checkout retries keep the verified email under the same idempotency
  key, and a malformed checkout response stays on the paywall with a retryable error
  (#270).
- Android Chrome and Custom Tabs social sign-in stays in the initiating tab (#266).
- The San Diego guide applies the 4 ft side and rear setback in High and Very High
  fire zones (SDMC §141.0302(b)(9)) and states the 16 ft height rule as IB-400 does
  (#268, #275).
- The impact-fee threshold reads "750 sq ft or less of interior livable space" on
  the California hub, the calculator and every city guide (#275).
- The Carlsbad guide and its permit steps are rewritten from IB-111 and cite
  §21.10.030 for ADU rules (#271).
- The operator's legal name is "VeriShare" in the Organization JSON-LD and
  `/llms.txt` (#277).
- The landing closing mark's arrow reads on the orange ground (#278).
- The dark address placeholder meets 7.97:1 contrast, and the password-reset success
  icon uses eligible green (#280).

### Changed

- The Play feature graphic is rebuilt in A LOT MORE (#280). The store listing
  image is uploaded separately in Play Console.
- The privacy policy names TypeSafe as a subprocessor (#272); Terms, Privacy and
  the Play declarations are aligned with TypeSafe and A LOT MORE (#279).

### Added

- A dedicated San Diego ADU cost page with size-based build estimates, county rent,
  payback, a local calculator preset, and official fee guidance. The existing guide
  now focuses on rules and links to the cost page.

### Fixed

- Google and Apple sign-in on Android no longer stop on Firebase's "missing
  initial state" page. The auth handler lived on `lotfoundry.net`, which the
  Android app claims as a verified app link, so the provider's return to
  `/__/auth/handler` could open in the app or another tab without the
  signing-in tab's session storage. Firebase Auth now uses
  `auth.lotfoundry.net`, which is same-site but unclaimed.
- Street postdirectionals such as NE remain part of the street when followed by
  a ZIP code, avoiding a false Nebraska mismatch on valid Washington addresses.
- Saved studies remain recoverable when optional AI snapshots are invalid; malformed
  parcel coordinates are rejected before geometry processing or Firestore writes.

### Changed

- Reserve Android version 1.0.14/code 15 after the code-14 production draft upload.
  This metadata change does not submit or roll out the Play draft.
- Mobile journey progress now keeps all five labels visible with at least 44px
  touch targets. Moving to another step resets scroll and focuses its named main
  region, while changes within the same step preserve scroll.
- Android launch and system-bar colors now match the A LOT MORE chalk palette.
  Version 1.0.9/code 10 is published in Play production for the United States;
  the mobile web changes require their own deployment.
- After Play accepted code 10, next-build metadata advances to version
  1.0.10/code 11 and the validator rejects reused codes through 10.
- Firebase CLI 15.29.0 preserves conditional native-store secret bindings during
  deployment. The pipeline now verifies live billing bindings before publishing
  the hosted client.
- Production deploys now push `app`, `api`, `apiAi`, and `apiStripe` as a single
  Firebase operation instead of four sequential ones, so the functions payload
  uploads once and Firebase updates them concurrently. The four have no ordering
  relationship to each other; `apiStore`, Firestore rules, and Hosting still go
  out first and in order. This cut roughly seven minutes from a nine-minute
  deploy step that was 39% of the whole pipeline.
- The deploy job pins `firebase-tools` to the same version the verify job
  already pinned. The unpinned global install let a new major reach production
  deploys with no change to this repository.
- Android release metadata advances to v1.0.8/versionCode 9 after Play accepted
  v1.0.7/versionCode 8 on the internal testing track.
- After Play accepted the code-9 upload, next-build metadata advances to
  v1.0.9/versionCode 10 to prevent accidental duplicate-code releases.
- A LOT MORE now spans login and consent, account and builder screens, desktop/mobile Studio,
  and generated certificates: chalk/carbon/orange, Space Grotesk/Manrope, square surfaces,
  readable controls, and neutral financial figures matching the landing.
- Shared landing identity, gallery-style scene lighting, updated offline/shell colors, and a
  refreshed service-worker cache bring returning visitors onto the new design.
- `docs/design/` defines the project-wide design authority; browser checks now enforce rendered
  fonts, color contrast roles, consent defaults, responsive overflow, and modal focus restoration.

### Added
- Public-release foundations: a safe environment template, evaluation license,
  documentation index, Devpost evidence guide, Android configuration validator,
  and automated public-repository hygiene check.
- Member settings destination (`/settings`): profile (name, email +
  verification state, verified email change), security (password change with
  reauthentication), builder shortcut, data export, help/feedback/legal links,
  and the danger zone (sign out, delete account).
- Shared `AccountMenu` (Settings, Get help, Send feedback, Terms & Conditions,
  Privacy, Sign out, Delete account) mounted on the studio sidebar, the mobile
  header, and the builder dashboard header — no shell is a sign-out-only dead
  end anymore.
- Public support and legal surfaces: `/about`, `/help`, `/feedback` (with
  `POST /api/feedback` intake: validation, hidden honeypot, 3/hour rate
  limit, ticket IDs), and the Google Play-compliant web deletion resource
  `/delete-account`.
- Authenticated data export: `GET /api/account/export` returns portable JSON
  (profile, saved scenarios, builder profile, redacted lead submissions,
  purchase ledger) wired to a Settings "Export my data" button.
- Branded 404 (`app/not-found.tsx`), route and global error boundaries,
  `robots.txt`, and `sitemap.xml`; `e2e/site-completeness.spec.ts` covers the
  public routes, crawl metadata, and signed-out settings/deletion states.
- Store-compliant purchase channels: canonical product IDs
  (`lib/commerce/products.ts`), purchase-channel detection (web / App Store /
  Google Play), channel-specific purchase clients (Stripe checkout, StoreKit
  bridge, Digital Goods API), and server-side receipt verification with
  idempotent `platform:transactionId` grants
  (`POST /api/store/purchases/verify`, `lib/server/store-purchases.ts`,
  `lib/server/store-receipt-verifiers.ts`). Certificate and builder
  lead-unlock call sites route through the purchase client.
- Sign in with Apple (`signInWithApple`, email/name scopes only) on the auth
  modal, login, and signup surfaces, with shared auth error mapping in
  `lib/auth-errors.ts`. Requires Apple Developer + Firebase console
  configuration before production use.
- Native shell groundwork: Bubblewrap TWA manifest (`native/android/`),
  iOS shell with the `lotfoundryStore` StoreKit bridge stub
  (`native/ios-shell/`), and `capacitor.config.ts`.
- Optional voiceover track for the Devpost demo composition (`voiceoverSrc`
  prop rendered as a Remotion `Audio` layer), fed by
  `remotion/demo/devpost-props.json`; generated narration audio stays
  untracked.

### Changed
- Authenticated OpenAI project-brief and style-match workflows now default to
  GPT-5.6 Sol while retaining the existing Responses API tool loop and
  structured-output contracts.
- Generated demo media, a duplicate brand render, and an obsolete discarded-WIP
  patch are no longer tracked; reproducible source and canonical public assets
  remain.
- Privacy Policy and Terms rewritten to match the deployed stack (Firebase
  Hosting/Auth/Firestore/Functions, Google Maps, Regrid, OpenAI, Stripe),
  including marketplace contact sharing, AI photo handling, and the
  deletion/retention policy; page label unified to "Terms & Conditions".
- Account deletion now also removes the gated `private/contact` payloads on
  the user's lead submissions, retains redacted lead roots and transaction
  ledgers per the retention rule, and treats retries as success when data is
  already gone.
- AI style-match generation is gated behind an explicit consent checkbox
  ("send this photo to OpenAI"); the auth modal and signup page both show the
  Terms & Conditions + Privacy disclosure on account creation.
- Legal/support pages share one `LegalPageShell` + `SiteFooter` (real brand
  lockup, About/Help/Feedback/Terms/Privacy/Delete-account navigation); the
  landing footer gained the same destinations in its nocturne styling.
- Studio design audit applied (see
  `docs/design-audits/2026-07-15-studio-color-ux.md`): Golden Hour money and
  status colors aligned with `DESIGN.md`, studio CTAs migrated to the shared
  `Button`, mobile touch targets expanded, and the nested certificate chrome
  in `BuilderInbox` flattened.
- Repository governance doc (`docs/repo-governance.md`) covering the issue
  priority matrix, debugging/bisect methodology, repo health routine, and
  release/changelog strategy.
- Focused Playwright coverage for the address-suggest flow
  (`e2e/address-suggest.spec.ts`): a mocked local `/api/suggest` fallback test,
  plus an opt-in production smoke gated behind `LOTFOUNDRY_E2E_LIVE_SUGGEST=1`.
- Local setup now requires Node.js 22.12 or newer within the Node 22 line,
  matching the current Vite/Vitest toolchain requirement (#151).

- Replaced the landing-page hero video with an interactive daylight ADU scene
  that deconstructs into five feasibility layers as the user scrolls.
- Added responsive layer navigation, a no-WebGL illustration fallback, and an
  explicit daylight palette regression guard.
- Retired the duplicate `AIStyleMatchPanel` from the Feasibility step;
  style-match now lives solely on the Design step (`StyleMatchPanel` inside
  `InspirationGalleryPanel`), removing a dead-end that ran a paid concept
  generation and then discarded the result.
- Expanded the studio phase-rail tap targets and replaced the wizard emoji lock
  icon per design-audit findings (FINDING-001, FINDING-002).

### Fixed
- Google and Apple sign-in in the Android app no longer stop on Firebase's
  "Unable to process request due to missing initial state" page. A popup opened
  outside the app's own tab, and Google's return to `/__/auth/handler` reopened
  in the main app window, which could not read the popup's session storage.
  Inside the app, social sign-in now redirects in place and the returning page
  finishes registration with the stashed role and consent receipt. Browsers keep
  the popup flow.
- Applying an inspiration-gallery concept now keeps the design. Four of the six
  concepts have areas outside the 400/600/800/1000 footprint option list, and the
  apply handler routed them through `configForFootprint`, which snaps an unknown
  area back to 600, then set width and length without correcting `footprint`. The
  resulting config broke the exact `width * length === footprint` equality that
  `isValidAduConfig` enforces, so the scenario URL effect hit its validity guard
  and stopped writing. The studio still rendered and priced the concept, because
  the feasibility math reads the dimensions, but a reload or a shared link
  silently reverted to the previous design, and saving a scenario would have been
  rejected by the same check. Concepts now derive `footprint` from their own
  `width * length`.
- Hashed `/_next/static/*` chunks are now served by Firebase Hosting instead
  of falling through the `**` rewrite to the `app` Cloud Function. The build
  wrote them only to `dist/.next/static`, which `firebase.json` excludes from
  the Hosting upload, so Hosting published 49 files and every chunk request hit
  a function. That cost Hosting's brotli (17.6% more bytes than gzip across
  4.2 MB of chunks), attached a `Vary: cookie` that fragmented the CDN cache per
  signed-in user, and billed a function invocation per asset miss. The
  `max-age=31536000, immutable` rule declared for `/_next/static/**` also never
  fired, because Hosting had no matching files.
- Kept the landing ADU fully framed and unobstructed on narrow screens while
  reducing mobile WebGL load to avoid silent renderer failures.
- Client fetches to `/api/geocode`, `/api/parcel`, `/api/aerial`, and
  `/api/suggest` no longer send `cache: "no-store"`, so the browser honors the
  server's `Cache-Control` max-age and repeat views stop re-billing Google and
  Regrid within the cache window (#146).
- Re-exported all four public app icons with the LF monogram properly centered;
  the previous set was cropped off-center on home screens and splash surfaces.
- Updated mobile address and auth inputs to a 16px minimum font size to prevent
  iOS Safari from auto-zooming while preserving the compact size at `sm` and
  above (#147).
- Preserved the mobile Blue Hour copy fade, normalized auth error-banner radii,
  and kept the landing-page Sign in action visible at narrow widths (#148).
- Mobile/tablet studio entry now honors restored and shared scenario URLs: a
  non-default `?parcel=…` scenario opens on the Earn money reveal with the
  selected lot instead of the generic Find onboarding plate
  (`isNonDefaultScenario` in `lib/scenario-url.ts`).
- Cleared Android release configuration blockers, aligned the trusted Firebase
  origin, and pinned both dependency trees to `websocket-driver@^0.7.5` (#145).
- Finished the shared authentication modal's iOS-safe input sizing, retained
  explicit labels and keyboard focus behavior, and synchronized maintainer
  workflow documentation with the actual issue-intake behavior (#152).
- Hardened the builder handoff and profile forms with 44px controls, 16px mobile
  field text, semantic input metadata, explicit label associations, and focused
  regression coverage (#153).
- Added a mobile-only 16px floor for editable text controls across the app,
  excluding non-text input types, so current and future forms cannot reintroduce
  iOS Safari focus zoom (#154).

## [1.0.1] - 2026-06-10

### Fixed
- `viewport-fit=cover` is now set so `env(safe-area-inset-*)` paddings take
  effect on notched iOS devices, especially in standalone PWA mode.
- Mobile studio header pads below the status bar (safe-area top inset) and
  the bottom sheet's scroll area clears the home indicator (bottom inset).
- Signed-in avatar button in the mobile header enlarged from 36px to a
  44px minimum touch target.
- Firebase Hosting immutable 1-year caching is now scoped to hashed
  `/_next/static/**` assets; unhashed public images and fonts use a 24-hour
  cache so icon and logo updates propagate to returning visitors.

### Added
- Mobile preview screenshot script (`scripts/preview-mobile-studio.mjs`)
  for visual verification of the wizard and bottom-sheet studio.

## [1.0.0]

Initial release: ADU feasibility studio with desktop and mobile-first
experiences, first-run wizard, Three.js parcel scene, permit guide,
inspiration gallery, estimate summary, export preview, Firebase auth and
hosting, and PWA support (manifest, offline page, service worker).
