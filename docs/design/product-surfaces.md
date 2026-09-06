# Project-wide product design

**Authority: [A LOT MORE](./design-system.md), approved project-wide on 2026-09-06.**

There is one visual system before and after sign-in. Golden Hour is retired, not an alternative theme.
Legal copy, consent requirements, authentication, calculations, and payments must not change as a
side effect of styling.

## Surface ownership

| Surface | Implementation |
|---|---|
| Landing | `components/landing/lot-more/`; preserve optical spacing and responsive composition |
| Global palette and typography | `app/globals.css`, `app/layout.tsx`; Space Grotesk and Manrope |
| Shared controls and identity | `components/ui/`; square cards, 3px controls, neutral money, landing mark |
| Login, signup, reset and consent | `components/auth/`, auth routes; chalk forms and carbon checkbox |
| Account, builder, support and legal | Shared global tokens; no legacy theme boundary |
| Desktop/mobile Studio and 3D | `components/studio/`, `ParcelScene.tsx`, `lib/scene-lighting.ts` |
| Report and paid certificate | `ReportPreview.tsx`, `CertificatePanel.tsx`, `lib/report.ts` |
| Video renderer defaults | `remotion/theme.ts`, `remotion/demo/constants.ts`, `remotion/demo/fonts.ts` |

## Compatibility and reusable patterns

- `lot-*` tokens are canonical. Existing `lf-*` names resolve to the same global palette, not Golden Hour.
- `MoneyFigure` retains the old `forest` prop for API compatibility only; it renders carbon, not green.
- `font-mono` aliases Manrope; new components use `font-sans` and `tabular-nums`.
- `BrandLockup` uses the landing mark and Space Grotesk on both light and inverted shells.
- Consent uses a native 20px carbon checkbox, associated full-height label, and underlined deep-orange
  legal links. It remains unchecked by default with the existing provider/account-creation requirements.
- Carbon panels use chalk primary text and stone-on-dark secondary text. Orange controls use carbon labels.
- Status colors carry explicit labels/icons. Money is carbon on chalk or chalk on carbon.
- Controls have 3px corners; read-only panels/cards/badges are square. Circular indices, indicators,
  and slider thumbs remain circular. Motion respects reduced-motion preferences.

## Release verification

Run lint, unit tests (Windows: Git OpenSSL on PATH and `--maxWorkers=1`), TypeScript, production build,
and desktop/mobile Playwright checks. Inspect login/consent, Studio 3D and mobile journey, generated
report, builder/account coverage, keyboard focus, and 320px overflow before release.

PR CI must pass before merge. A merge is not a deployment: require the production deployment job and
hosted checks before reporting the design live. Record PR, commit, and checks in the handoff.

## External and historical boundaries

Provider-managed email/checkout templates, native-store assets, previously downloaded reports,
and archived videos are not rewritten by a web deployment. There is no repository-owned transactional
email renderer in this release. Apply this design authority when those surfaces are next configured;
do not claim they have changed without separate verification.
