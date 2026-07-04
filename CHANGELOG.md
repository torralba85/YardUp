# Changelog

All notable changes to LotFoundry are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/) and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Repository governance doc (`docs/repo-governance.md`) covering the issue
  priority matrix, debugging/bisect methodology, repo health routine, and
  release/changelog strategy.
- Canonical label taxonomy (`.github/labels.yml`).

### Changed
- Replaced the landing-page hero video with an interactive daylight ADU scene
  that deconstructs into five feasibility layers as the user scrolls.
- Added responsive layer navigation, a no-WebGL illustration fallback, and an
  explicit daylight palette regression guard.

### Fixed
- Kept the landing ADU fully framed and unobstructed on narrow screens while
  reducing mobile WebGL load to avoid silent renderer failures.

## [1.0.1] - 2026-06-10

### Fixed
- `viewport-fit=cover` is now set so `env(safe-area-inset-*)` paddings take
  effect on notched iOS devices, especially in standalone PWA mode.
- Mobile studio header pads below the status bar (safe-area top inset) and
  the bottom sheet's scroll area clears the home indicator (bottom inset).
- Signed-in avatar button in the mobile header enlarged from 36px to a
  44px minimum touch target.
- Firebase Hosting immutable 1-year caching is now scoped to hashed
  `/_next/static/**` assets; unhashed public images and fonts use a 24-hour
  cache so icon and logo updates propagate to returning visitors.

### Added
- Mobile preview screenshot script (`scripts/preview-mobile-studio.mjs`)
  for visual verification of the wizard and bottom-sheet studio.

## [1.0.0]

Initial release: ADU feasibility studio with desktop and mobile-first
experiences, first-run wizard, Three.js parcel scene, permit guide,
inspiration gallery, estimate summary, export preview, Firebase auth and
hosting, and PWA support (manifest, offline page, service worker).
