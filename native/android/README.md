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

`public/.well-known/assetlinks.json` includes the **upload key** SHA-256 so
locally signed TWAs can verify. After Play App Signing enrollment, **add** the
Play Console signing certificate fingerprint as a second array entry (keep the
upload key). Redeploy Hosting before relying on Digital Asset Links.

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
