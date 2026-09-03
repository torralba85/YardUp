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
| 1.0.6 | 7 | unbuilt | First build carrying the `lotfoundry.net` host from `d4390c4`. Build it with the **Android release bundle** workflow. |

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

In-app products (must match `lib/commerce/products.ts`):

- `com.lotfoundry.certificate.credit1`
- `com.lotfoundry.builder.credit1` (single lead unlock when balance is zero)
- `com.lotfoundry.builder.credits5`
- `com.lotfoundry.builder.credits10`

The web client detects `getDigitalGoodsService` and routes purchases through
`POST /api/store/purchases/verify`.

## Build

```bash
cd native/android
./gradlew test bundleRelease
```

Run `npm run android:validate` for committed configuration checks, which need
no network. `npm run android:validate:live` adds the live-host checks: the
canonical host must serve `/`, the start URL, and
`/.well-known/assetlinks.json` with a direct 200 rather than a redirect, and
the served asset-links fingerprints must match
`public/.well-known/assetlinks.json`. `npm run android:validate:release` runs
all of that plus the release gates, and expects the signed AAB at
`native/android/app/build/outputs/bundle/release/app-release.aab`. The AAB,
signing keys, and keystores are intentionally not committed.

Dependency resolution needs both `google()` and `mavenCentral()`. The
Bubblewrap template shipped `jcenter()`, which is shut down; `guava`,
`kotlin-bom`, and `kotlinx-coroutines-bom` reach the build only through Maven
Central, so a cold build fails without it.

## GitHub Actions signing

Run the manually triggered **Android release bundle** workflow only after these
repository or protected-environment secrets are configured. It decodes the
keystore into the ephemeral runner directory, passes signing values to Gradle
as masked environment-backed project properties, verifies that the upload
certificate is already trusted by the TWA, confirms the finished bundle is
signed by that exact certificate, uploads only the AAB, and removes the
keystore.

| Secret | Value |
|---|---|
| `LOTFOUNDRY_ANDROID_KEYSTORE_BASE64` | Base64 encoding of the Play **upload** keystore file |
| `LOTFOUNDRY_ANDROID_KEYSTORE_PASSWORD` | Upload-keystore password |
| `LOTFOUNDRY_ANDROID_KEY_ALIAS` | Upload-key alias |
| `LOTFOUNDRY_ANDROID_KEY_PASSWORD` | Password for that alias |

These are not Play App Signing key credentials. Google retains the App Signing
private key; the workflow needs only the upload key that Play Console accepts.
