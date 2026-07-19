# LotFoundry Android TWA

Trusted Web Activity package for Google Play (`com.lotfoundry.app`).

## Generate / refresh

From the repo root (requires network + Java):

```bash
npx @bubblewrap/cli init \
  --manifest=https://yardup-2026.web.app/manifest.json \
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

Run `npm run android:validate` for committed configuration checks. Run
`npm run android:validate:release` from the prepared release workspace after the
signed AAB exists at
`native/android/app/build/outputs/bundle/release/app-release.aab`. The AAB,
signing keys, and keystores are intentionally not committed.
