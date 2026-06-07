# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16/React 19 app for the LotFoundry ADU feasibility studio. Routes and global CSS live in `app/`, including `app/studio`, `app/login`, and `app/api`. Shared UI and feature components live in `components/`, grouped by `landing`, `studio`, `auth`, and `ui`. Core logic, Firebase access, parcel utilities, and unit tests live in `lib/`. Playwright specs and snapshots live in `e2e/`. Static assets are in `public/`, Firebase Functions are a separate package in `functions/`, and Remotion hero-video sources are in `remotion/`.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production Next build.
- `npm run lint`: run ESLint with `--max-warnings=0`.
- `npm run test`: run Vitest unit tests once.
- `npm run test:coverage`: run Vitest with coverage output.
- `npm run test:e2e`: run Playwright tests against desktop and mobile Chromium.
- `npm run deploy:dry-run`: validate Firebase deploy configuration.
- `npm run hero:render`: render the Remotion hero MP4 and poster into `public/hero/`.

## Coding Style & Naming Conventions

Use TypeScript, strict mode, React function components, and the `@/*` path alias for repo-root imports. Follow existing two-space indentation and double-quoted imports. Name React components and component files in `PascalCase` such as `FeasibilityInspector.tsx`; name utilities in `kebab-case` or domain-specific lower-case files such as `scenario-url.ts`.

## Testing Guidelines

Vitest uses `jsdom`, globals, and `test/setup.ts`; place unit tests beside code as `*.test.ts` or `*.test.tsx`. Playwright specs belong in `e2e/*.spec.ts`; screenshot-heavy tests should write transient files with `testInfo.outputPath(...)` unless a baseline update is intentional. Run lint, unit tests, typecheck, build, and relevant Playwright specs before broad UI or auth changes.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commit style: `feat(landing): ...`, `fix(landing): ...`, `style(studio): ...`, and `chore(ci): ...`. Keep commits scoped and imperative. Pull requests should describe behavior, list verification commands, link issues when available, and include screenshots or recordings for landing, studio, or responsive UI changes. Do not merge with failing CI.

## Security & Configuration Tips

Store local secrets in `.env.local`; never commit API keys. Parcel, Google Maps, and Firebase variables are documented in `README.md`. Use `npm run deploy:dry-run` before Firebase deploys, and treat feasibility outputs as estimates.
