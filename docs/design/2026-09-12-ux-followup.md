# UX audit follow-up

Repairs to the September 12 UX, color and typography audit, on top of PR #207.

## Behavior

- The landing's example link names the Seattle demo parcel. On the web, a valid
  sample URL opens the demo for guests and signed-in owners. Owners get the same
  studio a guest gets, so the URL restore still picks the mobile starting step:
  the default scenario begins at Find, a shared scenario at Earn. Ordinary owner
  entry still opens the property workspace. Pending address/live-parcel handoffs
  take precedence; builders still reach their dashboard. Native app onboarding
  keeps its existing entry rules.
- Entry intent is captured after hydration and held for that page mount. Studio's
  own scenario URL updates must not replace an active property workspace.
- Property search uses an opaque carbon focus ring and border. Support and Studio
  links hover to carbon instead of the lower-contrast orange button-fill token.
- The owner workspace supplies a focusable `main-content` skip-link destination.
- Mobile journey labels, estimate provenance, demo disclosure and the projected
  rent label use 12px text. Navigation and explanatory disclosures use normal
  casing; the global kicker and micro-print utilities retain their existing roles.

## Scope

The A LOT MORE palette and font families are unchanged. This pass does not change
the mobile landing's content order, the Earn-first journey, or the placement of
exact dimensions. Those audit recommendations involve broader product choices.
No native onboarding is added to web browsers.

## Verification

Route tests cover valid and invalid sample links, guest/owner entry, both real
handoffs, builder redirects and the native boundary. Browser regressions cover
keyboard skip navigation, field focus, signed-in example entry, hover color and
mobile label/readout fit. The existing design-system and mobile-journey suites
provide additional coverage. Record execution results and release state in the
shared audit handoff; a local fix does not establish production deployment.
