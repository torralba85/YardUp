# LotFoundry — CLAUDE.md

ADU feasibility studio. Next.js 16 App Router + React 19 + Three.js (R3F) + Firebase Hosting/Functions. Firebase project: `yardup-2026`. Repo: `torralba85/YardUp`, branch `master`.

## Commands

```bash
npm run dev             # localhost:3000
npm run build           # production build
npm run build:firebase  # build + prepare Firebase output
npm run deploy          # Firebase Hosting + Functions + Firestore rules
npm run lint            # ESLint (zero warnings required)
npm run test            # Vitest unit tests
npm run test:e2e        # Playwright E2E
npx tsc --noEmit        # type-check
```

Run all four before every commit: `npm run lint && npm run test && npx tsc --noEmit && npm run build`

## Full Guide

See [`docs/AGENTS.md`](docs/AGENTS.md) — architecture map, design tokens, API routes, Firebase setup, common pitfalls, and next priorities.

## Critical Gotchas

- **R3F `Text` → use `LabelSprite` instead** — `troika-three-text` loads fonts via CDN, fails silently in dev
- **`react-hooks/set-state-in-effect`** — suppress with `/* eslint-disable */` when URL hydration sync requires it
- **Demo mode** — app works without API keys (3 presets: Seattle, Portland, Austin)
- **`three` types** — import `ThreeEvent` from `@react-three/fiber`, not as a global
