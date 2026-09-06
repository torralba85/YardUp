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

Obsidian is the durable second brain and memory layer for LotFoundry. `GEMINI.md` (and `AGENTS.md` / `CLAUDE.md`) is the compact context router for this repo; do not bloat it with session logs, source dumps, scratchpad notes, or long-lived research that belongs in Obsidian.

Use the Obsidian MCP or the configured Obsidian vault whenever the task depends on prior decisions, saved research, user preferences, project memory, meeting notes, source documents, or cross-session continuity. If Obsidian tooling is unavailable, say so clearly and request the vault path or exported notes instead of inventing memory.

### Vault Structure (Karpathy / Keet LLM Wiki)

```text
raw/            immutable source documents; never modify or delete these
wiki/           markdown knowledge base maintained by AI agents & humans
wiki/index.md   table of contents, category index, and routing layer
wiki/log.md     append-only chronological audit log of vault mutations
```

### When to Update Obsidian
Update or create notes in Obsidian when:
- **Architectural & Design Decisions (ADRs)**: New tech choices, system redesigns (e.g. A LOT MORE studio migration), Three.js coordinate or lighting conventions, state models.
- **Contract & Schema Changes**: Firestore security rules updates, live parcel data schemas, API response contracts.
- **Durable User Directives**: Specific user instructions, product requirements, branding guidelines, or workflow preferences.
- **Milestones & Session Handoffs**: Completed feature tracks, PR release summaries, unresolved risks or edge-case discoveries.
- **Synthesized Research**: External market data, municipal zoning bylaws, technical investigation notes.

### Obsidian MCP Update Rules & Invariants
1. **MCP Preflight**: Check if Obsidian MCP tools (`search_notes`, `read_note`, `create_note`, `patch_note`, `append_content`) are active in your environment. Use them directly to query and modify vault contents. Never ask the user to do what MCP can do. If tools are unavailable, output the markdown payload ready to paste and ask for the vault path.
2. **Page File Naming**: All pages in `wiki/` must be lowercase kebab-case (e.g. `wiki/design-system-a-lot-more.md`, `wiki/firestore-rules-v2.md`).
3. **Strict Page Header Structure**: Every page in `wiki/` must begin with:
   ```markdown
   # Page Title

   **Summary**: 1–2 clear sentences summarizing the page purpose and scope.
   **Sources**: Source code files, commits, raw docs, or external URLs.
   **Last updated**: YYYY-MM-DD

   ---

   Main content with clear H2/H3 headers, architectural decisions, and [[wiki-links]].

   ## Related pages
   - [[related-page-slug]]
   ```
4. **The Dual Sync Invariant (Atomic Log & Index)**:
   Every creation, modification, or refactor of a `wiki/` page MUST be accompanied by:
   - Updating `wiki/index.md` with the new/modified link and a concise 1-sentence descriptor in the relevant section.
   - Appending `wiki/log.md` with a timestamped entry:
     `YYYY-MM-DD: [create|update|refactor] [[wiki/page-slug]] — brief explanation of what changed`.
5. **Bi-directional Linking**: Link related concepts using `[[wiki-links]]`. Every page must have at least one incoming link from `wiki/index.md` or a parent concept page (no orphans).
6. **Factual Verification & Grounding**: Reference concrete files and code symbols for all technical claims. Explicitly note contradictions between legacy docs and active code. Mark speculative claims with `[Needs verification]`.
7. **Never Modify `raw/`**: Raw inputs are permanent historical records. Process raw sources into synthesized `wiki/` articles.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
