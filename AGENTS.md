# LotFoundry - AGENTS.md

> Codex/agent instructions for this repo. This file mirrors `CLAUDE.md`; keep the
> two in sync when either changes.

Repository: `torralba85/YardUp` (legacy slug). Product/app: LotFoundry, an ADU feasibility studio. Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Three.js/R3F, Firebase Hosting + Cloud Functions, Firebase Auth + Firestore, Stripe payments, and OpenAI-backed AI panels. Firebase project: `yardup-2026`. Default branch: `master`; always check the current worktree branch before committing.

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
- Color work: read docs/design/2026-10-01-color-system.md; edit design/tokens.json, run npm run design:generate and npm run design:check. Use canonical lot-* / status-* roles; never refresh color-exceptions.json merely to pass CI.
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

- `CLAUDE.md` - the Claude-facing twin of this file; keep both in sync.
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

**`docs/design/` is the source of truth.** Read `docs/design/README.md` before any visual or UI change,
then `docs/design/design-system.md` (the A LOT MORE system). Do not deviate without explicit user
approval. In QA or review mode, flag code that does not match it.

`DESIGN.md` at the repo root is now only a pointer. The system it used to contain (Blue Hour / Golden
Hour dual lighting, clay/forest/amber/brick semantics, Cormorant Garamond / Libre Franklin / IBM Plex
Mono, the pill-radius system) was retired 2026-09-05 and lives in `docs/design/archive/`. **Do not apply
anything from the archive to new work**, and do not repeat those rules from memory or from the older
specs under `docs/superpowers/specs/`, which still reference them as history.

Project-specific design rules:
- New UI uses A LOT MORE: chalk `#F5F5F0` ground, carbon `#161616` ink, signal orange `#FF5B24` action,
  stone `#65655F` muted text on chalk (`#B7B7AE` on carbon), drafting line `#DADAD3` hairlines.
- Space Grotesk for display, Manrope for body. Two families only - no serif, no mono layer.
- Radius: `0` for surfaces and cards, `3px` for controls. Elevation is a hard offset shadow, no blur.
- Money is typographic, not chromatic: carbon, large, `tabular-nums`. Green is an eligible/verified
  status colour and **never** money.
- Status colours (label + icon always, never colour alone): eligible `#176B4C` on chalk / `#5FBF93` on
  carbon; review-needed `#8A5300` / `#E0A33C`; blocked `#A82D16` / `#F0705A`.
- **Orange is never text on chalk** - it is 2.83:1 and fails AA. Orange is a fill colour. Use `#C43708`
  when you need orange type on chalk.
- **Never set a focus ring to `currentColor`** - the ring is drawn outside the control, on the parent
  ground, so `currentColor` goes invisible on light-labelled controls. Pin it: deep orange `#C43708` on
  chalk, carbon on orange grounds, chalk on carbon.
- Touch targets are `min-height: 44px`. All motion sits inside `prefers-reduced-motion: no-preference`.
- Do not "snap" the landing's spacing to a 4/8px grid - the odd values are optically tuned, and that
  cleanup is a regression.
- A LOT MORE is project-wide: landing, auth and consent, account, builder, Studio, and generated
  reports/certificates share the global tokens. There is no legacy route-theme boundary. See
  `docs/design/product-surfaces.md` for renderer ownership and verification requirements.

## Environment

Local live-data variables usually live in `.env.local` and/or `functions/.env`:

