# Debugging & Reproduction Methodology

How to diagnose a reported bug in this repo before proposing a fix. Skip
straight to a fix only for trivial, obviously-scoped issues.

## 1. Collect logs first

- **Browser/client errors:** ask for the browser console output and, for
  Firebase Auth/Firestore issues, the Network tab response body (status code
  + JSON error).
- **Server/API errors:** `app/api/**` routes log to stdout; in production
  that's Cloud Functions logs (`firebase functions:log --project yardup-2026`
  or the GCP Console). AI routes (`app/api/ai/*`) and Stripe routes
  (`app/api/stripe/*`) are the most common source of server-side failures —
  check `lib/server/openai.ts` / `lib/server/api-auth.ts` /
  `lib/server/ai-rate-limit.ts` call sites for where errors are thrown.
- **Test failures:** full Vitest output (`npm run test -- --reporter=verbose`
  for a single file) and the Playwright HTML report
  (`playwright-report/`, uploaded as a CI artifact — see `ci.yml`).

## 2. Isolate the environment

Before assuming the bug is in application code, rule out environment drift:

- Node version — CI pins `node-version: 22` (`.github/workflows/ci.yml`);
  confirm the reporter's local Node matches.
- Missing/placeholder API keys — without `REGRID_API_KEY` /
  `GOOGLE_MAPS_API_KEY` the app runs in **demo mode** (Seattle/Portland/Austin
  presets only); without `OPENAI_API_KEY` the AI panels return a setup
  message instead of failing. A "bug" report on AI or live-parcel behavior
  often traces back to `.env.local` config, not code.
- Demo/dev flags — `LOTFOUNDRY_ALLOW_PUBLIC_API` and `LOTFOUNDRY_DEMO_UNLOCKS`
  change auth/payment behavior locally; confirm they're unset if the report
  concerns production auth or paywall behavior.
- Browser/device — R3F/WebGL and hydration issues are frequently
  browser-specific; reproduce in the same browser/OS as the report before
  assuming it's universal.

## 3. Bisect to find the regression

Use `git bisect` once you have a known-good and known-bad commit (or
release tag):

```bash
git bisect start
git bisect bad                 # current master or the reporting commit
git bisect good v1.0.1         # last known-good tag or commit

# Automate the search when the bug is reproducible by a command:
git bisect run npm run test -- path/to/failing.test.ts
# or for a build/type regression:
git bisect run npx tsc --noEmit
# or a targeted repro script:
git bisect run node scripts/repro-bug.mjs

git bisect reset               # once done, return to your original branch
```

`git bisect run` requires an exit-code-based check (0 = good, non-zero =
bad); wrap manual/visual repros in a small script that asserts the specific
symptom instead of relying on eyeballing output.

## 4. Build a Minimal Reproducible Example (MRE)

An MRE is required before escalating a bug (see
`.github/ISSUE_TEMPLATE/bug_report.md`) because it:

- proves the bug is in this codebase, not the reporter's environment or data,
- gives the fixer a fast feedback loop instead of re-deriving repro steps,
- becomes the regression test that ships with the fix.

For this repo, an MRE is usually one of:

- A failing Vitest case using `test/setup.ts` fixtures (feasibility math,
  parcel utilities, AI/Stripe request shaping).
- A Playwright spec under `e2e/` reproducing the UI/interaction bug on
  desktop and/or mobile Chromium.
- A minimal `curl`/fetch snippet against a local `app/api/*` route with the
  exact request body/headers that triggers the failure.

A bug fix should ship with the reproducing test failing first, then passing
after the fix (see `CLAUDE.md` — "a bug fix should usually get a
reproducing test before the fix").

## 5. Flaky tests

- Re-run the specific failing test 3-5x locally
  (`npm run test -- path/to/test.ts` / `npx playwright test path --repeat-each=5`)
  before labeling it flaky — a single failure in CI is not evidence.
- Common flake sources here: R3F/WebGL scene readiness timing in Playwright
  (wait on an explicit render marker, not a fixed `setTimeout`), network
  calls to parcel/geocode APIs in tests that should be mocked, and
  hydration-timing assertions (see the `react-hooks/set-state-in-effect`
  gotcha in `CLAUDE.md`).
- If a test is confirmed flaky and the root cause isn't fixable immediately,
  quarantine it with a tracked issue (`status: flaky` label) rather than
  deleting or permanently skipping it.

## 6. Dependency regressions

- `npm ci` from a clean `node_modules` first to rule out a stale local
  install (see `docs/release-checklist.md`).
- Diff `package-lock.json` against the last known-good commit to see what
  actually changed: `git diff <good-sha> -- package-lock.json`.
- For a Dependabot-introduced regression, bisect within that PR's diff — it's
  usually a single package bump, so `npm ls <package>` plus the changelog of
  the bumped version is often enough without a full `git bisect`.
- Never resolve a `npm audit` finding with `npm audit fix --force` (see
  `CLAUDE.md` gotchas) — it can force a breaking Next.js downgrade. Track
  accepted/deferred advisories in `SECURITY.md` instead.
