# YardUp / LotFoundry - AGENTS.md

> Codex/agent instructions for this repo. This file mirrors `CLAUDE.md`; keep the
> two in sync when either changes.

YardUp repo: `torralba85/YardUp`. Product/app: LotFoundry, an ADU feasibility studio. Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Three.js/R3F, Firebase Hosting + Cloud Functions, Firebase Auth + Firestore, Stripe payments, and OpenAI-backed AI panels. Firebase project: `yardup-2026`. Default branch: `master`; always check the current worktree branch before committing.

## Commands

```bash
npm install                         # install dependencies
npm run dev                         # local dev server, usually localhost:3000
npm run build                       # production Next.js build
npm run build:firebase              # build + prepare Firebase output
npm run lint                        # ESLint, zero warnings required
npm run test                        # Vitest unit tests
npm run test:coverage               # Vitest with coverage output
npm run test:e2e                    # Playwright E2E tests (desktop + mobile Chromium)
npx tsc --noEmit                    # type-check
npm run deploy:dry-run              # validate Firebase deploy config
npm run deploy                      # deploy Hosting + Functions + Firestore rules
npm run deploy:rules                # deploy Firestore rules only
npm run hero:render                 # render the Remotion hero MP4 + poster into public/hero/
FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase
```

Run the core release gate before broad commits: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

Use `.claude/launch.json` for Claude launch configs: `lotfoundry-dev` on port 3000 and `lotfoundry-preview` on port 4517.

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
- `components/FeasibilityStudio.tsx` - studio orchestrator
- `components/ParcelScene.tsx` - 3D scene and ADU placement
- `components/studio/*` - inspector, metrics, report, AI panels, mobile studio, builder lead panels
- `components/builder/*` - builder dashboard, inbox, lead cards, unlock slips
- `lib/feasibility.ts`, `lib/feasibility-verdict.ts` - core feasibility/financial calc and verdict logic
- `lib/parcel-context.tsx`, `lib/parcel-api.ts`, `lib/parcel-types.ts` - parcel state and API boundary
- `lib/market/*` - localized feasibility numbers (market basis, bedroom mix)
- `lib/ai-api.ts`, `lib/ai-types.ts`, `lib/style-match-photo.ts`, `lib/server/openai.ts` - AI panels (parcel insights, style-matched ADU concepts)
- `lib/stripe.ts`, `lib/lead-unlock-*.ts`, `lib/marketplace*.ts`, `lib/server/lead-unlocks.ts` - payments + builder lead-unlock marketplace
- `lib/saved-scenarios.ts`, `lib/scenarios-firestore.ts`, `lib/scenario-url.ts` - scenario persistence and sharing
- `app/api/{parcel,aerial,geocode,suggest}/route.ts` - parcel/data server routes
- `app/api/ai/{parcel-insights,adu-concept}/route.ts` - AI server routes (auth + rate-limited)
- `app/api/stripe/{checkout,webhook}/route.ts` - Stripe checkout session + webhook handler
- `firebase.json`, `functions/index.js`, `scripts/prepare-firebase.js` - Firebase deployment path

## Required Reading

- `CLAUDE.md` - the Claude-facing twin of this file; keep both in sync.
- `docs/AGENTS.md` - full architecture map, current status, pitfalls, and next priorities.
- `DESIGN.md` - mandatory before visual or UI decisions.
- `README.md` - product scope, local setup, environment variables, verification, CI, deployment.
- `docs/deployment.md` - Firebase deploy flow, CI secrets, rollback, deployment troubleshooting.
- `docs/release-checklist.md` - manual and automated release checks.
- `docs/feasibility-engine-interface.md` - calculation/data contract details.
- `docs/ai-integration-plan.md` - AI panel architecture, prompts, and OpenAI integration.
- `docs/plans/monetization-marketplace-ai.md` - Stripe/lead-unlock marketplace + monetization design.
- `docs/superpowers/plans/*` and `docs/superpowers/specs/*` - dated per-feature plans and design specs.

## Design System

Always read `DESIGN.md` before making visual or UI changes. Fonts, colors, spacing, layout direction, and brand tone are defined there. Do not deviate without explicit user approval. In QA or review mode, flag code that does not match `DESIGN.md`.

