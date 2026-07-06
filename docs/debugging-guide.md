# Debugging Guide

A systematic method for turning a vague bug report into a fix, and for
escalating a report that can't be reproduced. Pairs with
`.github/ISSUE_TEMPLATE/bug_report.md` (which captures the inputs this
process needs) and `.github/triage_checklist.md` (which decides whether an
issue is ready for this process at all).

## 1. Log collection

Before touching code, gather what actually happened:

- **Browser console + network tab** for client bugs (studio, landing, auth
  flows) — screenshot or copy the exact error, stack trace, and failed
  request/response bodies.
- **Server logs** for API route bugs (`app/api/**/route.ts`) — reproduce
  locally with `npm run dev` and read the terminal output, or pull Cloud
  Functions logs (`firebase functions:log --project yardup-2026`) for a
  production-only failure.
- **CI logs** for build/test failures — the failing step's full output, not
  just the last line; upstream steps (`npm ci`, `lint`) can mask the real
  error in a later step.
- **Firestore rules denials** show up as `permission-denied` in the client
  console; cross-check against `firestore.rules` before assuming it's an
  application bug.

If the report doesn't include this, apply `status: needs-repro` per the
triage checklist rather than guessing.

## 2. Environment isolation

Narrow the variables before narrowing the code:

- **Clean install:** `rm -rf node_modules .next && npm ci` — rules out a
  locally corrupted `node_modules` or stale `.next` cache.
- **Node version:** confirm against CI (`node-version: 22` in
  `.github/workflows/ci.yml`); a bug that only reproduces on a different
  Node major version is a runtime issue, not a code issue.
- **Env flags:** demo-mode bugs and live-API-key bugs are different code
  paths. Check whether `LOTFOUNDRY_ALLOW_PUBLIC_API`, `LOTFOUNDRY_DEMO_UNLOCKS`,
  or a missing `OPENAI_API_KEY`/`REGRID_API_KEY`/`STRIPE_SECRET_KEY` changes
  the behavior (see `CLAUDE.md` → Environment).
- **Browser/device:** desktop vs. mobile studio are materially different
  components (`components/studio/*` vs. `components/studio/mobile/*`).
  Confirm which one the report is actually about.
- **Auth state:** signed-out, signed-in-no-unlocks, and signed-in-with-unlocks
  are distinct states for builder/lead-unlock bugs — reproduce in the exact
  state reported, not the most convenient one.

## 3. Bisecting a regression

Once you've confirmed the bug exists and roughly when it started (e.g. "this
worked in the last release"), use `git bisect` to find the offending commit
instead of guessing from the diff:

```bash
git bisect start
git bisect bad                     # current HEAD is broken
git bisect good v1.0.1              # last known-good tag or commit

# Git checks out a midpoint commit. For each one:
npm ci && npm run build && npm run dev   # or the specific failing check
# then tell git the result:
git bisect good   # if this commit doesn't show the bug
git bisect bad    # if this commit does show the bug

# repeat until git reports the first bad commit, then:
git bisect reset
```

Automate the check when the failure is a specific test or command:

```bash
git bisect start HEAD v1.0.1
git bisect run npm run test -- path/to/failing.test.ts
```

`git bisect run` only works cleanly when the check is deterministic and
fast — flaky tests will corrupt the bisect (see below). For a first-run bug
with no prior "known good" state, skip bisect and go straight to a minimal
reproduction.

## 4. Minimal Reproducible Example (MRE)

Required before escalating a bug beyond the original reporter, and before
opening a fix PR for anything non-trivial:

- Strip the repro to the smallest scenario that still shows the bug — a
  single component render, a single API call with example payload, or a
  single Vitest/Playwright test that fails for the right reason.
- Prefer a **failing test** as the MRE over prose steps: it's unambiguous,
  it stays in the repo as a regression guard, and per `CLAUDE.md` a bug fix
  should usually get a reproducing test before the fix.
- If the bug depends on live data (parcel API, Stripe webhook, OpenAI
  response), capture the exact request/response payload and replay it
  against a mocked client rather than requiring live credentials to
  reproduce.
- An MRE that can't be built (e.g. only reproduces with real production
  Firestore data at scale) is itself a signal — note that explicitly rather
  than shipping a speculative fix.

## 5. Flaky tests

- Re-run the specific test in isolation 5-10x locally before assuming it's
  flaky: `npx vitest run path/to/test.ts -t "test name" --repeat-each=10` or
  `npx playwright test path/to/spec.ts --repeat-each=5`.
- Common sources in this codebase: unmocked timers/animation frames around
  `motion`/R3F components, real network calls that should be mocked (see
  `lib/server/*` client boundaries), and Playwright waits on WebGL scene
  readiness on slower CI runners.
- Do not silence a flaky test with a retry annotation as a first resort —
  identify the race (missing `await`, unmocked async boundary, timing
  assumption) and fix it. Only use test-level retries as a documented,
  temporary mitigation with a follow-up issue linked.
- If a test is flaky only in CI and not locally, suspect timing/resource
  differences (headless rendering, shared runner load) before suspecting the
  test logic itself.

## 6. Dependency-related regressions

- Check `.github/dependabot.yml`-generated PRs first — if a regression lines
  up with a recent dependency bump, `git log -- package.json package-lock.json`
  narrows it fast.
- Reproduce against the pre-bump lockfile (`git show <commit>:package-lock.json`
  restored temporarily) to confirm the dependency is the cause before filing
  upstream.
- Never use `npm audit fix --force` to resolve a regression — see
  `CLAUDE.md` → Critical Gotchas; it can force a breaking Next.js downgrade.
  Pin or override the specific transitive dependency instead.
- For a Next.js/React major-version regression, check the framework's
  migration/changelog notes before assuming an app-code bug — confirm the
  same behavior on a minimal fresh install of the new version.

## Escalation

An issue is ready to escalate beyond the original triager once it has:
a collected log/stack trace, an isolated environment, (if a regression) a
bisected commit, and a minimal reproducing test. Issues missing any of these
stay in `needs-repro`/`needs-investigation` rather than being assigned out.
