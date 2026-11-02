# components

## Overview
Component package providing domain logic and interface implementations for components.

## Interface
- `FeasibilityStudio.tsx:FeasibilityStudio` - Exported Function (default)
- `ParcelScene.tsx:placementToneColor` - Exported Function
- `ParcelScene.tsx:computeShadowFrustumHalfExtent` - Exported Function
- `ParcelScene.tsx:existingHouseRidgeCapSize` - Exported Function
- `ParcelScene.tsx:ParcelScene` - Exported Function (default)
- `ServiceWorkerRegistration.tsx:ServiceWorkerRegistration` - Exported Function

### Subdirectories
- [account](<./account/README.md>) - Reusable user interface components and presentation widgets for account.
- [adu](<./adu/README.md>) - Reusable user interface components and presentation widgets for adu.
- [analytics](<./analytics/README.md>) - Reusable user interface components and presentation widgets for analytics.
- [auth](<./auth/README.md>) - Reusable user interface components and presentation widgets for auth.
- [builder](<./builder/README.md>) - Reusable user interface components and presentation widgets for builder.
- [canvas](<./canvas/README.md>) - Reusable user interface components and presentation widgets for canvas.
- [landing](<./landing/README.md>) - Reusable user interface components and presentation widgets for landing.
- [legal](<./legal/README.md>) - Reusable user interface components and presentation widgets for legal.
- [studio](<./studio/README.md>) - Reusable user interface components and presentation widgets for studio.
- [ui](<./ui/README.md>) - Reusable user interface components and presentation widgets for ui.

## Invariants
- `FeasibilityStudio.tsx:throw` - err
- `FeasibilityStudio.tsx:throw` - new Error("Sign in before connecting with builders.")
- `FeasibilityStudio.tsx:throw` - new Error("No local builders are registered for this area yet.")

## Side Effects
- `FeasibilityStudio.tsx:fetchSavedScenarios` - External call or state mutation
- `FeasibilityStudio.tsx:fetchActiveBuilders` - External call or state mutation

## Verification
- Run: `npm test`
