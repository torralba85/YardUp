# commerce

## Overview

Domain modeling, utility functions, and calculation engines for commerce.

## Interface

- [`products.ts`](./products.ts) — `STORE_PRODUCTS`, `StoreProductKey`, `StoreProductId`, `getStoreProduct`, `listStoreProductIds`
- [`purchase-channel.ts`](./purchase-channel.ts) — `PurchaseChannel`, `ANDROID_APP_SESSION_KEY`, `PurchaseChannelWindow`, `detectPurchaseChannel`, `isNativeAppShell`, `requiresStoreBilling`
- [`purchase-client.ts`](./purchase-client.ts) — `PurchaseReceipt`, `PurchaseContext`, `PurchaseClient`, `PurchaseClientError`, `StripePurchaseHandlers`, `CreatePurchaseClientOptions`, `StoreProductPrice`, `createPurchaseClient`, `getGooglePlayProductPrices`, `formatCurrencyAmount`
- [`store-price.ts`](./store-price.ts) — `STORE_PRICE_PLACEHOLDER`, `StorePriceDisplay`, `clearStorePriceCache`, `UseStorePriceOptions`, `useStorePrice`
- [`use-web-builder-access.ts`](./use-web-builder-access.ts) — `useWebBuilderAccess`

## Invariants

- [`purchase-channel.ts`](./purchase-channel.ts) — PurchaseChannel accepts web, app-store, google-play.
- [`store-price.ts`](./store-price.ts) — The module declares the React client boundary with "use client".
- [`use-web-builder-access.ts`](./use-web-builder-access.ts) — The module declares the React client boundary with "use client".

## Side Effects

- [`purchase-client.ts`](./purchase-client.ts) — navigation via window.location.assign. native bridge messages via handler.postMessage.

## Verification

Run `npm test` from the YardUp repository root.
