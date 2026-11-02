# commerce

## Overview
Domain modeling, utility functions, and calculation engines for commerce.

## Interface
- `products.ts:STORE_PRODUCTS` - Exported constant / variable
- `products.ts:StoreProductKey` - Type Definition
- `products.ts:StoreProductId` - Type Definition
- `products.ts:getStoreProduct` - Exported Function
- `products.ts:listStoreProductIds` - Exported Function
- `purchase-channel.ts:PurchaseChannel` - Type Definition
- `purchase-channel.ts:ANDROID_APP_SESSION_KEY` - Exported constant / variable
- `purchase-channel.ts:PurchaseChannelWindow` - TypeScript Interface
- `purchase-channel.ts:detectPurchaseChannel` - Exported Function
- `purchase-channel.ts:isNativeAppShell` - Exported Function
- `purchase-channel.ts:requiresStoreBilling` - Exported Function
- `purchase-client.ts:PurchaseReceipt` - TypeScript Interface
- `purchase-client.ts:PurchaseContext` - TypeScript Interface
- `purchase-client.ts:PurchaseClient` - TypeScript Interface
- `purchase-client.ts:PurchaseClientError` - Exported Class
- `purchase-client.ts:StripePurchaseHandlers` - TypeScript Interface
- `purchase-client.ts:CreatePurchaseClientOptions` - TypeScript Interface
- `purchase-client.ts:StoreProductPrice` - TypeScript Interface
- `purchase-client.ts:createPurchaseClient` - Exported Function
- `purchase-client.ts:getGooglePlayProductPrices` - Exported Function
- `purchase-client.ts:formatCurrencyAmount` - Exported Function
- `store-price.ts:STORE_PRICE_PLACEHOLDER` - Exported constant / variable
- `store-price.ts:StorePriceDisplay` - TypeScript Interface
- `store-price.ts:clearStorePriceCache` - Exported Function
- `store-price.ts:UseStorePriceOptions` - TypeScript Interface
- `store-price.ts:useStorePrice` - Exported Function
- `use-web-builder-access.ts:useWebBuilderAccess` - Exported Function

## Invariants
- `purchase-client.ts:throw` - new PurchaseClientError("Google Play pricing is unavailable.")
- `purchase-client.ts:assertKnownProduct` - Schema / validation invariant
- `purchase-client.ts:throw` - new PurchaseClientError("Stripe checkout is not configured for this surface.")
- `purchase-client.ts:throw` - new PurchaseClientError("Builder purchases are unavailable in this app.")
- `purchase-client.ts:throw` - new PurchaseClientError( "App Store billing is unavailable in this build. Update
- `purchase-client.ts:throw` - new PurchaseClientError( "Google Play billing is unavailable in this browser.", 
- `purchase-client.ts:throw` - new PurchaseClientError("Google Play billing service is not available.")
- `purchase-client.ts:throw` - new PurchaseClientError("Could not complete the Google Play purchase.")

## Side Effects
- `purchase-client.ts:options.stripe.startStripe` - External call or state mutation
- `purchase-client.ts:fetchImpl` - External call or state mutation

## Verification
- Run: `npm test`
