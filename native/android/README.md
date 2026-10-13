# LotFoundry Android TWA

Trusted Web Activity package for Google Play (`com.lotfoundry.app`).

`docs/play-production-release.md` is the ordered runbook from a merged
release branch to a production rollout; `docs/play-declarations.md` holds the
verbatim Console field values.

## Generate / refresh

From the repo root (requires network + Java):

```bash
npx @bubblewrap/cli init \
  --manifest=https://lotfoundry.net/manifest.json \
  --directory=native/android
```

Suggested values:

| Field | Value |
|---|---|
| Package | `com.lotfoundry.app` |
| App name | LotFoundry |
| Start URL | `/studio` |
| Display mode | standalone |

The generated Bubblewrap/Gradle project is checked in. Refresh it only when the
web manifest, package identity, Bubblewrap configuration, or native bridge
requirements change, then review the generated diff before committing.

## Release history

The checked-in version always describes the *next* build. Google Play rejects an
upload whose `versionCode` does not exceed the highest already published, so
`PUBLISHED_VERSION_CODE` in `scripts/validate-config.mjs` tracks that ceiling and
must be raised whenever a new bundle is accepted.

| versionName | versionCode | Status | Notes |
|---|---|---|---|
| 1.0.3 | 4 | published | Target API 36. |
| 1.0.4 | 5 | see Play Console | Play Billing wired via Bubblewrap regeneration (`cd9c621`). |
| 1.0.5 | 6 | published 2026-08-11 | Built locally with `bubblewrap-cli`; the version bump was never committed and no AAB was retained. Shell config is identical to `cd9c621` apart from the version, so it points at `yardup-2026.web.app`, not `lotfoundry.net`. |
| 1.0.6 | 7 | draft uploaded 2026-09-06 | First build carrying the `lotfoundry.net` host. Rejected by Play Console: requires Play Billing Library >= 8.0.0 (carried 7.1.1). |
| 1.0.7 | 8 | internal testing since 2026-09-06 | Upgraded `com.google.androidbrowserhelper:billing` to 1.2.0 and added `com.android.billingclient:billing:9.1.0`. Signed AAB from **Android release bundle** run `34048176925`. |
| 1.0.8 | 9 | available to internal testers, verified 2026-09-10 | Built by **Android release bundle** run `34150101419` from merge `a86601c`. |
| 1.0.9 | 10 | production change saved 2026-09-10; not submitted for review | Locally signed AAB accepted by Play. Chalk launch/system-bar colors. See the [mobile audit](../../docs/design/2026-09-10-mobile-audit.md) for the artifact hash and outstanding device, billing, and web-deployment gates. |
| 1.0.10 | 11 | live production at 100%, verified 2026-09-12 | Signed bundle from Actions run `34624314664`; Play release summary confirms available on Google Play. |
| 1.0.11 | 12 | production | Mobile landing performance improvements and current A LOT MORE icons throughout launcher, splash, shortcuts, notifications, and web assets; verified at 100% production rollout on 2026-09-21. |
| 1.0.12 | 13 | available to internal testers 2026-09-29 | Locally signed with the current Play upload key after the CI bundle was rejected for using the retired key. Andrew approved internal publication; Play confirmed availability at 8:01 PM Pacific. Current-build device/billing verification and separate production confirmation remain pending. |
| 1.0.13 | 14 | production draft uploaded 2026-10-03 | Built from master ab78270 with the current Play upload key; Play accepted the bundle and saved the draft. Not submitted for review or rolled out. |
| 1.0.14 | 15 | next build | Reserved after Play accepted code 14. No bundle built or uploaded. |

Version 1.0.5/vc6 predates the domain switch. Android does not follow a
cross-origin redirect when verifying Digital Asset Links, so a bundle built
against a redirecting host launches with Custom Tab chrome instead of full
screen. That precondition is no longer a manual step: `--verify-live` asserts
that `https://lotfoundry.net/`, the start URL, and the served asset-links
statement each answer 200 without a redirect, and the release workflow runs it
before building. Verified directly on 2026-09-03.

## Store listing graphics

Play refuses to publish a listing without a **1024x500 feature graphic**, PNG or
JPEG, no transparency. It lives at `store-listing/feature-graphic.png` with its
HTML source beside it, so it stays editable rather than being an unregenerable
binary:

```bash
npm run store:feature-graphic
```

Regenerate launcher, splash, shortcut, notification, web, and store icons from the
approved website mark with `node scripts/render-app-icons.mjs`. Upload
`store_icon.png` separately in the Play Console listing; packaging the Android
icons does not update the listing icon.

Also required: a 512x512 icon (`store_icon.png`) and at least two phone
screenshots. `public/screenshots/` currently holds two phone shots
(1080x1920) and one tablet shot (1280x800); regenerate them with
`node scripts/capture-store-screenshots.mjs` against a running dev server. A
second tablet screenshot is worth adding before submission — Play uses tablet
assets to decide large-screen presentation.

## Digital Asset Links

`public/.well-known/assetlinks.json` and `twa-manifest.json` include both the
upload-key and Google Play App Signing SHA-256 fingerprints. Keep both entries
synchronized. After changing either certificate, redeploy Hosting and verify the
served statement against the Play Console App integrity page before relying on
full-screen TWA verification.

