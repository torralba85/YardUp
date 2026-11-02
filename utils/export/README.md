# export

## Overview
Specialized mathematical, geometric, and export utilities for export.

## Interface
- `generateFeasibilityReport.ts:FeasibilityPdfInput` - TypeScript Interface
- `generateFeasibilityReport.ts:generateFeasibilityReport` - Exported Function
- `generateFeasibilityReport.ts:generateAndDownloadCurrentFeasibilityReport` - Exported Function

## Invariants
- `generateFeasibilityReport.ts:throw` - new Error("Canvas 2D context is unavailable for feasibility PDF export.")
- `generateFeasibilityReport.ts:throw` - new Error("Load a parcel and ADU concept before exporting the site plan.")

## Side Effects
- None

## Verification
- Run: `npm test`
