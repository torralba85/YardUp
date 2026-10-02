# Color audit and A LOT MORE refinement

## Direction

**A calm drawing board, with a clear next step.** Chalk is the planning surface; carbon carries
facts and structure; signal orange marks the action that moves the current task forward. Stone
supports context. Green, amber and red describe evidence and readiness, always with words and icons.
Money is a measurement in neutral ink. A vivid action never implies a permit, verified parcel, or
guaranteed return.

Keep the signature miniature parcel, architectural composition, Space Grotesk display and Manrope
body. Physical ADU finishes and geographic imagery retain their actual colors. Inverting a section
to carbon is a layout choice; the application does not follow the operating system's dark mode.

| Role | Color | Use |
|---|---|---|
| Planning ground | Chalk `#F5F5F0` | Page and form surfaces |
| Facts / structure | Carbon `#161616` | Text, money, selected controls, sidebar |
| Next action | Signal orange `#FF5B24` | Primary action fill, carbon label |
| Action hover | `#EE4B17` | Primary fill hover, carbon label |
| Link / focus | Deep orange `#C43708` | Text and focus on light surfaces; never a second primary fill |
| Quiet context | Stone `#65655F` / `#B7B7AE` | Secondary text on light / dark surfaces |
| Surface hierarchy | `#EBEBE6` / `#FDFDF9` | Recessed neutral surface / raised paper |
| Eligible / review / blocked | `#176B4C` / `#8A5300` / `#A82D16` | Readiness only; use their `on-dark` partners on carbon |

## Why colors drifted

1. **A documented palette had several owners.** Global CSS, a landing CSS Module, report HTML,
   Remotion constants and native manifests repeated values. Changing one copy did not change the others.
2. **Compatibility became the default.** New components copied retired `lf-*` color names from neighbors.
   The September audit recommended a freeze but it was not enforced. Existing checks rejected a short
   blacklist, not new hardcoded values or growing alias use.
3. **Correct colors were used for the wrong job.** `FeasibilityVerdictBand` used orange text ink as a
   button fill with chalk text, creating the rust-colored header button in the supplied screenshot.
   `BillingLedger` used status green for credits and green/amber for transaction categories.
   `MetricsSummary` still put a green line under money and called the accent `forest`.
4. **Primary emphasis had no owner.** Save, sidebar sign-in and certificate actions all competed.
5. **Comments and API names taught the retired system.** Money's `forest` prop and mono recorded-fact
   guidance encouraged recurrence even when their current CSS happened to look correct.

## Implemented

- `design/tokens.json` is the executable palette. `npm run design:generate` produces the committed
  `app/design-theme.css`. `app/globals.css` imports it. Landing local variables reference shared variables.
  Renderers import `COLOR` from `lib/design-tokens.ts`; exported reports embed resolved colors.
- A bounded utility migration replaced 1,772 legacy references and 231 raw hex color utilities, including
  test expectations. Radius and hard-shadow recipes now have named tokens. Compatibility definitions
  remain generated aliases; they are forbidden in authored product source.
- Studio Save uses the shared neutral secondary button. Sidebar sign-in is outlined on carbon.
  View certificate remains the signal-orange action for Rules & Fit. Auth dialogs retain their own primary
  submit action. Reset and property editing remain quiet utilities.
- Credits, ledger categories and money underlines are neutral. The `forest` MoneyFigure API is removed.
  Calculator figures use the shared numeric type scale. Meaning-bearing field and secondary-button
  boundaries use stone. Neighborhood HUD and autocomplete/report surfaces use opaque chalk where
  legibility previously depended on imagery plus blur.
- Neighborhood parcel outline is neutral context, not an unexplained green verification signal.
- Shared colors reach report, social-card, scene chrome and video source renderers. Kickstarter's separate
  card/status palette now uses shared surface and on-dark status roles.
- Canvas site-plan and PDF utilities also import the palette; their duplicated colors and separate
  gray lot surface are removed. Print white has its own explicit paper role.
- Android's bundled web manifest still contained retired `#F2E5D5`; its two theme fields now match chalk.

## Prevention

`npm run lint` includes `npm run design:check`, so the existing required CI quality job enforces it.

