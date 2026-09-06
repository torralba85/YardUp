# Google Play production release runbook — v1.0.7 (versionCode 8)

**Updated:** 2026-09-06
**App:** LotFoundry, `com.lotfoundry.app`, a Trusted Web Activity over
`https://lotfoundry.net`.

Ordered path from a merged release branch to a production rollout. Field values
for the Console forms live in `docs/play-declarations.md`; this file is the
sequence and the gates. Console entry, signing secrets, and payment setup all
require the account owner.

## Blocker — Play Billing grants nothing until Functions are configured

Verify this before any paid track, including internal testing.

`lib/server/store-purchases.ts` returns `"Google Play verification is not
configured."` unless both `GOOGLE_PLAY_PACKAGE_NAME` and
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` are present, and `functions/index.js` binds
those secrets only when `ENABLE_NATIVE_STORE_VERIFICATION=true` at deploy time.
Ship without them and Play still charges the card while
`POST /api/store/purchases/verify` refuses the grant — the user pays and
receives nothing.

Required, in order:

1. Create a Play Console service account with the `androidpublisher` scope and
   grant it access to the app.
2. Set the `GOOGLE_PLAY_PACKAGE_NAME` and `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
   secrets, plus `APPLE_BUNDLE_ID` and `APPLE_ROOT_CA_FINGERPRINT256` — the
   binding in `functions/index.js` defines all four together.
3. Deploy with `ENABLE_NATIVE_STORE_VERIFICATION=true`.
4. Confirm a sandbox purchase actually grants the entitlement before opening a
   paid track to anyone outside the test group.

`PLAY_RTDN_VERIFICATION_TOKEN` guards the Pub/Sub push URL for
`/api/store/rtdn/google`; set it when wiring Real-time Developer Notifications
for refunds and revocations.

## Already verified — do not redo

Confirmed 2026-09-03 against the live host:

- `lotfoundry.net` serves `/`, `/studio`, `/privacy`, `/delete-account`,
  `/help`, `/terms`, `/manifest.json`, `/icon-512.png`, and
  `/icon-maskable-512.png` with a direct 200. No redirect on any of them.
- `/.well-known/assetlinks.json` returns 200 as `application/json`, carrying
  both the upload-key and Play App Signing fingerprints, matching
  `native/android/twa-manifest.json` exactly.
- `versionCode 8` exceeds the `PUBLISHED_VERSION_CODE = 7` ceiling.
- Repo gate green: lint and 136 Vitest files / 782 tests on 2026-09-03; the
  preceding release audit also passed `tsc --noEmit` and the production build.

`npm run android:validate:release` re-checks the listed live endpoints,
asset-links content, and the built AAB's signer. It does not re-run lint,
TypeScript, unit tests, or the production build; use the current CI `verify`
job (or re-run those checks) as evidence for that separate repo gate.

A second audit on 2026-09-03 re-read the whole release path and found the
static side clean: `verifyReleaseSigning` has no reachable debug or unsigned
fallback, the validator compares the two fingerprint sets in both directions
rather than only checking their shape, the version pair agrees across
`app/build.gradle` and `twa-manifest.json`, the four product IDs match
`lib/commerce/products.ts` character for character, and the workflow uploads
with `if-no-files-found: error`. The live statement at
`lotfoundry.net/.well-known/assetlinks.json` was re-fetched and still matches
both committed fingerprints. Release remains blocked until the Play Billing
configuration above is complete and its sandbox purchase grants an entitlement.

## 1. Secrets

Four protected-environment secrets in GitHub environment `play-production`, all
from the Play **upload** key. Google retains the App Signing private key; the
workflow never needs it.

| Secret | Value |
|---|---|
| `LOTFOUNDRY_ANDROID_KEYSTORE_BASE64` | Base64 of the upload keystore file |
| `LOTFOUNDRY_ANDROID_KEYSTORE_PASSWORD` | Upload-keystore password |
| `LOTFOUNDRY_ANDROID_KEY_ALIAS` | Upload-key alias |
| `LOTFOUNDRY_ANDROID_KEY_PASSWORD` | Password for that alias |

The keystore must be the one whose certificate is
`A8:AC:42:8E:…:26:BD`. The upload-key reset to this certificate was requested
in Play Console on 2026-09-03. Play activated the certificate but enforces a
post-reset safety delay until 2026-09-06 02:33:32 UTC (2026-09-05 19:33:32
America/Los_Angeles). The workflow checks the certificate before building
rather than after, so a wrong keystore fails in seconds instead of producing a
bundle Play will reject.

## 2. Build the bundle

Merge to `master` first — `workflow_dispatch` only registers a workflow that
exists on the default branch.

Then run **Android release bundle** from the Actions tab and download the
`lotfoundry-android-release-aab` artifact (retained 14 days).

If Actions dispatch is unhealthy — see the billing lock recorded in #163 — the
same build runs locally with a JDK 21 and the Android SDK:

