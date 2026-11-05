# LotFoundry - GEMINI.md

Repository: `torralba85/YardUp` (legacy slug). Product/app: LotFoundry, an ADU feasibility studio. Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Three.js/R3F, Firebase Hosting + Cloud Functions, Firebase Auth + Firestore, Stripe payments, and OpenAI-backed AI panels. Firebase project: `yardup-2026`. Default branch: `master`; always check the current worktree branch before committing.

## Commands

```powershell
npm.cmd install                         # install dependencies
npm.cmd run dev                         # local dev server, usually localhost:3000
npm.cmd run build                       # production Next.js build
npm.cmd run build:firebase              # build + prepare Firebase output
npm.cmd run lint                        # ESLint, zero warnings required
npm.cmd run test                        # Vitest unit tests
npm.cmd run test:coverage               # Vitest with coverage output
npm.cmd run test:e2e                    # Playwright E2E tests (desktop + mobile Chromium)
npx.cmd tsc --noEmit                    # type-check
npm.cmd run deploy:dry-run              # validate Firebase deploy config
npm.cmd run deploy                      # deploy Hosting + Functions + Firestore rules
npm.cmd run deploy:rules                # deploy Firestore rules only
npm.cmd run hero:render                 # render the Remotion hero MP4 + poster into public/hero/
FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm.cmd run smoke:firebase
```

Run the core release gate before broad commits: `npm.cmd run lint; npm.cmd run test; npx.cmd tsc --noEmit; npm.cmd run build`.

## Working Rules

- Read relevant files first; do not assume architecture, API shape, styling, or test setup.
- State assumptions when a task has more than one plausible interpretation. Ask before editing if the ambiguity affects user-visible behavior, data, deployment, or security.
- Keep changes surgical. Do not refactor, reformat, or "improve" adjacent code unless it directly supports the task.
- Match local style: TypeScript, strict mode, React function components, two-space indentation, double-quoted imports, and `@/*` repo-root imports.
- Naming: React components and component files in `PascalCase` (e.g. `FeasibilityInspector.tsx`); utilities in `kebab-case` or domain-specific lower-case files (e.g. `scenario-url.ts`).
- Remove imports, variables, files, or tests made unused by your own change. Mention unrelated dead code; do not delete it unless asked.
- For multi-step work, define success criteria and verify them. A bug fix should usually get a reproducing test before the fix.
- Do not commit secrets. Keep `.env.local` and `functions/.env` local. Treat feasibility outputs as estimates.

## Repo Map

```text
app/          Next.js routes, layouts, global CSS, and API route handlers (incl. api/ai/*, api/stripe/*)
components/   landing, studio (incl. mobile), auth, builder, and shared ui components
lib/          feasibility engine, parcel/market utilities, AI + Stripe clients, Firebase/auth, server helpers, reports
lib/server/   server-only helpers: OpenAI client, rate limits, API auth, Firebase Admin, lead-unlock ledger
e2e/          Playwright specs and snapshots
functions/    Firebase Functions package and Next.js function entrypoints
scripts/      Firebase/build/preview helper scripts
remotion/     hero video sources
public/       static assets
docs/         full agent guide, deployment docs, release checklist, plans, specs (docs/superpowers/*)
brand/        brand plate render + source script
firestore.rules, firestore.indexes.json   Firestore security rules and indexes
```