- Generated theme must match the palette exactly.
- No legacy color utilities, raw hex utilities, undefined tokens, retired mono classes, secondary action
  ink fills, or unapproved backdrop blur / blurred Tailwind shadows.
- Source scan covers application, components, libraries, hooks, canvas/PDF utilities, content, Functions,
  Remotion, public vectors/HTML and native source assets. Comments are excluded from TypeScript using
  its parser. CSS is parsed for syntax as well as checked for literal colors.
- `design/color-exceptions.json` freezes **each literal and its count per file**. Materials, Google marks,
  standalone platform files and existing renderer overlays have explicit reasons. A reduction in one file
  cannot fund a new color in another. This is a reviewed exception register, not a snapshot to regenerate
  whenever CI fails. Retire entries when removing the corresponding literal.
- Calculated text pairs, hover pairs and composited status-chip tints must meet 4.5:1; meaningful edges
  and focus must meet 3:1. Native manifest/Gradle colors and offline/iOS shell values are checked against
  the same palette. The scanner itself has adversarial fixtures.
- Regression checks cover neutral money/category semantics and actual rendered Studio action hierarchy.

Before adding a color: identify its job and surface, reuse a role, measure the pair, add a documented
role only if needed, regenerate, run the checks and inspect desktop/mobile. Do not change a semantic
role merely because its current value matches the color you want.

## Coverage and limits

The static inventory covers 385 source and vector/platform files at completion. It excludes
test fixtures, build output, dependency files and raster/video pixels. Shared component changes affect
auth, consent, account, builder, support, public calculators, Studio and certificates. This is a color/design
audit, not a claim that every payment, account, GIS or native release flow was exercised.

Google/Cesium imagery and provider marks, realistic finish materials, historical exported media, and
provider-hosted checkout/email are not recolored. Cesium's default-token warning in the screenshot is
a provider configuration issue, not theme drift; attribution and warnings remain visible. The current
guard detects code-level recurrence; rendered review remains necessary for contrast over images,
opacity, external content and inappropriate semantic use in new features.

No hosted deployment or native-store release is implied by these source changes.

## Local verification — 2026-10-01

- `design:check`: 385 files, zero authored legacy color aliases or arbitrary hex utilities; five guard
  checks pass, including contrast, native parity, semantic roles and adversarial scanner fixtures.
- Full unit suite: 1,822 passed, 76 skipped across 227 files. Final focused report/design/MoneyFigure/
  SceneTools rerun: 37 passed. The full suite preceded the final canvas/PDF token substitution.
- TypeScript, production build, lint and repository hygiene checks passed locally. No hosted CI run
  is claimed. The initial build caught a malformed declaration from the migration; it was fixed and
  CSS parsing was added to the guard before the successful build.
- Production-build Playwright: `design-system.spec.ts` and `ux-audit-followup.spec.ts`, desktop and
  mobile: 26 passed, four intentional device-specific skips. Checks include actual Studio action
  colors/focus, account entry, auth/consent defaults, font/surface parity and narrow-screen overflow.
- Manual Chrome review: desktop Studio model and neighborhood HUD, mobile income step, and the
  landing page at 390px and 320px. No horizontal overflow in those mobile views. The linked sample
  retains its $2,350/mo market assumption. Neighborhood provider tiles were incomplete in this local
  session; the map is not presented as verified provider rendering.
- Evidence: `LotFoundry/artifacts/color-system-20261001/`, including `studio-before.png`,
  `studio-model-after.png`, `studio-after.png`, `studio-mobile.png`, `landing-mobile.png` and logs.

The implementation is on `fix/color-system-20261001` in the isolated worktree
`LotFoundry/.worktrees/color-system-20261001`. The primary checkout and unrelated worktrees are preserved.

## References

- [better-colors skill](https://github.com/jakubkrehel/skills/tree/main/skills/better-colors), installed in
  the outer workspace `.agents/skills/better-colors`; used with the installed design-system audit skill.
- [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and
  [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- Previous project findings: [September audit](./2026-09-18-design-system-audit.md) and
  `LotFoundry/artifacts/design-system-audit-2026-09-30.md`.
