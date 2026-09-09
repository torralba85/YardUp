# Store Deployment Readiness - iOS App Store and Google Play

**Updated:** 2026-07-19
**Repository baseline:** `origin/master` reached `4a5da14` after PRs #147 and
#148; both pull-request CI runs passed before merge. The last explicitly
recorded production deployment evidence remains run `29599585306` at `c76f936`,
which deployed Hosting, Functions, and Firestore rules.
**Verdict:** The web app has a previously verified production baseline. Confirm
the newest `master` deploy and rerun smoke checks before release. Native store
submission is not ready until human-owned console, sandbox, asset, upload, and
review gates are complete. Use a clean worktree and live `origin/master` for
release evidence.

## What is implemented

- Web/PWA product: owner studio, live and demo parcel flows, reports, auth,
  scenarios, builder marketplace, support, feedback, legal pages, settings,
  data export, and account deletion.
- Purchase routing: Stripe Checkout on the open web; StoreKit on iOS and Play
  Billing on Android when those native APIs are available. Native transactions
  are verified by `POST /api/store/purchases/verify` before an idempotent grant.
- Android groundwork: `native/android/twa-manifest.json` and
  `native/android/README.md` define a Bubblewrap Trusted Web Activity with Play
  Billing enabled. The generated Gradle project is checked in under
  `native/android/`, a signed v1.0.2 (versionCode 3) AAB has passed
  `npm run android:validate:release` in the prepared release workspace, both the
  upload-key and Play App Signing SHA-256 fingerprints are served from
  `public/.well-known/assetlinks.json`, and `public/manifest.json` carries
  phone/tablet screenshots (regenerate via
  `node scripts/capture-store-screenshots.mjs`). The upload keystore password
  was rotated on 2026-07-18 and the keystore/password files are ACL-restricted
  to the owner account. Declarations and closed-testing steps are pre-drafted
  in `docs/play-declarations.md`.
- iOS groundwork: `capacitor.config.ts` and `native/ios-shell/README.md` define
  the Capacitor shell, StoreKit bridge requirement, share/photo handoff, and
  offline certificate library requirement.
- Store support surfaces: `/help` is the support URL, `/privacy` is live, and
  `/delete-account` is the web deletion resource. Account deletion and data
  export are available through `/settings` for authenticated users.

## What remains a human gate

| Area | Required before submission |
|---|---|
| Apple | Apple Developer and App Store Connect setup, signing, Sign in with Apple/Firebase production configuration, StoreKit products, sandbox validation, review credentials, tax and banking |
| Google Play | Play Console organization, Billing products, license/sandbox accounts, upload of the signed AAB, and internal/closed-track validation |
| Native builds | Rebuild the Android release candidate from protected signing material as needed; implement and sign the iOS wrapper; test real-device restore/refund/revocation behavior |
| Store assets | Capture final device-specific App Store/Play screenshots and export the remaining listing graphics from the release candidates; keep manifest screenshots synchronized when they change |
| Business and legal | Confirm support ownership, buyer/refund handling, marketplace retention policy, privacy labels, Data Safety declarations, and final store claims with counsel |
| Production operations | Set the canonical `NEXT_PUBLIC_APP_URL`, verify the browser Places key and server-side Maps key restrictions, validate Stripe webhook/live test flows, and run Firebase smoke |

## Configuration audit

| Configuration | Current repo evidence | Follow-up |
|---|---|---|
| Browser Places | `NEXT_PUBLIC_GOOGLE_PLACES_KEY` is the public client seam | Confirm the live key is the intended referrer-restricted key and Places (New) is enabled |
| Server Maps and Regrid | Bound only to generic `api` in `functions/index.js` | Verify API restrictions are server-safe and required APIs are enabled |
| Stripe | `apiStripe` isolates checkout/webhook secrets | Register webhook, validate signing secret, and run certificate, lead-unlock, and credit tests |
| Native purchase verification | `apiStore` is separate and activates Apple and Google secret bindings independently with platform-specific flags; the legacy umbrella flag enables both | Provision each platform's credentials and complete sandbox device tests |
| Digital Asset Links | Upload-key and Play App Signing SHA-256 fingerprints are both checked into `public/.well-known/assetlinks.json` and mirrored in `native/android/twa-manifest.json` | Redeploy when the statement changes and re-verify with the Play Console App integrity page |
| Canonical app URL | Falls back to `https://yardup-2026.web.app` | Set `NEXT_PUBLIC_APP_URL` when the owned production domain is chosen |

## Store-policy readiness

The following web and product gaps from the earlier audit are resolved in code:

- Settings, shared account navigation, About, Help, Feedback, Privacy, Terms,
  and the external `/delete-account` page exist.
- Account export and deletion exist. Deletion removes account-associated PII
  while retaining only intentional redacted/ledger records; counsel must still
  confirm the marketplace retention policy before launch.
- Apple sign-in code and purchase-channel routing exist. Production provider
  configuration and sandbox validation are still required.

The remaining minimum-functionality risk is native quality, not absent web
screens. The iOS submission needs the promised native value: StoreKit, share,
photo-picker handoff, offline certificates, and network-recovery behavior.

## Release sequence

1. Complete the production domain, provider-key, Stripe, current `master`
   deployment, and Firebase smoke gates for the web release.
2. Provision App Store Connect and Play Console products, roles, test accounts,
   and signing; confirm the checked-in Digital Asset Links fingerprints still
   match the active certificates.
3. Rebuild/review the Android TWA release candidate as needed, implement the iOS
   Capacitor wrapper, and complete the native-value features documented in
   `native/`.
4. Run StoreKit and Play Billing sandbox purchase, restore, refund/revocation,
   and account-deletion tests on real devices.
5. Capture final store screenshots from those release candidates; update the
   manifest and listing metadata from the final, checked-in assets.
6. Run the web and native release gates, submit to internal track/TestFlight,
   resolve review feedback, and keep this register open until both listings are
   actually available.

## Do not treat as release proof

- A stale local `master`, another worktree's diff, or untracked tooling folders.
- Stripe web Checkout validation as a substitute for StoreKit or Play Billing.
- The presence of a manifest or shell without a signed, uploaded, device-tested
  native release candidate.
