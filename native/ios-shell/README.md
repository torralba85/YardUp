# LotFoundry iOS shell

Capacitor bootstrap for App Store packaging (`com.lotfoundry.app`).

## Setup (requires macOS + Xcode + Apple Developer)

```bash
npm install @capacitor/core@8.4.1 @capacitor/ios@8.4.1
npm install --save-dev @capacitor/cli@8.4.1
npx cap add ios
npx cap sync ios
```

Production `capacitor.config.ts` points the WebView at the HTTPS app. Native
value required for App Review 4.2:

- StoreKit 2 bridge (`lotfoundryStore` message handler)
- Native share sheet for certificates/reports
- System photo picker handoff for style-match
- Offline certificate library for user-selected exports

## Product IDs

See `lib/commerce/products.ts`. Configure the same IDs in App Store Connect and
a StoreKit configuration file for sandbox tests.

## Human gates

Signing, App Store Connect listing, tax/banking, and review credentials are
human-only. See `{SCRATCH}/human-gates.md` and `docs/store-deployment-readiness.md`.

## Interface

- [`LotFoundryStoreBridge.js`](./LotFoundryStoreBridge.js) — `window.LotFoundryNative`, `window.LotFoundryStore`

## Invariants

None identified in the direct source.

## Side Effects

- [`LotFoundryStoreBridge.js`](./LotFoundryStoreBridge.js) — native bridge messages via handler.postMessage.

## Verification

Run `npm test` from the YardUp repository root.
