# account

## Overview
Reusable user interface components and presentation widgets for account.

## Interface
- `AccountMenu.tsx:AccountMenuProps` - TypeScript Interface
- `AccountMenu.tsx:AccountMenu` - Exported Function
- `CertificatesClient.tsx:CertificatesClient` - Exported Function
- `DataExportButton.tsx:DataExportButton` - Exported Function
- `ProfileForm.tsx:ProfileFormProps` - TypeScript Interface
- `ProfileForm.tsx:ProfileForm` - Exported Function
- `SecurityPanel.tsx:SecurityPanelProps` - TypeScript Interface
- `SecurityPanel.tsx:SecurityPanel` - Exported Function
- `SettingsClient.tsx:SettingsClient` - Exported Function

## Invariants
- `DataExportButton.tsx:throw` - new Error(data?.error || "Export failed.")

## Side Effects
- `DataExportButton.tsx:fetch` - External call or state mutation

## Verification
- Run: `npm test`
