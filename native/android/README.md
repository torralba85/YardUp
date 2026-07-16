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

## Digital Asset Links

`public/.well-known/assetlinks.json` ships with a fingerprint placeholder until the
human Play App Signing SHA-256 is supplied. Replace
`REPLACE_WITH_PLAY_SIGNING_SHA256_FINGERPRINT` before production release.

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

Do not commit signing keys or keystores.