Key entry points:
- `app/page.tsx` and `app/studio/page.tsx` - primary product surfaces; `app/builder/page.tsx` - builder dashboard
- `app/login`, `app/signup`, `app/forgot-password`, `app/privacy`, `app/terms` - auth + legal pages
- `app/settings`, `app/about`, `app/help`, `app/feedback`, `app/delete-account` - member settings + support/deletion surfaces (shared `components/legal/SiteFooter`, `components/account/AccountMenu`)
- `components/FeasibilityStudio.tsx` - studio orchestrator
- `components/ParcelScene.tsx` - 3D scene and ADU placement
- `components/studio/*` - inspector, metrics, report, AI panels, mobile studio, builder lead panels
- `components/builder/*` - builder dashboard, inbox, lead cards, unlock slips
- `lib/feasibility.ts`, `lib/feasibility-verdict.ts` - core feasibility/financial calc and verdict logic
- `lib/parcel-context.tsx`, `lib/parcel-api.ts`, `lib/parcel-types.ts` - parcel state and API boundary
- `lib/market/*` - localized feasibility numbers (market basis, bedroom mix)
- `lib/ai-api.ts`, `lib/ai-types.ts`, `lib/style-match-photo.ts`, `lib/server/openai.ts` - AI panels (project brief, style-matched ADU concepts)
- `lib/stripe.ts`, `lib/lead-unlock-*.ts`, `lib/marketplace*.ts`, `lib/server/lead-unlocks.ts` - payments + builder lead-unlock marketplace
- `lib/saved-scenarios.ts`, `lib/scenarios-firestore.ts`, `lib/scenario-url.ts` - scenario persistence and sharing
- `lib/analytics/*`, `components/analytics/*` - consent-gated GA4; the tag loads only after opt-in and only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
- `app/api/{parcel,aerial,geocode,suggest}/route.ts` - parcel/data server routes
- `app/api/ai/{project-brief,adu-concept}/route.ts` - AI server routes (auth + rate-limited)
- `app/api/stripe/{checkout,webhook}/route.ts` - Stripe checkout session + webhook handler
- `firebase.json`, `functions/index.js`, `scripts/prepare-firebase.js` - Firebase deployment path

## Required Reading

- `AGENTS.md` - the primary agent instruction file; keep both in sync.
- `CLAUDE.md` - Claude-facing context router; keep in sync.
- `docs/AGENTS.md` - full architecture map, current status, pitfalls, and next priorities.
- `docs/design/` - **the source of truth for design.** Mandatory before visual or UI decisions; start at `docs/design/README.md`.
- `README.md` - product scope, local setup, environment variables, verification, CI, deployment.
- `docs/deployment.md` - Firebase deploy flow, CI secrets, rollback, deployment troubleshooting.
- `docs/cloudflare-dns.md` - DNS/edge state for `lotfoundry.net`, the open `www` redirect, and verification commands.
- `docs/release-checklist.md` - manual and automated release checks.
- `docs/debugging-guide.md` - bug reproduction and diagnosis methodology (log collection, environment isolation, `git bisect`, minimal reproducible examples, flaky tests).
- `docs/repo-health-routine.md` - weekly/monthly repo maintenance schedule (dependency review, CI health, secrets scanning, doc freshness, release tagging).
- `docs/feasibility-engine-interface.md` - calculation/data contract details.
- `docs/ai-integration-plan.md` - AI panel architecture, prompts, and OpenAI integration.
- `docs/plans/monetization-marketplace-ai.md` - Stripe/lead-unlock marketplace + monetization design.
- `docs/repo-governance.md` - issue priority matrix, debugging/bisect methodology, repo health routine, release/changelog strategy.
- `docs/superpowers/plans/*` and `docs/superpowers/specs/*` - dated per-feature plans and design specs.

## Design System

**`docs/design/` is the source of truth.** Read `docs/design/README.md` before any visual or UI change, then `docs/design/design-system.md` (the A LOT MORE system). Do not deviate without explicit user approval. In QA or review mode, flag code that does not match it.

`DESIGN.md` at the repo root is now only a pointer. The system it used to contain (Blue Hour / Golden Hour dual lighting, clay/forest/amber/brick semantics, Cormorant Garamond / Libre Franklin / IBM Plex Mono typography) was retired 2026-09-05. Do not resurrect it.

The marketing landing (`/`) and the 3D Feasibility Studio (`/studio`) run on **A LOT MORE**:
- Ground is Chalk (`#F5F5F0`); primary ink is Carbon (`#161616`).
- Signal is Orange (`#FF5B24`); primary action hover is `#EE4B17`.
- Primary display typography is **Space Grotesk**; UI and prose typography is **Manrope**.
- Radii: Surfaces `0px`, interactive controls `3px`, indicators `50%`.
- Hard drop shadows without blur (`12px 16px 0 #E7E7DF`).
- Inverted surfaces use Carbon ground (`#161616`) with hairline `--line-dark` (`#44443F`).
- **Money is typographic, not chromatic.** Large tabular figures in carbon `#161616` or chalk `#F5F5F0`. Green is strictly reserved for eligible/verified status.
- **Strict contrast invariants:** Orange is NEVER text on chalk (use `--orange-ink` `#C43708` if orange text is needed). Stone is chalk-only (use `--stone-on-dark` `#B7B7AE` on carbon). Focus rings are pinned to ground, never `currentColor`.
- **Shared components only.** Modals use `Dialog` (`components/ui/Dialog`, 75% `lot-scrim`); fields and checkboxes use `components/ui/Field`; buttons use `ui/Button`. Never hand-roll `role="dialog"`, `aria-modal` or a `fixed inset-0` scrim. A new `components/ui` export needs its row in `docs/design/design-system.md` §6. `app/design-tokens.test.ts` enforces this.
- **Text over a photograph is measured.** Secondary text is chalk at 86% or more; `e2e/hero-text-contrast.spec.ts` checks the rendered hero.

