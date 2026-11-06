# City-specific pre-approved ADU plans implementation

Approved spec: conversation plan, 2026-11-06. Execute inline.

Goal: browse up to six officially verified plans per existing jurisdiction and save one reference with a lot study, independently of the 3D model.

## Tasks
- [x] Catalog: typed jurisdiction/program/plan records, source verification, matching and safe reference helpers; tests for coverage, authority separation, withdrawn/unknown plans and unsafe data.
- [x] Persistence: optional IDs through local/Firestore storage, restoration and shared links; backward compatibility and rules ownership tests.
- [x] Studio: shared accessible catalog and selected summary in desktop Design/mobile Shape; confirmed matching authority, replace/remove, clear on lot change, restore saved choice; component/integration/browser tests.
- [x] Release checks: lint, full unit suite, types, build, rules emulator and focused browsers. Review diff and document evidence/limits. Do not merge or deploy.

## Interfaces
`PreapprovedPlanReference { planId: string; jurisdictionId: string }`; selected references never carry user-authored approval claims or URLs. Approval metadata resolves from the curated catalog.

## Defaults
Free browsing; existing account save gate. Repository-managed data, official external documents, no new API. Unknown availability must remain explicitly unverified. Existing scenario v2 remains valid with an optional additive field.

## Review focus
City/state exact matching; unincorporated county is explicit; unknown/withdrawn saved IDs retain a visible unavailable reference; URL state cannot carry a prior lot selection into a new lot; selection never alters model or finances. App/rules ship together only after verification.