Project-specific design rules:
- Forest green is for positive financial value only.
- Clay is the interactive/action accent.
- Amber signals permit risk or review-needed states.
- Use base amber for fills/accents, `lf-amber-ink` for warning text/icons on light surfaces, and `lf-amber-on-dark` for warning text/icons on mahogany or espresso.
- Brick signals genuine blockers.
- Use Cormorant Garamond for display/hero numbers and dollar figures, Libre Franklin for body/control text, and IBM Plex Mono for tabular/recorded-fact values (APNs, dimensions, status chips). `DESIGN.md` is the source of truth — defer to it if it diverges.
- Use the 2026-06-27 soft instrument radius system: text-bearing controls, search fields, data inputs, and studio cards use softened rectangles (`rounded-lg`, about 8px); compact badges/chips use `rounded-md`; reserve `rounded-full` for true circles such as avatars, step dots, progress markers, and tiny handles. Do not mix pill CTAs with boxy outlined inputs or sharp inner text boxes.

## Environment

Local live-data variables usually live in `.env.local` and/or `functions/.env`:

```bash
GOOGLE_MAPS_API_KEY=<server-side Maps Static + Geocoding key>
GOOGLE_GEOCODING_KEY=<optional dedicated server-side Geocoding key>
GOOGLE_PLACES_SERVER_KEY=<optional server-side Places key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
REGRID_API_KEY=<server-side Regrid Parcel API key>
OPENAI_API_KEY=<server-side OpenAI API key>
OPENAI_TEXT_MODEL=<text model, e.g. gpt-5.5>
OPENAI_IMAGE_MODEL=<image model for ADU concepts>
STRIPE_SECRET_KEY=<server-side Stripe secret key>
STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
NEXT_PUBLIC_APP_URL=<canonical app URL for Stripe redirect callbacks>
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<Firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<Firebase project ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<Firebase storage bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<Firebase messaging sender ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<Firebase web app ID>
```

Demo/dev flags: `LOTFOUNDRY_ALLOW_PUBLIC_API` (allow unauthenticated AI/API access locally), `LOTFOUNDRY_DEMO_UNLOCKS` (grant lead unlocks without payment), `AI_RATE_LIMIT_BACKEND` (rate-limit storage backend selection: in-memory vs Firestore). Server-only secrets (`OPENAI_API_KEY`, `STRIPE_*`, `REGRID_API_KEY`) belong in `.env.local`/`functions/.env`, never in `NEXT_PUBLIC_*`.

Without parcel API keys, the app must still run in demo mode with Seattle, Portland, and Austin presets. Without `OPENAI_API_KEY`, AI panels stay visible but return a setup message instead of generating content. Without Firebase overrides, the checked-in `yardup-2026` web app config is used.

## Critical Gotchas

- R3F text: avoid Drei/Troika `Text` when possible; use the canvas-based `LabelSprite` pattern because font loading can fail silently in dev.
- React hooks lint: Next.js 16 can flag intentional hydration sync with `react-hooks/set-state-in-effect`; use a narrow disable comment only when the effect pattern is intentional.
- Three event types: import `ThreeEvent` from `@react-three/fiber`; do not rely on a global type.
- Parcel positioning: the house and ADU placement are derived from lot dimensions and setbacks. Do not hardcode Z positions.
- Hydration-safe motion: prefer CSS `motion-safe:` variants for hover/tap transforms. Avoid JS motion wrappers that change server/client attributes when CSS can do it.
- Firebase Functions: `app` and `api` functions serve the same Next.js app through different rewrites. Keep `firebase.json`, `functions/index.js`, and `scripts/prepare-firebase.js` aligned.
- Audit warning: do not run `npm audit fix --force`; it may force a breaking Next.js downgrade. Track upstream fixes instead.
- AI routes: `app/api/ai/*` require auth and are rate-limited via `lib/server/ai-rate-limit.ts` + `lib/server/api-auth.ts`. Keep the OpenAI client server-only (`lib/server/openai.ts`); never import it into client bundles.
- Stripe: the webhook (`app/api/stripe/webhook/route.ts`) must verify signatures with `STRIPE_WEBHOOK_SECRET` and read the raw request body; lead unlocks are granted through `lib/server/lead-unlocks.ts`, gated by Firestore rules.
- Firestore: data access is constrained by `firestore.rules`; update and `npm run deploy:rules` (or include in deploy) when adding collections. Server reads/writes go through `lib/server/firebase-admin.ts`.
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
- CI (`.github/workflows/ci.yml`) runs lint, Vitest, `tsc --noEmit`, build, and Playwright; on `master` it then writes env from secrets and deploys Hosting + Functions + Firestore rules. `ai-maintainer.yml` runs scheduled AI maintenance.
- Do not merge with failing CI.

## Obsidian Second Brain

Obsidian is the durable second brain and memory layer. `AGENTS.md` is the compact context router for this repo; do not bloat it with session logs, source dumps, or long-lived research notes that belong in Obsidian.

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
