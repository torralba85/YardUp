# Website and native guest audit follow-up

## User-visible changes

- Aerial imagery and Neighborhood are geographic context, not placement proof. Do not project the modeled house, ADU, or setbacks onto unaligned imagery. The conceptual 3D drafting model remains the initial view.
- Live and legacy parcels qualify modeled placement separately from recorded GIS boundaries. House position and compass bearing remain unverified; a modeled fit is not zoning approval or a survey.
- The landing sample carries its advertised market rent and complete version-2 scenario into Studio, including reloads. Its demo and rent assumption are explicit.
- Native property guests can complete the existing first-free-lookup flow. Accounts still protect additional lookups, saved studies, and paid features. Back navigation preserves onboarding and journey behavior.
- Google/Apple consent controls retain the required unchecked agreement. Adjacent accessible instructions explain why sign-in is initially unavailable.

## Parcel identity boundary

King County's explicitly registered official situs layer verifies point hits and reconciles unique nearby address matches. Conflicts, ambiguous parcels, truncated responses, and unresolved address identity remain visibly uncertain; never select the nearest polygon. Only parcel IDs, situs fields, and area are requested. This is not nationwide address verification, a measured footprint, or survey evidence.

## Verification and release boundaries

Focused desktop/mobile browser regressions cover sample reloads, first-free native lookup, second-lookup consent gating, Back navigation, touch targets, and context-only imagery. Unit tests cover address identity, bounded reconciliation, placement evidence, and required social consent. Full unit/build/CI, production deployment, connected-device checks, and Google Play acceptance are separate release gates; this document alone does not certify them.

Existing A LOT MORE tokens, landing optical layout, placement mathematics, payment enforcement, and App Check requirements remain unchanged. Source precision does not imply permit approval. Remaining audits include actual signup/OAuth, account deletion, saved-study persistence, paid fulfillment/restore, and condition-specific permit guidance.

## Pre-merge review corrections (2026-09-30)

- Keep a native guest's active Studio/provider mounted through sign-in so its unsaved design and queued lookup survive; initial signed-in entry retains the private gate.
- Count evidence-qualified placement review in the aggregate verdict, not only the constraint row.
- Give the context notice and imagery attribution separate normal-flow footer rows so wrapping at 320px cannot obscure credits. Keep embedded provider credits uncropped with matching image/SVG aspect fitting; retain existing A LOT MORE colors and typography.
- Select a verified point's boundary and area from the same official situs feature as its PIN. Successful paid point hits cannot bypass official identity checks; unavailable identity reduces confidence rather than inventing verification.
- Split interior scan intervals at hole edges so valid courtyard parcels remain usable; malformed geometry still fails conservatively.
