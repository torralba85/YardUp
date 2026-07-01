# Repository Governance

Maintainer playbook for `torralba85/YardUp` (product: LotFoundry). This is the
policy layer that sits above the ready-to-use templates in `.github/` —
read this for *why* and *when*; read the templates for the fill-in-the-blank
mechanics.

Current shape of this repo: two owners (`@torralba85`, `@andrewtorralba-collab`),
a single long-lived branch (`master`), and CI that deploys straight to
production Firebase Hosting + Functions on every push to `master`
(`.github/workflows/ci.yml`). That shape drives most of the recommendations
below — re-evaluate them if the team or release cadence changes materially.

## 1. Issue Triage & Bug Report Management

**Prioritization matrix (Severity × Impact → P0–P3):**

| Severity \ Impact | Single user | Subset of users | All / most users |
|---|---|---|---|
| **Breaks core flow** (auth, checkout, feasibility calc, deploy) | P1 | P0 | P0 |
| **Degrades a feature** (AI panel, report export, builder inbox) | P3 | P2 | P1 |
| **Cosmetic / minor** (styling, copy, non-blocking console warning) | P3 | P3 | P2 |

- **P0** — production down, data loss, security exposure, or payments broken. Fix immediately, same day, direct-to-master hotfix allowed.
- **P1** — major flow broken for a meaningful slice of users. Next available work session.
- **P2** — real but workaroundable. Scheduled within the current or next iteration.
- **P3** — cosmetic, edge-case, or low-traffic path. Backlog; batch with related work.

**Labeling taxonomy** (mirrors what the issue templates already apply):

- Type: `type: bug`, `type: feature`, `type: chore`, `type: security`
- Status: `status: triage`, `status: needs-repro`, `status: confirmed`, `status: in-progress`, `status: blocked`, `status: wontfix`, `status: stale`
- Priority: `P0`, `P1`, `P2`, `P3`
- Area: `area: studio`, `area: builder`, `area: auth`, `area: ai`, `area: stripe`, `area: parcel`, `area: firebase`
- Community: `good-first-issue`, `help-wanted`

**Reproducibility bar before an issue leaves `status: needs-repro`:** OS,
runtime/browser version, app build/commit, exact steps, expected vs. actual
behavior, and logs/screenshots/console output. The `bug_report.md` template
already collects all of this — issues that skip it get `status: needs-repro`
and stay unprioritized until it's supplied.

**Triage workflow:** a repo owner triages new issues within 2 business days
using `.github/triage_checklist.md`. A triage pass is "done" when every open
issue without a `status:` label has been assigned one, duplicates are closed
and cross-linked, and P0/P1 issues have an owner or milestone. Re-run weekly
even if no new issues came in, to catch label drift and staleness.

## 2. Diagnosing Errors & Reproducing Bugs

Methodology, in order:

1. **Collect logs first.** Browser console + network tab for client issues;
   Firebase Functions logs (`firebase functions:log` or the console) for
   server/API routes; Stripe Dashboard event log for payment issues.
2. **Isolate the environment.** Reproduce on `npm run dev` locally before
   assuming it's a Firebase Hosting/Functions-specific issue. If it only
   reproduces in production, suspect env var differences (`.env.local` vs.
   deployed Functions config) or CDN/caching behavior before code.
3. **Bisect to the regression commit** when the bug wasn't always there:
   ```bash
   git bisect start
   git bisect bad                 # current commit is broken
   git bisect good <known-good-sha>
   # git checks out a midpoint; test it, then:
   git bisect good   # or: git bisect bad
   # repeat until git identifies the first bad commit
   git bisect reset
   ```
   For scriptable repros (a failing test, a `curl` that 500s), use
   `git bisect run <script>` to automate the whole search.
4. **Build a Minimal Reproducible Example (MRE)** before escalating or filing
   upstream: strip the repro down to the smallest scenario/route/component
   that still fails, with no unrelated app state. An MRE is required in the
   bug report template for exactly this reason — it's the difference between
   "the studio is broken" (untriageable) and "loading a saved scenario with
   an ADU placed outside setbacks throws in `lib/feasibility.ts`" (fixable).

**Flaky tests:** if a Vitest/Playwright test fails intermittently, don't
retry-and-ignore. Run it in isolation 10x locally (`npx vitest run <file> -t
<name> --repeat=10` / repeated Playwright runs) to confirm it's timing- or
order-dependent, not a real regression. Common causes here: unmocked
`Date.now()`/randomness, R3F/Three.js async scene setup races, and
Playwright screenshot timing on the 3D canvas — add explicit waits or mock
the source of nondeterminism rather than adding sleeps.

**Environment-specific failures:** check Node version (`.nvmrc`/CI config vs.
local), and whether the failure needs live API keys the CI/demo environment
doesn't have (Regrid, Google Maps, OpenAI) — those should degrade gracefully
per the demo-mode contract in `CLAUDE.md`, not fail hard.

**Dependency regressions:** `git log -p -- package-lock.json` around the
regression window, or re-run bisect scoped to lockfile changes. Confirm by
pinning the suspect dependency back locally before filing upstream.

## 3. Branch Management Strategy

