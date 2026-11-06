# Pre-approved ADU plan references

Implemented in the free desktop Design and mobile Shape flows. A selection records a reference to official documents, independently of the modeled design. It is not a permit, a lot-eligibility finding, or a promise of faster approval.

## Sources and coverage

Listings were read on **2026-11-06**. The catalog covers the union of the 14 entries in `ADU_CITIES` and Seattle, Portland, Austin, Los Angeles, Oakland and Denver: 20 permitting jurisdictions. An unsuccessful verification attempt is not evidence that a program is unavailable.

| Authority | Verified evidence and initial selection |
| --- | --- |
| [Sacramento](https://adu.cityofsacramento.org/Shelf-ready-plans) | Shelf Ready Studio 367 sq ft, one-bedroom 559 sq ft, two-bedroom 747 sq ft. City calls plans free and all-electric; mirroring allowed, modifications prohibited, site plan required. Listing still specifies 2022 code: current-code acceptance must be checked. All three document links responded successfully. |
| [Unincorporated San Diego County](https://www.sandiegocounty.gov/content/sdc/pds/bldg/adu_plans.html) | ADU/SFD Plans A–F: 1,200 / 1,200 / 1,200 / 1,000 / 800 / 600 sq ft. Approximately 85% complete; project information and checklist required. G/H are SFD-only and excluded. Six document links responded successfully. |
| [City of San Diego](https://www.sandiego.gov/development-services/news-programs/programs/companion-junior-units) | City's “Preapproved ADU Plans” section explicitly accepts County standard plans (also lists Chula Vista and Encinitas programs). A–F appear as separate City references with this acceptance source. Licensing, currently adopted codes, local development rules and site review still apply. No cross-jurisdiction approval is inferred. |
| [La Mesa](https://www.cityoflamesa.gov/1821/Accessory-Dwelling-Units) | Plans A–E: 224 studio, 400 one-bedroom, 499 one-bedroom, 990 two-bedroom, 1,199 three-bedroom sq ft. Request official construction permitting set from Planning. Site plan, energy calculations, supplemental documents and soils report over 500 sq ft required. Publisher's direct preview links returned 404; omit broken document links and retain official listing/contact instructions. |
| [San Marcos](https://www.sanmarcosca.gov/Business-Services/Building-Division/Permit-Ready-ADUs) | Program confirmed; no individual plans curated yet. City links to an external Dropbox catalog. No alterations allowed; site information and deferred submittals required. Link to the City's program rather than duplicate unverified files. |
| [Imperial Beach](https://imperialbeachca.gov/268/Accessory-Dwelling-Units) | Program and official plan-set link confirmed. Individual plan details not independently verified; show program link without selectable placeholder plans. |

Other jurisdictions remain `needs-verification`: Chula Vista, Oceanside, Escondido, Carlsbad, San José, Encinitas, El Cajon, Vista, Seattle, Portland, Austin, Los Angeles, Oakland, Denver. Source review encountered blocked automated requests, unavailable paths, or no sufficient individual-plan evidence. Escondido's source is an ADU handout, not evidence of a program. No jurisdiction is labeled `unavailable` without an explicit official statement. Records retain the attempted source/date; expired paths fall back to the official authority's homepage, labeled as such.

## Data and behavior

- `lib/preapproved-plans-data.ts` maintains program availability and at most six curated plans per jurisdiction; `lib/preapproved-plans.ts` defines types, reference validation and exact city/state suggestions.
- A postal city only suggests the authority. The homeowner must explicitly confirm the authority that issues permits, including unincorporated county where appropriate. Browsing a different authority cannot attach its plans. Changing the authority removes the prior reference and requires confirmation again.
- Persist only `{ planId, jurisdictionId }` through saved scenarios, Firestore, restoration, shared URLs and emailed layout snapshots. Never persist user-authored approval metadata or document URLs.
- Optional metadata is additive to scenario v2. Unknown/withdrawn IDs remain readable and show “Plan unavailable.” Selection never changes geometry, placement, financial assumptions, AI briefs or certificate claims.
- Shared references carry a URL-only checksum of lot identity and parcel mode; it contains no raw address and is not an access-control token. Hydration rejects a scope mismatch so a live-lot reference cannot silently attach to a demo or another lot. Emailed layout links continue to restore the real lot through the existing opaque snapshot token. Bare live-lot links retain the existing app’s lot-restoration limits.
- Restored references restore their recorded permitting authority rather than replacing it with a postal-city guess. Withdrawing confirmation removes the reference.
- Switching lots or resetting clears the active reference. Reopening a saved study restores only its own reference. `plan=none` clears a reference inherited from an emailed snapshot, so removing it survives reload.

## Maintenance and release

Recheck official program acceptance and individual listings before adding/updating entries. Record verification dates, published code edition, licensing/cost conditions and restrictions. Use `needs-verification` when evidence is incomplete; use `unavailable` only with a source explicitly reporting unavailability. Retire plans with `status: "withdrawn"` instead of reassigning IDs. Keep document links optional when publishers require contact or their links no longer resolve. Do not invent prices, dimensions or approval timelines.

Deploy application and Firestore rules together after the release gate and local rules emulator pass. The additional reference checks must remain inside Firestore's 1,000-expression ceiling for a maximal live parcel. Bounded numeric comparisons already fail closed for non-numeric inputs; avoid duplicating numeric type expressions that consume this budget. Regression tests cover maximal payloads, non-numeric data, malformed references and cross-user access. No new indexes or collections are required. Rollback the app first; leaving the additive optional-field rules in place preserves new saved records.

## Review evidence

The implementation received an independent code review. Two Important findings were reproduced and fixed with failing-then-passing tests: URL references attaching to a different lot, and restored authority disagreeing with a saved county reference. No Critical or Minor findings were reported.

Desktop and mobile Chromium flows verified keyboard confirmation, selection without geometry changes, reload/restoration, removal, browsing another authority, unknown availability and horizontal overflow. Screenshots: [desktop](verification/preapproved-plans-desktop.png), [mobile](verification/preapproved-plans-mobile.png).

Implementation decisions: use a fresh feature checkout to isolate changes; use `plan=none` to distinguish removal from an older link with absent metadata; omit broken La Mesa document links in favor of the verified listing/contact path; retain numeric bounds while removing duplicate type expressions to fit the Firestore expression budget. These choices respectively cost an extra checkout, a URL-only removal marker, an extra click/contact step for those documents, and dependence on the rules language’s fail-closed numeric comparisons (covered by emulator tests).

Final local verification (2026-11-06): `npm run check` passed (lint, 3,000 unit tests passed / 89 skipped, TypeScript, production build); Firestore emulator 31/31 passed; focused desktop/mobile Chromium 4/4 passed. Browser tests used the environment’s installed Chromium through an uncommitted local launcher configuration. Production Firebase/auth smoke testing and deployment were not performed.
