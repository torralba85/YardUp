# Studio simplicity

Andrew approved reducing the Studio's visual density on September 13, 2026.
The existing A LOT MORE palette, typography, model geometry, financial engine,
authentication, and purchase flow remain the design and behavior foundations.

## Interaction hierarchy

- Desktop Design opens directly to size, roof, and exterior finish. It does not
  repeat the project journey, address search, reset, or report action.
- Your Lot owns address and sample-property selection. Rules & Fit retains the
  constraints and rent assumptions, with estimate provenance beside the figure.
- The project header shows compact address and feasibility context. Numbers &
  readiness discloses the detailed metrics and California baseline screen.
- Browse designs opens the existing inspiration gallery in place. Applying a
  concept still updates the same configuration and preserves the gallery tools.
- Tools groups placement, lighting/quality, utility planning, and site-plan
  export. The utility picker activates only during utility planning; closing
  Tools exits that mode. Existing anchors and estimates remain available in the
  current Studio session.
- Site-fit status, setback conflicts, and coverage warnings stay outside Tools.
  The model remains keyboard editable; fine-tune fields retain their bounds.
- Mobile keeps the five-reveal journey and optional inspector. The shared scene
  benefits from the same Tools grouping; mobile fine-tune dimensions start open.

## Verification

Tests cover direct Design entry, property selection and live parcel handoff,
configuration changes, disclosure visibility, utility-mode exit, export errors,
gallery application, and placement conflicts remaining visible with Tools closed.
Run the Studio, mobile journey, and design-system browser suites against a fresh
production build. This document records local implementation, not deployment.

Verified September 13: repository lint and production build passed; full Vitest
passed 1,176 tests across 175 files (21 tests skipped); the Studio, mobile journey,
and design-system Playwright suites passed 40 tests (12 platform-specific skips).
Desktop visual inspection confirmed direct Design entry and scrollable expanded
Tools. Mobile entry was also checked at 320px; the existing journey is preserved.