## Play Billing

Only `com.lotfoundry.certificate.credit1` is offered for new in-app purchases.
Builder registration, dashboards and lead-credit purchases are web-only, including
phone browsers. The three historical builder IDs remain in
`lib/commerce/products.ts` for receipt verification; do not reactivate them as
new Play offers. See `docs/play-store-homeowner-listing.md` for catalog checks.

The Builder Dashboard launcher shortcut has been removed from source. Delivering
that launcher change requires a newly versioned Android release. The web route
guard also handles existing shortcuts after the web deployment.

The web client recognises the app by the `android-app://com.lotfoundry.app`
referrer Chrome sets on the TWA's launch document, remembers it in
`sessionStorage` for the tab, and routes purchases through Play Billing and
`POST /api/store/purchases/verify`. `getDigitalGoodsService` alone is not a
signal: Edge and other Chromium browsers expose it in ordinary tabs, installed
PWAs and fullscreen windows, where Play Billing rejects with "unsupported
context". See `lib/commerce/purchase-channel.ts`.

## Website links and sign-in continuity

Website links stay in the initiating browser. Do not restore Bubblewrap's
host-wide `VIEW`/`BROWSABLE` intent filter: it can move Firebase's
`/__/auth/handler` into a new TWA/Custom Tab without the original session storage,
producing "missing initial state", and capture Stripe's return to `/studio`.
This also applies to ordinary URLs used as the final sign-in return page.

The app icon and explicit New Study shortcut still launch `/studio`. The
Digital Asset Links relation and signing fingerprints remain in place for TWA
trust; removing implicit website intents does not remove the launcher or billing
service. `android:validate` and `test/android-app-links.test.ts` guard this policy.
Reapply it after any Bubblewrap regeneration.

`public/.well-known/assetlinks.json` also excludes all paths through Dynamic App
Links for **existing Android 15+ installs with Google services**, once the hosted
file is deployed and refreshed by the device. Older Android versions ignore
dynamic rules and require the updated app. A Firebase deployment alone does not
update an installed Android manifest. Until the app update arrives, affected
users can turn off LotFoundry's **Open supported links** in Android app settings,
then start a fresh sign-in from the browser (do not reload the failed callback).

Before release, test browser Google sign-in and Stripe checkout/cancel with the
Play app installed, then separately test app-icon launch, sign-in and Play
Billing. Stop before payment unless an actual test purchase is authorized.
Configuration tests are not evidence of a successful physical-device OAuth flow.

References: [Android dynamic rules](https://developer.android.com/training/app-links/configure-assetlinks)
and [TWA Digital Asset Links](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

## Build

```bash
cd native/android
./gradlew test
```

Run `npm run android:validate` for committed configuration checks, which need
no network. `npm run android:validate:live` checks the canonical host's app,
legal, manifest, and icon endpoints all serve a direct 200, and verifies that
the served asset-links statement has the required relation, fingerprints, and
`application/json` content type. `npm run android:validate:release` adds the
release gates, expects the signed AAB at
`native/android/app/build/outputs/bundle/release/app-release.aab`, and compares
its signer with the upload keystore. The AAB, signing keys, and keystores are
intentionally not committed.

`bundleRelease` deliberately fails closed unless all four Gradle project
properties are set. For a local release build, set these as environment-backed
Gradle properties (substitute real local paths and values; do not commit them):

```bash
export ORG_GRADLE_PROJECT_LOTFOUNDRY_STORE_FILE=/path/to/upload.keystore
export ORG_GRADLE_PROJECT_LOTFOUNDRY_STORE_PASSWORD='...'
export ORG_GRADLE_PROJECT_LOTFOUNDRY_KEY_ALIAS='...'
export ORG_GRADLE_PROJECT_LOTFOUNDRY_KEY_PASSWORD='...'

cd native/android
./gradlew --no-daemon :app:bundleRelease
cd ../..
npm run android:validate:release
```

Dependency resolution needs both `google()` and `mavenCentral()`. The
Bubblewrap template shipped `jcenter()`, which is shut down; `guava`,
`kotlin-bom`, and `kotlinx-coroutines-bom` reach the build only through Maven
Central, so a cold build fails without it.

## GitHub Actions signing

Run the manually triggered **Android release bundle** workflow only after these
secrets are configured in GitHub's protected `play-production` environment. It
decodes the keystore into the ephemeral runner directory, passes signing values
to Gradle as masked environment-backed project properties, verifies that the
upload certificate is already trusted by the TWA, confirms the finished bundle
is signed by that exact certificate, uploads only the AAB, and removes the
keystore. Configure the environment's required reviewers and deployment-branch
rules before adding the secrets.

| Secret | Value |
|---|---|
| `LOTFOUNDRY_ANDROID_KEYSTORE_BASE64` | Base64 encoding of the Play **upload** keystore file |
| `LOTFOUNDRY_ANDROID_KEYSTORE_PASSWORD` | Upload-keystore password |
| `LOTFOUNDRY_ANDROID_KEY_ALIAS` | Upload-key alias |
| `LOTFOUNDRY_ANDROID_KEY_PASSWORD` | Password for that alias |

These are not Play App Signing key credentials. Google retains the App Signing
private key; the workflow needs only the upload key that Play Console accepts.