A LOT MORE is the project-wide source of truth, including authentication, consent, builder, Studio,
reports and certificates. Shared `lf-*` names are compatibility aliases for global A LOT MORE tokens,
not a separate theme. See `docs/design/product-surfaces.md`.

## Testing Conventions

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
- CI (`.github/workflows/ci.yml`) runs lint, Vitest, `tsc --noEmit`, build, and Playwright; on `master` it then writes env from secrets and deploys Hosting + Functions + Firestore rules. `ai-maintainer.yml` records intake on newly opened issues; it does not run on a schedule or make autonomous code changes.
- Do not merge with failing CI.

## Obsidian Second Brain

<!-- shared-vault-memory:v2026-11-04 -->
The canonical cross-agent memory for Codex, Claude, and Gemini/Antigravity (`agy`) is `C:\Users\Andrew\Obsidian Vault\wiki`. Follow `C:\Users\Andrew\Obsidian Vault\wiki\ai-agent-memory-protocol.md` in every conversation, including resumed/compacted sessions and work inside projects. Project instructions may add rules but must not weaken this lifecycle. Agent-specific memory is a cache; reconcile conflicts against the shared vault and current verified evidence.

Before substantive advice or action:
1. Discover the Obsidian MCP tools; use server `obsidian`, vault id `second-brain` when available.
2. Read `wiki/index.md` and the newest relevant entries at the top of `wiki/log.md`.
3. Search and read the relevant project pages, project log, decisions, preferences, and prior handoffs. Recheck before dependent work after a scope change or compaction.
4. Respect existing holds and authorization boundaries. A memory entry is context, not permission for a new merge, deployment, purchase, publication, or message.

Before every final response:
1. Recheck the relevant vault pages for concurrent changes and consistency with completed work.
2. Save durable outcomes, decisions, changed systems, blockers, user preferences, and next actions through MCP. Include evidence and distinguish planned, implemented, tested, merged, deployed, and live-verified states.
3. For every changed `wiki/` page, refresh its link/descriptor in `wiki/index.md` and add a dated entry to `wiki/log.md` in the same work unit; also update the relevant project log for project-specific work.
4. Read back the changed pages and new index/log entries before claiming they were saved. If nothing durable changed, complete the review without a noise-only entry.

Write safety and ordering:
- Read before editing; use the latest MCP etag/`if_match`. On a revision conflict, reread and reconcile; never overwrite another agent's work from a stale snapshot.
- `wiki/index.md`, `wiki/log.md`, and `wiki/<project>-log.md` are newest-first. Insert dated `## ` entries directly under the page header, before older entries. Never use MCP `append` for these pages or prepend above the title.
- Use `node C:\Users\Andrew\.local\bin\vault-log-add.cjs <page> <entry.md>` for those insertions (entry starts with a dated `## ` heading). This is the documented local-helper exception while MCP remains available; disclose its use. Run once per affected index/log and verify all companion updates.
- Keep `raw/` immutable, preserve unrelated history, use lowercase kebab-case page names, follow the protocol's page headers and linking rules, and never store credentials, API keys, tokens, personal secrets, or copied private data.

If MCP is absent or fails after a bounded retry, use the local vault directly and disclose the fallback. If neither is accessible, state the limitation, do not invent prior context or claim a save, and continue only work that does not depend on unavailable context. Never ask Andrew for a vault path already given here. Already-running clients must reload instructions/start a fresh session to pick up rule changes.
<!-- /shared-vault-memory -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