**Recommendation: Trunk-Based Development**, not Git Flow or full GitHub
Flow-with-long-review-latency. Rationale: two-person team, CI deploys
`master` straight to production on every push, and there's no evidence of
parallel release trains or long-lived `develop`/`release` branches in this
repo's history. Git Flow's overhead (develop, release/*, hotfix/* branches)
buys nothing here and adds merge surface area; trunk-based keeps `master`
always deployable and changes small and frequent, which matches the existing
CI-deploys-on-merge setup.

- **Branch naming:** `feat/<slug>`, `fix/<slug>`, `chore/<slug>`,
  `docs/<slug>`, `style/<slug>`, `refactor/<slug>` — matches the
  Conventional Commits types already used in this repo's commit history.
  Keep branches short-lived (days, not weeks); rebase on `master` rather than
  letting them drift.
- **Merge policy:**
  - **Squash merge** (default) for feature/fix branches with messy or
    iterative commit history — keeps `master` history one logical change per
    commit, matching the Conventional Commits convention in `CLAUDE.md`.
  - **Merge commit** for branches that already carry clean, individually
    meaningful commits (e.g. a multi-step migration you want bisectable
    step-by-step) — this repo's history shows some of these
    (`Merge branch 'feat/bulk-lead-credits'`).
  - **Rebase** only for solo cleanup before opening a PR, never as a merge
    strategy on shared branches.
- **Branch protection on `master`** (required, since CI auto-deploys on
  push):
  - Require PR review from a `CODEOWNERS`-matched reviewer before merge.
  - Require status checks to pass: lint, Vitest, `tsc --noEmit`, build,
    Playwright (the jobs already defined in `ci.yml`).
  - No force-push, no direct push bypass for anyone, including admins,
    except a documented break-glass P0 hotfix.
  - Require branches to be up to date with `master` before merge.

## 4. Repository Health Routine

**Weekly:**
- Review open Dependabot PRs (`.github/dependabot.yml` already runs weekly
  npm + GitHub Actions scans across root and `functions/`); merge
  minor/patch groups after CI passes, evaluate majors individually.
- Run the issue triage pass (Section 1).
- Confirm the last few `ci.yml` runs on `master` are green; investigate any
  new flakiness immediately rather than letting it accumulate.

**Monthly:**
- Run `.github/stale_branch_cleanup.md` (first Monday of the month, as
  documented there): prune merged branches, warn and then remove inactive
  unmerged ones.
- `npm audit` review (never `npm audit fix --force` — see `CLAUDE.md`
  Critical Gotchas; track upstream fixes in `SECURITY.md` for anything not
  immediately patchable, following the existing GHSA entry format).
- Secrets scan: confirm no `.env.local`/`functions/.env` values, API keys,
  or tokens were accidentally committed (`git log -p | grep`-style spot
  check, or enable GitHub secret scanning if not already on for the repo).
- Documentation freshness pass: `README.md`, `docs/deployment.md`,
  `docs/release-checklist.md`, and this file — confirm commands and env var
  lists still match `package.json` / `firebase.json` reality.

**Release tagging & changelog:** Semantic Versioning (`MAJOR.MINOR.PATCH`),
tracked in `CHANGELOG.md` under Keep a Changelog format (already in use —
see the `[Unreleased]` / `[1.0.1]` / `[1.0.0]` sections). On release: move
`[Unreleased]` entries under a new version heading, tag
`git tag vX.Y.Z && git push origin vX.Y.Z`, and cut a GitHub Release from
that tag. If the team wants this automated later, `release-please` (which
derives versions/changelog from Conventional Commits — already the commit
convention here) is a natural fit and needs no new commit discipline.

**Archiving/deprecating:** for a project or long-abandoned feature branch
that's no longer maintained, mark it clearly (`README.md` banner + repo
"Archived" setting if applicable), tag a final snapshot
(`archive/<name>-final`), and remove it from active CI/deploy paths rather
than deleting history outright.

## 5. Templates

Already in place under `.github/` — use these directly, do not duplicate:

- Issue triage: `.github/triage_checklist.md`
- Bug reports: `.github/ISSUE_TEMPLATE/bug_report.md`
- Feature requests: `.github/ISSUE_TEMPLATE/feature_request.md`
- Pull requests: `.github/pull_request_template.md`
- Stale branch cleanup: `.github/stale_branch_cleanup.md`

## 6. Private/Solo Repo vs. OSS Considerations

This repo currently operates as a small, closed team shipping a commercial
product (LotFoundry) with direct-to-production CI. If/when it opens up to
outside contributors, revisit:

- **Contributor agreements:** add a DCO check (`Signed-off-by` trailer +
  a DCO GitHub Action) or a CLA bot — pick DCO for lighter-weight OSS
  friction unless legal specifically wants a CLA.
- **Security disclosure:** `SECURITY.md` already points to private GitHub
  Security Advisories, which is correct for both modes — keep it, and add a
  disclosure SLA (e.g. acknowledge within 48h, fix or mitigate P0 within 7
  days) once there's an external reporter base.
- **Code of Conduct:** add `CODE_OF_CONDUCT.md` (Contributor Covenant is the
  default choice) before accepting outside PRs/issues; not required for a
  closed-team private repo but expected the moment issues are public.
- **`good-first-issue`/`help-wanted` labels:** already defined in the
  taxonomy above but only meaningful once there's an outside contributor
  pool to route them to.
- **CI/tooling differences:** internal/private mode can keep secrets in
  repo/organization GitHub Actions secrets as today; a public OSS mode needs
  to ensure `ci.yml` never runs deploy/secret-bearing jobs on
  forked-PR `pull_request` events (use `pull_request_target` carefully, or
  gate deploy jobs to `push` on `master` only, which `ci.yml` already does).
- **CODEOWNERS:** already present at repo root and scoped to
  deploy-sensitive paths (`firebase.json`, `firestore.rules`,
  `.github/workflows/`) — this pattern holds for both modes; in OSS mode,
  widen it as trusted maintainers are added.
