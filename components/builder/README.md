# builder

## Overview
Reusable user interface components and presentation widgets for builder.

## Interface
- `BillingLedger.tsx:BillingLedgerProps` - TypeScript Interface
- `BillingLedger.tsx:BillingLedger` - Exported Function (default)
- `BuilderDashboard.tsx:BuilderDashboard` - Exported Function (default)
- `BuilderInbox.tsx:BuilderInbox` - Exported Function (default)
- `BuilderMoneyBand.tsx:BuilderMoneyBand` - Exported Function (default)
- `BuilderProfileForm.tsx:BuilderProfileForm` - Exported Function (default)
- `LeadCard.tsx:LeadAccess` - Type Definition
- `LeadCard.tsx:LeadCardProps` - TypeScript Interface
- `LeadCard.tsx:LeadCard` - Exported Function (default)
- `UnlockSlip.tsx:UnlockSlipProps` - TypeScript Interface
- `UnlockSlip.tsx:UnlockSlip` - Exported Function (default)
- `WebBuilderOnly.tsx:WebBuilderOnly` - Exported Function

## Invariants
- `BuilderInbox.tsx:throw` - new Error(data.error || "Unlock failed")

## Side Effects
- `BuilderDashboard.tsx:fetchBuilderProfile` - External call or state mutation
- `BuilderDashboard.tsx:fetchBuilderInbox` - External call or state mutation
- `BuilderDashboard.tsx:fetchBuilderLedger` - External call or state mutation
- `BuilderInbox.tsx:fetchUnlockedContact` - External call or state mutation
- `BuilderInbox.tsx:fetch` - External call or state mutation

## Verification
- Run: `npm test`
