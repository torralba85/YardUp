# YardUp / LotFoundry - CLAUDE.md

YardUp repo: `torralba85/YardUp`. Product/app: LotFoundry, an ADU feasibility studio. Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Three.js/R3F, Firebase Hosting + Cloud Functions. Firebase project: `yardup-2026`. Default branch: `master`; always check the current worktree branch before committing.

## Commands

```bash
npm install                         # install dependencies
npm run dev                         # local dev server, usually localhost:3000
npm run build                       # production Next.js build
npm run build:firebase              # build + prepare Firebase output
npm run lint                        # ESLint, zero warnings required
npm run test                        # Vitest unit tests
npm run test:e2e                    # Playwright E2E tests
npx tsc --noEmit                    # type-check
npm run deploy:dry-run              # validate Firebase deploy config
npm run deploy                      # deploy Hosting + Functions + Firestore rules
FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase
```

Run the core release gate before broad commits: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

Use `.claude/launch.json` for Claude launch configs: `lotfoundry-dev` on port 3000 and `lotfoundry-preview` on port 4517.

## Working Rules

- Read relevant files first; do not assume architecture, API shape, styling, or test setup.
- State assumptions when a task has more than one plausible interpretation. Ask before editing if the ambiguity affects user-visible behavior, data, deployment, or security.
- Keep changes surgical. Do not refactor, reformat, or "improve" adjacent code unless it directly supports the task.
- Match local style: TypeScript, strict mode, React function components, two-space indentation, double-quoted imports, and `@/*` repo-root imports.
- Remove imports, variables, files, or tests made unused by your own change. Mention unrelated dead code; do not delete it unless asked.
- For multi-step work, define success criteria and verify them. A bug fix should usually get a reproducing test before the fix.
- Do not commit secrets. Keep `.env.local` and `functions/.env` local.

## Repo Map

```text
app/          Next.js routes, layouts, global CSS, and API route handlers
components/   landing, studio, auth, builder, and shared UI components
lib/          feasibility engine, parcel utilities, Firebase/auth, reports, tests
e2e/          Playwright specs and snapshots
functions/    Firebase Functions package and Next.js function entrypoints
scripts/      Firebase/build helper scripts
remotion/     hero video sources
public/       static assets
docs/         full agent guide, deployment docs, release checklist, specs
```

Key entry points:
- `app/page.tsx` and `app/studio/page.tsx` - primary product surfaces
- `components/FeasibilityStudio.tsx` - studio orchestrator
- `components/ParcelScene.tsx` - 3D scene and ADU placement
- `components/studio/*` - inspector, metrics, report, mobile studio, builder lead panels
- `lib/feasibility.ts` - core feasibility and financial calculations
- `lib/parcel-context.tsx`, `lib/parcel-api.ts`, `lib/parcel-types.ts` - parcel state and API boundary
- `app/api/parcel/route.ts`, `app/api/aerial/route.ts`, `app/api/geocode/route.ts`, `app/api/suggest/route.ts` - server API routes
- `firebase.json`, `functions/index.js`, `scripts/prepare-firebase.js` - Firebase deployment path

## Required Reading

- `AGENTS.md` - the Codex-facing twin of this file (mirror); keep both in sync.
- `docs/AGENTS.md` - full architecture map, current status, pitfalls, and next priorities.
- `DESIGN.md` - mandatory before visual or UI decisions.
- `README.md` - product scope, local setup, environment variables, verification, CI, deployment.
- `docs/deployment.md` - Firebase deploy flow, CI secrets, rollback, deployment troubleshooting.
- `docs/release-checklist.md` - manual and automated release checks.
- `docs/feasibility-engine-interface.md` - calculation/data contract details.
- `docs/repo-governance.md` - issue triage, bisecting/repro, branch strategy, release/maintenance cadence, and the `.github/` templates they support.

## Design System

Always read `DESIGN.md` before making visual or UI changes. Fonts, colors, spacing, layout direction, and brand tone are defined there. Do not deviate without explicit user approval. In QA or review mode, flag code that does not match `DESIGN.md`.

Project-specific design rules:
- Forest green is for positive financial value only.
- Clay is the interactive/action accent.
- Amber signals permit risk or review-needed states.
- Brick signals genuine blockers.
- Use Cormorant Garamond for display/hero numbers and dollar figures, Libre Franklin for body/control text, and IBM Plex Mono for tabular/recorded-fact values (APNs, dimensions, status chips). `DESIGN.md` is the source of truth — defer to it if it diverges.

## Environment

Local live-data variables usually live in `.env.local` and/or `functions/.env`:

```bash
GOOGLE_MAPS_API_KEY=<server-side Maps Static + Geocoding key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
REGRID_API_KEY=<server-side Regrid Parcel API key>
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<Firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<Firebase project ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<Firebase storage bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<Firebase messaging sender ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<Firebase web app ID>
```

Without parcel API keys, the app must still run in demo mode with Seattle, Portland, and Austin presets. Without Firebase overrides, the checked-in `yardup-2026` web app config is used.

## Critical Gotchas

- R3F text: avoid Drei/Troika `Text` when possible; use the canvas-based `LabelSprite` pattern because font loading can fail silently in dev.
- React hooks lint: Next.js 16 can flag intentional hydration sync with `react-hooks/set-state-in-effect`; use a narrow disable comment only when the effect pattern is intentional.
- Three event types: import `ThreeEvent` from `@react-three/fiber`; do not rely on a global type.
- Parcel positioning: the house and ADU placement are derived from lot dimensions and setbacks. Do not hardcode Z positions.
- Hydration-safe motion: prefer CSS `motion-safe:` variants for hover/tap transforms. Avoid JS motion wrappers that change server/client attributes when CSS can do it.
- Firebase Functions: `app` and `api` functions serve the same Next.js app through different rewrites. Keep `firebase.json`, `functions/index.js`, and `scripts/prepare-firebase.js` aligned.
- Audit warning: do not run `npm audit fix --force`; it may force a breaking Next.js downgrade. Track upstream fixes instead.
- Worktree location: commit from the repo worktree, not the outer `C:\Users\torra\Downloads\Repos\AR ADU` container.

## Testing Guidance

- Unit tests use Vitest with `jsdom`, globals, and `test/setup.ts`; place tests beside code as `*.test.ts` or `*.test.tsx`.
- Playwright specs live in `e2e/*.spec.ts`. Screenshot-heavy tests should use `testInfo.outputPath(...)` unless intentionally updating baselines.
- Run focused tests for narrow changes, then the core release gate for broad UI/auth/data/deploy changes.
- For visual or responsive work, include desktop and mobile Playwright coverage or screenshots where practical.
- For Firebase/Auth changes, run the smoke command with a dedicated test user when credentials are available.

## Git Workflow

- Check `git status --short --branch` first; this workspace uses multiple worktrees.
- Use Conventional Commits such as `fix(landing): ...`, `feat(parcel): ...`, `style(studio): ...`, `chore(ci): ...`.
- Keep commits focused to one logical change.
- Pull requests should describe behavior, list verification commands, link issues when relevant, and include screenshots/recordings for landing, studio, or responsive UI changes.
- Do not merge with failing CI.

## Obsidian Second Brain

Obsidian is the durable second brain and memory layer. `CLAUDE.md` is the compact context router for this repo; do not bloat it with session logs, source dumps, or long-lived research notes that belong in Obsidian.

Use the Obsidian MCP or the configured Obsidian vault whenever the task depends on prior decisions, saved research, user preferences, project memory, meeting notes, source documents, or cross-session continuity. If Obsidian tooling is unavailable, say so and ask for the vault path or exported notes instead of inventing memory.

The intended pattern follows the Karpathy / James Keet LLM Wiki workflow:

```text
raw/            immutable source documents; never modify these
wiki/           markdown pages maintained by the agent
wiki/index.md   table of contents and routing layer
wiki/log.md     append-only operation log
```

Before answering from memory:
- Read `wiki/index.md` first to find the relevant pages.
- Follow links only to pages needed for the current task.
- Cite the wiki/source pages used.
- If the wiki does not contain the answer, say so clearly and fall back to repo files or live research.
- If an answer creates durable knowledge, offer to save it back into Obsidian.

When ingesting a new source into Obsidian:
- Read the full source document first.
- Discuss key takeaways with the user before writing synthesis.
- Create a summary page in `wiki/` named after the source.
- Create or update concept pages for major ideas, entities, decisions, and workflows.
- Add `[[wiki-links]]` between related pages.
- Update `wiki/index.md` with new or changed pages and one-line descriptions.
- Append `wiki/log.md` with the date, source name, and what changed.

Every wiki page should use this shape:

```markdown
# Page Title

**Summary**: One to two sentences describing this page.
**Sources**: Source files or URLs this page draws from.
**Last updated**: YYYY-MM-DD

---

Main content with clear headings, concise paragraphs, and [[wiki-links]].

## Related pages

- [[related-page]]
```

Wiki maintenance rules:
- Keep page names lowercase kebab-case.
- Use clear, plain language.
- Reference source files for factual claims.
- Note contradictions between sources explicitly.
- Mark unsourced claims as needing verification.
- When linting the wiki, check for contradictions, orphan pages, missing concept pages, outdated claims, and page-format drift.
