# checkout-certificate

## Overview
Server API route handler providing backend endpoints for stripe/checkout-certificate.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:throw` - new Error("Stripe returned a Checkout Session without a URL")

## Side Effects
- `route.ts:stripe.checkout.sessions.retrieve` - External call or state mutation
- `route.ts:stripe.paymentIntents.retrieve` - External call or state mutation
- `route.ts:stripe.checkout.sessions.create` - External call or state mutation

## Verification
- Run: `npm test`
