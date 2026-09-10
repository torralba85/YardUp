# Changelog

All notable changes to LotFoundry are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Mobile journey progress now keeps all five labels visible with at least 44px
  touch targets. Moving to another step resets scroll and focuses its named main
  region, while changes within the same step preserve scroll.
- Android launch and system-bar colors now match the A LOT MORE chalk palette.
  Version 1.0.9/code 10 is saved in Play production, awaiting review submission;
  the mobile web changes require their own deployment.
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