```bash
GOOGLE_MAPS_API_KEY=<server-side Maps Static + Geocoding key>
GOOGLE_GEOCODING_KEY=<optional dedicated server-side Geocoding key>
GOOGLE_PLACES_SERVER_KEY=<optional server-side Places key>
NEXT_PUBLIC_GOOGLE_PLACES_KEY=<browser-safe Places Autocomplete key>
NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY=<browser key with Map Tiles API enabled; Neighborhood 3D photoreal tiles>
NEXT_PUBLIC_CESIUM_ION_TOKEN=<optional ion assets:read token; dev-only fallback, Community plan is non-commercial>
NEXT_PUBLIC_SCAN_CALIBRATION=<"true" shows the internal Scan calibration panel; leave unset in production>
REGRID_API_KEY=<server-side Regrid Parcel API key>
OPENAI_API_KEY=<server-side OpenAI API key>
OPENAI_TEXT_MODEL=<text model, defaults to gpt-5.6-sol>
OPENAI_IMAGE_MODEL=<image-capable model, defaults to gpt-5.6-sol>
TYPESAFE_API_KEY=<server-side TypeSafe key; only read when a TypeSafe flag (TYPESAFE_GEOCODE_PICKER, TYPESAFE_ZONING_SHADOW) is on>
TYPESAFE_GEOCODE_PICKER=<"true" lets TypeSafe choose among Nominatim candidates in /api/geocode; off by default because it spends metered quota on guest lookups>
TYPESAFE_ZONING_SHADOW=<"true" logs Jev's zoning-district class beside the regex verdicts for signed-in Regrid lookups in /api/parcel; shadow only, never changes a response; off by default because it spends metered quota per new designation; see docs/jev-zoning-shadow.md>
STRIPE_SECRET_KEY=<server-side Stripe secret key>
STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
NEXT_PUBLIC_APP_URL=<canonical app URL for Stripe redirect callbacks>
NEXT_PUBLIC_GA_MEASUREMENT_ID=<GA4 measurement ID; empty disables analytics and the cookie banner>
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase web API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<Firebase auth domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<Firebase project ID>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<Firebase storage bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<Firebase messaging sender ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<Firebase web app ID>
NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=<Firebase App Check reCAPTCHA Enterprise site key>
NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=<registered local debug token; never deploy>
ENABLE_NATIVE_STORE_VERIFICATION=<legacy umbrella flag; enables Apple and Google verification>
ENABLE_APPLE_STORE_VERIFICATION=<bind Apple native-store secrets only>
ENABLE_GOOGLE_PLAY_VERIFICATION=<bind Google Play native-store secrets only>
APPLE_BUNDLE_ID=<iOS bundle id for StoreKit receipt verification>
APPLE_ROOT_CA_FINGERPRINT256=<SHA-256 fingerprint pinning the Apple root CA for StoreKit x5c chains>
GOOGLE_PLAY_PACKAGE_NAME=<Android package name for Play Billing verification>
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<service-account JSON with androidpublisher scope>
PLAY_RTDN_VERIFICATION_TOKEN=<shared secret in the Pub/Sub push URL for /api/store/rtdn/google>
```

Demo/dev flags: `LOTFOUNDRY_ALLOW_PUBLIC_API` (allow unauthenticated AI/API access locally), `LOTFOUNDRY_DEMO_UNLOCKS` (grant lead unlocks without payment), `AI_RATE_LIMIT_BACKEND` (rate-limit storage backend selection: in-memory vs Firestore). Server-only secrets (`OPENAI_API_KEY`, `STRIPE_*`, `REGRID_API_KEY`) belong in `.env.local`/`functions/.env`, never in `NEXT_PUBLIC_*`.

Firebase App Check uses the registered reCAPTCHA Enterprise provider in production. Local authenticated development needs a registered `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` in `.env.local`; never commit or deploy that token. Generic Playwright CI must not create accounts in the production Firebase project.

Without parcel API keys, the app must still resolve real lots wherever the free tier reaches: `/api/parcel` chains Regrid (paid, optional) to the public county/statewide GIS services in `lib/server/county-parcels.ts`, resolves state/ZIP/county from the keyless US Census geocoder (`lib/server/census-geocode.ts`), and fills known parcel polygons from the public USA Structures footprint layer (`lib/server/building-footprints.ts`). It degrades to the Seattle, Portland, and Austin presets only where no parcel provider has coverage. Without `OPENAI_API_KEY`, AI panels stay visible but return a setup message instead of generating content. Without Firebase overrides, the checked-in `yardup-2026` web app config is used.

Anonymous visitors get one real address lookup before the account ask (`lib/guest-lookup.ts`). That allowance is a funnel affordance, not a cost control: the ceiling is server-side, where `lib/server/guest-request.ts` treats a request carrying no bearer token as a guest and `/api/geocode` and `/api/parcel` then hold it to the keyless chain (Nominatim, county/statewide GIS) under their own `geocode-guest` / `parcel-guest` limiter namespaces. A guest lookup therefore cannot spend metered Google or Regrid quota however often it is repeated. The one opt-in exception is `TYPESAFE_GEOCODE_PICKER`: when it is on, each Nominatim lookup, guest or not, also makes one metered TypeSafe call (`lib/server/geocode-candidate-picker.ts`). Autocomplete stays signed-in only, because every suggestion source is metered; free-text Search is the guest path.

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
- CI (`.github/workflows/ci.yml`) keeps a stable `verify` aggregate over parallel quality and browser jobs; recognized docs-only changes retain hygiene/scope checks. Master deploys compare production inputs only when the latest deployment attempt succeeded, conservatively recover missing/failed records, and support forced dispatch. See `docs/ci-efficiency.md`. `ai-maintainer.yml` records intake on newly opened issues; it does not run on a schedule or make autonomous code changes.
- Do not merge with failing CI.

## Obsidian Second Brain

Obsidian is the durable second brain and memory layer for LotFoundry. `AGENTS.md` (and `CLAUDE.md` / `GEMINI.md`) is the compact context router for this repo; do not bloat it with session logs, source dumps, scratchpad notes, or long-lived research that belongs in Obsidian.

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

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
