# Release Checklist

Start from a clean worktree. Remove local build caches using your platform's
normal filesystem command, then run `npm ci`. Do not delete signing keys,
environment files, sibling worktrees, or agent configuration.

## Automated gates

- [ ] `npm run repo:public-check`
- [ ] `npm ci`
- [ ] `npm run lint` — zero warnings and zero errors
- [ ] `npm run test` — all unit tests pass
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npm run build` — production build succeeds
- [ ] `npm run test:e2e` — desktop and mobile Playwright projects pass
- [ ] `FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase` — dedicated test account can save, load, and delete a scenario

## Manual web QA

- [ ] A LOT MORE color check: chalk/carbon grounds, orange action fills with carbon labels, deep orange text on chalk, and stone-on-dark secondary text on carbon.
- [ ] State-color check: selected controls are carbon/chalk; green is verified status only; money is neutral. Focus is deep orange on chalk, carbon on orange grounds, and chalk on carbon.
- [ ] Desktop at 1440×900 — no clipped UI or blank scene
- [ ] Tablet at 768×1024 — no horizontal overflow
- [ ] Mobile at 390×844 and 320×568 — no horizontal overflow
- [ ] Keyboard navigation — controls are reachable and no focus trap exists
- [ ] Report print/save — print stylesheet hides controls and shows the report
- [ ] Text and CSV exports download with the active scenario
- [ ] Share action copies a restorable scenario URL
- [ ] 3D scene, keyboard placement, and drag placement stay within setbacks
- [ ] Address search works with live keys and degrades honestly without them
- [ ] Account settings, export, support, feedback, sign-out, and deletion work
- [ ] AI photo generation requires consent and handles missing configuration

## Security and privacy

- [ ] `.env.local`, `functions/.env`, signing files, and service-account JSON are not staged
- [ ] `npm audit` is reviewed without `npm audit fix --force`
- [ ] Browser and server API-key restrictions are verified in their consoles
- [ ] Firebase Auth providers and App Check production settings are verified
- [ ] Firestore rules are deployed and owner-isolation tests pass
- [ ] Privacy, Terms & Conditions, Help, and Delete Account URLs are live

## Firebase deploy

- [ ] If native-store verification is enabled, validate StoreKit and Play Billing sandbox receipts through `/api/store/purchases/verify`; do not substitute an unverified web Stripe flow for native purchase testing.

- [ ] `npm run build:firebase`
- [ ] `npm run deploy:dry-run`
- [ ] `npm run deploy`
- [ ] Hosting and API routes answer successfully after deployment
- [ ] Address search and the Firebase scenario smoke pass against production
- [ ] The newest `master` GitHub Actions run finishes successfully

## Android release

- [ ] `npm run android:validate`
- [ ] Generated Bubblewrap/Gradle project is reviewed against `twa-manifest.json`
- [ ] Play App Signing SHA-256 is added alongside the upload-key fingerprint
- [ ] Play Billing products and license testers are configured
- [ ] Required phone/tablet screenshots are referenced by the web manifest
- [ ] `npm run android:validate:release`
- [ ] Signed `.aab` is built outside Git and tested on the internal track
- [ ] Purchase, restore, refund/revocation, account export, and deletion pass on a real device

## Public repository and release checks

- [ ] Repository description, homepage, topics, license, and README are current
- [ ] `npm run repo:public-check` passes with zero secret or tracking violations
- [ ] No local `.env`, credentials, or temporary artifacts are tracked
- [ ] `README.md` and documentation links are tested and point to active paths
- [ ] License terms and copyright notices are verified and accurate
- [ ] Core verification gate passes: `npm run check` (lint, test, tsc, build)
- [ ] Production deployment smoke tests pass (`npm run smoke:firebase`)
- [ ] App Store / Play Store release assets, metadata, and version bumps are confirmed
