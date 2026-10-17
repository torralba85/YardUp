# Emailed layout delivery and certificate worksheets

Local implementation branch: `feat/certificate-decision-tools-20261016`. The price remains a one-time $29 property unlock. Financing, fee/overlay verification notes and contractor bid comparison are available in the purchased report, print view, HTML download and CSV. Editable example financing terms are not live rates or lender offers. No parcel overlay lookup is implemented: coastal/fire checks remain explicitly unverified. San Diego city guidance must not be applied to the entire county.

## Mail setup before enabling the guest capture form

The existing DNS notes identify Google Workspace. Andrew supplied `support@lotfoundry.net` as the From address. The SMTP implementation uses the existing mailbox via `smtp.gmail.com:465` with verified TLS. Confirm the mailbox's actual provider and authorized send-as identity before enabling. A Workspace administrator may restrict SMTP/app passwords; use a supported authentication method or adapt the transport to the confirmed provider if necessary.

- Configure `SCENARIO_SMTP_USER` for the authorized Workspace mailbox and provision `SCENARIO_SMTP_PASSWORD_SECRET` securely in Firebase Secret Manager. Never place credentials in public env variables or git. The `api` function binds the secret only when `SCENARIO_EMAIL_ENABLED=true`.
- Set server `SCENARIO_EMAIL_ENABLED=true` and build-time `NEXT_PUBLIC_SCENARIO_EMAIL_ENABLED=true` only after mail is ready. Both default off. Configure the server setting in the Firebase Functions environment and the build flag in the production CI build environment. There is no need to expose SMTP credentials to CI builds.
- Enable Firestore TTL for the `emailedLayouts` collection group on `expiresAt` before launch. Read access expires after 30 days even before TTL deletion occurs; TTL deletion is asynchronous. This is required to bound retention of recipient addresses as well as snapshots.
- Deploy Functions, Hosting and the explicit deny rules together. Validate mail acceptance/delivery with an owner-provided test recipient, then verify that the emailed link restores a real parcel, dimensions, placement and assumptions on another browser. No production email was sent during implementation.

The endpoint is anonymous, requires explicit one-time delivery consent, uses a honeypot, validates bounded snapshots, and applies a shared Firestore ceiling (2 sends/client/hour, 30 globally/hour), failing closed if quota storage is unavailable. SMTP errors return failure; the UI never claims delivery merely from a captured email. No marketing consent or outreach is implied. Snapshot links are unguessable 192-bit bearer tokens; the retrieval API returns only the design, never the recipient. Client Firestore access is denied. Layout routes are noindex, no-referrer, exclude analytics, and analytics sanitizers redact layout tokens.

## Production SEO verification for PR #294

Verified 2026-10-16: master CI `38962249743` deployed `78982f6`; Signup Canary `38964532147` succeeded. The default Firebase host's `/studio?address=test` returned 301 with `Location: https://lotfoundry.net/studio?address=test`. `/`, `/adu/ca`, `/adu/ca/san-diego`, and `/adu/ca/san-diego/cost` returned 200, correct canonical tags and no `web.app` references in response HTML.

Search Console: worked from `sc-domain:lotfoundry.net`. After initial reCAPTCHA/browser failures, all three requested canonical URLs (`/`, `/adu/ca`, `/adu/ca/san-diego/cost`) were inspected as indexed and each showed the explicit "Indexing requested" confirmation / priority crawl queue acceptance. This is not proof of recrawl or ranking changes. Screenshot evidence: `C:\Users\Andrew\LotFoundry\artifacts\seo-verification-20261016\cost-guide-indexing-requested.jpg`.

Added the `https://yardup-2026.web.app/` URL-prefix property; it remains unverified and requires Google's HTML ownership-verification file to be deployed. Andrew's downloaded file was copied byte-for-byte to a separate one-file draft PR [#295](https://github.com/torralba85/YardUp/pull/295), awaiting merge/deploy approval. No removal or Change of Address was submitted. Google explicitly cautions against using Removals to select a canonical version; prefer redirects/canonicals and a verified Change of Address when eligible. Removals is temporary and does not guarantee immediate disappearance.

Sources: https://support.google.com/webmasters/answer/9689846 and https://support.google.com/webmasters/answer/9370220. Fee source links are recorded in `lib/certificate-planning.ts`.

## Local validation and external review

Claude Sonnet 4.6 reviewed the current diff through AGY in read-only plan mode. Findings were checked against the implementation; the adopted improvement revalidates persisted snapshots on retrieval and strips unexpected stored fields. Gemini is available through AGY but was not run for this review. Review artifacts are under `artifacts/seo-verification-20261016` in the outer workspace.

Validation: 152 focused tests across 11 files passed, TypeScript passed, full lint/design checks passed, and the final retrieval hardening passed its seven API tests plus targeted lint. Paid worksheet previews were checked at desktop, 390px and 320px; the actual guest capture panel was checked at desktop. Full-suite, production-build, Firestore-emulator, live SMTP delivery and another-browser restoration checks remain outstanding. These Studio changes remain local and uncommitted; email capture remains disabled pending verified mailbox authentication and Firestore TTL setup.
