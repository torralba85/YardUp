# LotFoundry improvements A–D

Recovered from Antigravity conversation `0666b3e6-df96-44a6-b3f1-778ebaa12700` (LotFoundry Improvement Ideas). The selected scope was A, B, C and D. Work is isolated on `feat/lotfoundry-improvements-20261025`, based on `d80a77e`, in `C:\Users\Andrew\LotFoundry\.worktrees\improvements-20261025`. Main-worktree landing edits and the original interrupted guide edits were preserved.

## Changes

- **A — Guide claims:** Clarified the Chula Vista and Escondido size descriptions, distinguished Carlsbad's local 30-day rental rule from the longer-than-30-day state-exempt/JADU rule, noted the state floor on attached-unit percentage caps, and corrected Oceanside's setback and impact-fee caveats. Added HCD source links for the corrections.
- **B — Zoning:** A shared code recognizer handles bracketed LA prefixes and full district boundaries. Commercial, industrial, planned and unknown designations do not acquire residential coverage by substring. Heuristic coverage stays estimated in parcel responses, including legacy live snapshots lacking field evidence; it cannot establish a verified compliant result.
- **C — Snap to fit:** A bounded deterministic search tries 0° and 90° orientations and validates every candidate with the existing geometry validator. It preserves a fitting pose and does not move the ADU if no candidate fits or the house footprint is unknown. Both the 3D view and the 2D WebGL fallback expose the control. It measures the estimated model, not surveyed or legally approved placement.
- **D — Builder intake:** Structured city/county/state coverage replaces comma parsing. Matching respects explicit state and county boundaries and retains legacy city entries. The homeowner previews an intake summary before consenting. The summary and normalized design JSON remain in the existing gated private contact document; the free lead preview contains neither. Owners and builders with an existing unlock can reopen the exact parcel, design, assumptions and placement through `/studio?lead=…`.

## Source checks and limits

The [HCD March 2026 ADU Handbook](https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf) was checked for the attached-unit size floor, side/rear setback cap, and state-exempt/JADU rental terms. Carlsbad's current IB-111 URL returned HTTP 403 during this run; existing city-specific claims were retained with explicit attribution, rather than reported as newly verified. This is a targeted correction of the selected claims, not a new audit of every municipal rule.

The search uses the Studio's current rectangular setback envelope and estimated house geometry. It does not establish easements, utility clearances, measured slope or permit eligibility. Intake marks slope as unmeasured. Invalid/incomplete real parcels and oversized saved payloads do not get a fabricated demo-layout link.

## Verification and delivery

Local verification results are recorded in `qa-artifacts/improvements/`. Browser screenshots are under `test-results/studio-snap-to-fit-*`. Focused tests cover district-boundary regressions, legacy uncertainty, placement geometry, service-area matching, consent/private payload separation, and access-controlled layout restoration.

No push, pull request, merge, Firebase deployment, payment transaction or message to a builder was performed. Hosted CI and real-account unlock behavior remain separate release checks.
