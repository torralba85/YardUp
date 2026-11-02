# canvas

## Overview
Specialized mathematical, geometric, and export utilities for canvas.

## Interface
- `drawSiteDimensions.ts:SitePlanAnnotationInput` - TypeScript Interface
- `drawSiteDimensions.ts:drawSiteDimensions` - Exported Function
- `exportOrthographicView.ts:SITE_PLAN_MARGIN_FT` - Exported constant / variable
- `exportOrthographicView.ts:SITE_PLAN_EXPORT_PX` - Exported constant / variable
- `exportOrthographicView.ts:exportOrthographicView` - Exported Function

## Invariants
- `drawSiteDimensions.ts:throw` - new Error("Canvas 2D context is unavailable for site plan annotation.")
- `exportOrthographicView.ts:throw` - new Error("Canvas 2D context is unavailable for site-plan export.")

## Side Effects
- None

## Verification
- Run: `npm test`
