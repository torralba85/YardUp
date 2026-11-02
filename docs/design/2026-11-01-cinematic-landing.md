# Cinematic landing

Andrew asked to make lotfoundry.net "award winning" on November 1, 2026. Offered a choice between
sharpening the page within the A LOT MORE rules and a cinematic rework that breaks four of them
(autoplay, gradients, blurred shadows, pills), he chose the cinematic rework. Implemented on
`feat/landing-cinematic-20261101`, based on `7efa386`, in the worktree
`C:/Users/Andrew/LotFoundry/.worktrees/landing-cinematic-20261101`.

## Why

The live homepage scored about 6.5/10 against a landing-jury rubric (first glance, signature,
typography, composition, colour, media, motion, mobile, copy, polish). Three things held it back:

- The first screen stacked nine elements in the left column, and the "A LOT MORE." display pulled the
  eye away from a 22px h1.
- The maquette, the brand's signature, sat inside corner ticks, captions, numbered pins, a readout card
  and tabs, so it read as a widget rather than the hero.
- On a phone the maquette was not in the first screen at all.

## Resulting page

- **Hero.** `backyard-life.webp` runs full-bleed under carbon scrims (left-to-right behind the copy, a
  bottom one, a short top one behind the header; one vertical scrim on phones). The header floats over
  it in chalk with an inverse chalk CTA. The wordmark is larger (`clamp(76px, 10.2vw, 156px)`) and each
  line rises out of its own mask; the h1 moves to Space Grotesk at `clamp(26px, 2.6vw, 38px)` on one
  line. The address bar and the engine's sample result share one glass material. The sample result
  anchors bottom-right with the "Illustrative backyard home concept" label beneath it.
- **The model.** A new section, "Watch a yard become a home.", holds the maquette and its
  Today/Footprint/Possibility picker. With motion allowed and a viewport at least 700px tall it pins a
  stage for 340svh and maps scroll thirds to the three scenes, with a 0.94 → 1.02 camera scale and an
  orange progress rail. Three chapters (what's there, what fits, the possibility) follow the scene. A
  scene picked by hand holds until scroll crosses into another third. Otherwise the section is static
  and the picker drives it, as before.
- **Short phones.** Up to 720px tall, the hero tightens its top padding and wordmark so the address
  button clears the first-visit consent bar: at 390×664 the button ends at 503px and the bar starts
  at 533px. At 320×568 the bar still covers the button, as it does on the live page (523px vs 419px).
- **Below.** Each section's children rise in once as they enter the view. The Google Play badge moves
  from the hero to the closing section.
- Square radii stay. Pills were not adopted. There is no video: the homepage e2e asserts none, so the
  motion is CSS transforms over the existing photograph.

## Performance notes

- Chrome counts the full-bleed photograph as background, so the **h1 is the LCP element**. It animates
  transform only. A blur-in tried first held LCP until the animation ended (1.9s locally), and was
  removed.
- The header fades without moving. A translate left the 44px home target measuring 43.99px on the
  2.75× mobile project (`e2e/design-system.spec.ts`).
- The parcel renders sit on a warm cream (`#F8F3E9`) that `multiply` turned into a visible box on chalk.
  The model section uses `darken` and an edge mask fitted to the measured render bounds instead.

## Verification

- `npx tsc --noEmit`, `npm run design:check`, ESLint on `components/landing/lot-more/`.
- Vitest: `components/landing` and `app/design-tokens.test.ts`, 67 tests.
- `npm run build` (production), then Playwright `hero`, `visual-breakpoints`, `design-system` and
  `analytics-consent` specs on desktop and mobile against `next start`, built with a test GA ID so the
  consent-banner layout tests run.
- Screenshot review at 1440×900, 1280×720 and 390×844, including the pinned stage at 12%, 50% and 90% of
  its travel. Evidence: [`evidence/cinematic-landing/`](./evidence/cinematic-landing/).

## UI/UX audit follow-up (2026-11-01)

The cinematic composition, photo scrims, glass forms, model narrative and explicit
estimate labels are retained. Audit fixes:

- At 320 x 568 the large two-line brand displaced the primary action behind consent.
  Below 381px wide and 621px tall, a compact single-line brand prioritizes address entry.
- Automatic hero motion now finishes within 4.8 seconds; the decorative footprint
  dash runs once for four seconds, instead of looping indefinitely.
- Keyboard focus reveals a section immediately, without waiting for its viewport trigger.
- The model pinning responds to reduced-motion changes and short viewport resizes
  without a reload. This also handles a phone keyboard reducing available height.

Regression coverage: `e2e/cinematic-audit.spec.ts` and consent-banner layout checks
at 390 x 844, 390 x 664 and 320 x 568. Final verification recorded in the PR audit commit.

Audit screenshots: [320px phone](evidence/cinematic-landing/audit-phone.png) and
[1440px desktop](evidence/cinematic-landing/audit-desktop.png). The desktop hero
also reserves more bottom space; short desktop viewports use a smaller wordmark.
Review criteria included the [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).

Validation: lint, TypeScript and the production build passed; full Vitest passed
292 files / 2,839 tests (4 files / 85 tests intentionally skipped). Focused landing
coverage passed 67 tests. Production desktop/mobile browser coverage initially
passed 70 tests with 3 intentional skips; one mobile handoff test was intercepted
by the unanswered Studio consent banner. That test now declines consent before
using the Studio footer, with dedicated landing consent-layout checks kept intact.
The corrected mobile handoff passed its focused production rerun (1/1).