```bash
cd native/android
export ORG_GRADLE_PROJECT_LOTFOUNDRY_STORE_FILE=/path/to/upload.keystore
export ORG_GRADLE_PROJECT_LOTFOUNDRY_STORE_PASSWORD=…
export ORG_GRADLE_PROJECT_LOTFOUNDRY_KEY_ALIAS=…
export ORG_GRADLE_PROJECT_LOTFOUNDRY_KEY_PASSWORD=…
./gradlew --no-daemon :app:bundleRelease
cd ../..
npm run android:validate:release
```

`verifyReleaseSigning` fails the build rather than emit an unsigned or
debug-signed bundle, so a missing property is an error, never a silent
downgrade.

The code-7 AAB was built locally on 2026-09-03. It is 1,732,606 bytes, has
SHA-256
`5F1D360DCF5D4B71EFEB31D4F9B455F4090271098F06257B079E45C2205C59BC`,
and its signer matches `A8:AC:42:8E:…:26:BD`.

## 3. Console setup

Skip whichever of these the account already has — versionCode 6 was published
on 2026-08-11, so the app, its listing, and its declarations already exist. Then
this step is only a review pass for the values that changed with the domain
switch to `lotfoundry.net`.

Take verbatim values from `docs/play-declarations.md`:

- **App integrity** — enrolled in Play App Signing; the certificate Console
  displays must still be the `03:12:00:71:…:5A:CE` entry served in
  `assetlinks.json`.
- **Store listing** — name, descriptions, category, contact email, privacy
  policy. Upload the 1024x500 feature graphic from
  `native/android/store-listing/feature-graphic.png` (Play will not publish a
  listing without one), the 512x512 icon, and the phone and tablet screenshots.
  Check screenshot dimensions against Console rather than assuming the
  web-manifest set is accepted as-is. The set now carries two phone
  (1080x1920) and two tablet (1280x800) captures, which is Play's minimum for
  each declared form factor; regenerate with
  `node scripts/capture-store-screenshots.mjs https://lotfoundry.net`.
- **App content** — ads, target age, app access, data deletion, financial
  features. App access needs a working reviewer account; note that the demo-lot
  path (Seattle, Portland, Austin) runs the full journey with no sign-in.
- **Data safety** — the marketplace sharing disclosure is the only third-party
  sharing claim. Everything collected is encrypted in transit.
- **Content rating** — IARC questionnaire; digital-goods purchases are `Yes`.
  The app does not transmit current device location to other people.

## 4. In-app products

Create under Monetize → Products. IDs are immutable once published and must
match `lib/commerce/products.ts` exactly.

| Product ID | Price | Grants |
|---|---|---|
| `com.lotfoundry.certificate.credit1` | $29.00 | 1 certificate credit |
| `com.lotfoundry.builder.credit1` | $49.00 | 1 lead unlock |
| `com.lotfoundry.builder.credits5` | $175.00 | 5 lead unlocks |
| `com.lotfoundry.builder.credits10` | $300.00 | 10 lead unlocks |

Credit counts are server-trusted from that catalog; a client-supplied amount is
never honored. Tax, banking, and the merchant profile must be complete before
any of these can sell.

Add license testers under Setup → License testing for sandbox purchases.

## 5. Device validation

On a physical device, from the internal or closed track — not an emulator, and
not a locally installed APK, since Play App Signing only applies to the uploaded
bundle.

- [ ] Opens full screen with no Chrome URL bar. A visible address bar means
      Digital Asset Links verification failed; re-check the served statement
      against the App integrity page rather than rebuilding.
- [ ] `/studio` journey on a phone: address → estimate → certificate
- [ ] Play Billing purchase **grants the entitlement** — the blocker above.
      Two request-shape conditions fail a purchase even once the secrets are
      deployed, so test with an account that satisfies both:
      a builder-credit SKU needs an existing `builders/{uid}` document or the
      grant returns `builderProfileMissing`
      (`lib/server/store-purchases.ts:193`), and the single-certificate SKU
      needs a `certKey` bound to a lot or the route rejects with 400
      (`lib/server/store-purchases.ts:126`). Testing only with a fresh account
      that has never opened the builder dashboard will look like a billing
      failure when it is neither.
- [ ] Restore after reinstall; refund and revocation behavior
- [ ] Sign-in offers saved credentials
- [ ] Account deletion via Settings and `/delete-account`
- [ ] App shortcuts (New Study, Builder Dashboard) launch correctly

## 6. Rollout

Upload to the intended track with version name `1.0.6`, version code `7`, and
the release note from `docs/play-declarations.md`. Confirm in Console that the
highest accepted version code is below 7 before uploading.

A personal Play account created after November 2023 needs 12 testers opted in
for 14 continuous days before it can request production access. This account has
already published, so that gate is behind it — verify rather than assume, since
the clock is long if it does apply.

## 7. After Play accepts the bundle

Both in the same commit, or the next release build fails validation:

1. Raise `PUBLISHED_VERSION_CODE` to `7` in
   `native/android/scripts/validate-config.mjs`.
2. Raise `appVersionCode`/`appVersionName` in
   `native/android/twa-manifest.json` and `versionCode`/`versionName` in
   `native/android/app/build.gradle` to the next build. The validator requires
   the two files to agree and to exceed the published ceiling.
3. Record the outcome in the release-history table in
   `native/android/README.md`.
