# Repository Governance

Branch strategy, debugging methodology, the recurring maintenance routine,
and OSS-vs-private adaptations for this repo. Pairs with the existing
governance files: `.github/triage_checklist.md` (issue triage),
`.github/stale_branch_cleanup.md` (branch pruning),
`.github/pull_request_template.md` and `.github/ISSUE_TEMPLATE/*` (intake
forms), `CODEOWNERS`, `SECURITY.md`, and `.github/dependabot.yml`.

## Diagnosing errors & reproducing bugs

Work through these in order; do not skip to a fix before reproducing.

1. **Collect logs first.** Browser console + network tab for client issues,
   Firebase Functions logs (`firebase functions:log` or the Firebase console)
   for server/API issues, and the failing CI run's "Upload Playwright report"
   artifact for E2E failures. Capture the exact error, stack trace, and
   request/response payloads before anything else.
2. **Isolate the environment.** Confirm Node version (`node -v`, repo targets
   Node 22 per `ci.yml`), whether it reproduces with `npm ci` from a clean
   checkout, and whether demo mode (no `REGRID_API_KEY`/`OPENAI_API_KEY`) vs.
   live-data mode changes the outcome. Most parcel/AI bugs are mode-specific.
3. **Bisect to find the regression commit** once you know "it used to work":
   ```bash
   git bisect start
   git bisect bad HEAD
   git bisect good <last-known-good-tag-or-sha>
   # at each step:
   npm ci && npm run build && npm run test   # or a narrower repro command
   git bisect good   # or: git bisect bad
   # repeat until git bisect reports the first bad commit
   git bisect reset
   ```
   For UI regressions, swap the verification command for the specific
   Playwright spec or manual repro steps so each bisect step is fast.
4. **Build a Minimal Reproducible Example (MRE)** before escalating or filing:
   the smallest parcel input / scenario URL / route + payload that triggers
   the bug, with unrelated state stripped out. An MRE is required before an
   issue moves out of `status: needs-repro` (see
   `.github/triage_checklist.md`) — it is what turns "sometimes it's broken"
   into something a bisect or unit test can target.
5. **Flaky tests:** re-run in isolation (`npx vitest run <file>` /
   `npx playwright test <spec> --repeat-each=5`) before assuming the test
   itself is wrong. Check for unseeded randomness, real network calls instead
   of mocks, and shared Firestore/demo state leaking between tests.
6. **Environment-specific failures:** diff `.env.local` / `functions/.env`
   against `README.md`'s documented variables, and check whether the failure
   depends on demo-mode fallbacks (Seattle/Portland/Austin presets) being
   active.
7. **Dependency regressions:** check `npm ls <package>` and the Dependabot PR
   that bumped it; revert just that PR locally to confirm before opening a
   counter-PR.

## Branch management strategy

**Model: GitHub Flow (trunk-based), not Git Flow.** `ci.yml` deploys to
production Firebase Hosting + Functions on every push to `master` — there is
no long-lived `develop` or `release/*` branch to keep in sync, so Git Flow's
extra branches would only add merge overhead. Trunk-based development without
short-lived feature branches is the other extreme, but it skips required CI
and review entirely; with auto-deploy on `master`, every change needs to pass
through a PR first. GitHub Flow (short-lived branches off `master`, PR, CI,
merge, deploy) fits a small/solo-maintainer team with a single deployable
environment.

- **Branch naming:** `<type>/<short-description>`, mirroring the Conventional
  Commit types already used in commit messages (`CLAUDE.md` § Git Workflow):
  `feat/`, `fix/`, `style/`, `chore/`, `docs/`, `refactor/`, `test/`. Add
  `hotfix/` for production incidents that bypass normal prioritization and
  `release/` only if a non-trivial multi-PR rollout ever needs staging before
  `master` (not currently in use).
- **Merge policy:**
  - **Squash merge by default** for feature/fix branches — keeps `master`
    history one commit per logical change, matches the Conventional Commits
    convention, and avoids noisy WIP commits in `git log`.
  - **Rebase merge** is acceptable for a single contributor's stacked PRs that
    are already clean, logically-separated commits and should stay separate
    (e.g. a multi-step refactor reviewed commit-by-commit).
  - **Plain merge commits** are discouraged — they're only useful for
    long-lived integration branches, which this repo doesn't have.
- **Branch protection on `master`** (set under repo Settings → Branches):
  require the `verify` CI job to pass, require at least one review on PRs
  with more than one collaborator (currently `@torralba85` and
  `@andrewtorralba-collab` per `CODEOWNERS`), and disallow force-push and
  branch deletion. Because `master` auto-deploys to production on every push,
  treat this as a hard requirement, not a nice-to-have — confirm it's enabled
  before relying on the CI gate alone.

## Repository health routine

| Cadence | Task | How |
|---|---|---|
| Weekly | Dependency audit | Dependabot PRs (`.github/dependabot.yml`) auto-open for npm (root + `functions/`) and GitHub Actions; review and merge minor/patch groups promptly, evaluate majors individually. Run `npm audit` on any dependency-touching PR; do not run `npm audit fix --force` (`CLAUDE.md` Critical Gotchas — it can force a breaking Next.js downgrade). |
| Weekly | CI pipeline health | Confirm the last `master` run of `ci.yml` is green; investigate immediately if `deploy` failed (production is on the line). Spot-check Playwright report artifacts for new flakes. |
| Monthly | Stale branch pruning | First Monday of the month, per `.github/stale_branch_cleanup.md`. |
| Monthly | Secrets scanning | Confirm no plaintext secrets were committed (`git log -p` spot check or a scanning tool); rotate anything that leaked per `.github/triage_checklist.md`'s security-screening step. |
| Monthly | Documentation freshness | Diff `README.md`, `docs/deployment.md`, and `docs/release-checklist.md` against current env vars, scripts, and deploy steps; update on drift. |
| Per release | Tag + changelog | See below. |

### Release tagging & changelog

Commits already follow Conventional Commits (`CLAUDE.md` § Git Workflow), so:

- Tag releases with **SemVer** (`vMAJOR.MINOR.PATCH`): `fix`/`chore`/`style`
  bump patch, `feat` bumps minor, any commit with a `BREAKING CHANGE:` footer
  or `!` after the type bumps major.
- Maintain a `CHANGELOG.md` generated from commit history. Given commits are
  already Conventional, adopting
  [`release-please`](https://github.com/googleapis/release-please) (opens a
  standing "Release PR" that accumulates the changelog and version bump,
  merge to cut the release) removes the manual step; until then, hand-write
  entries grouped by `Added` / `Fixed` / `Changed` at each tag.
- Tag from `master` only, after CI is green on the commit being tagged.

### Archiving / deprecating

- Merged or 45+ day stale branches: handled by
  `.github/stale_branch_cleanup.md`.
- Unmaintained forks or superseded experiments living as branches: tag an
  `archive/<name>` snapshot (per the cleanup plan's Step 4) before deleting,
  so history is recoverable without keeping the ref around.

## Adapting for private vs. OSS

This repo (`torralba85/YardUp`) is currently private with two collaborators,
so most of the routine above already assumes a small, trusted contributor
set. If it is ever opened up publicly, or for any team adapting this playbook
to an OSS project, the differences that actually change behavior:

| Concern | Private/enterprise (current state) | Public OSS |
|---|---|---|
| Contributor identity | Collaborators are added directly to the repo; `CODEOWNERS` is enough to route review. | Add a CONTRIBUTOR_LICENSE / Developer Certificate of Origin (DCO) check (e.g. the `dco` GitHub Action) so external PRs carry a clear IP grant before merge. |
| Security disclosure | `SECURITY.md`'s private GitHub Security Advisory flow is sufficient; the maintainer is also the on-call. | Same advisory flow, but add an expected response-time SLA and a credit/acknowledgment policy in `SECURITY.md` — external researchers expect both. |
| Community conduct | Not needed; only known collaborators interact. | Add a `CODE_OF_CONDUCT.md` (e.g. Contributor Covenant) and link it from `README.md` and issue templates — public issue trackers attract drive-by hostility without one. |
| Issue/PR intake | Templates can assume the reporter already knows the stack (current `bug_report.md`/`feature_request.md`). | Same templates work, but expect more `status: needs-repro` cycling from first-time contributors; consider a CLA/DCO bot comment and a `good-first-issue`-tagged backlog to direct new contributors. |
| Secrets & CI | `ci.yml` injects production secrets (`FIREBASE_SERVICE_ACCOUNT`, API keys) directly into the deploy job on `master` push — acceptable because only trusted collaborators can push/merge. | **Do not** run that pattern on `pull_request` for forked-repo PRs — forked PRs from `pull_request_target`/secrets-bearing workflows are a classic supply-chain hole. Split into a secrets-free `pull_request` verify job (lint/test/build only, as today) and a separate `workflow_run`-gated or manually-approved deploy job once a PR is merged. |
| Branch protection reviewers | One reviewer (or self-merge for the sole maintainer) is fine. | Require review from someone outside the PR author's affiliation, and consider requiring a passing DCO/CLA check as a required status alongside CI. |
| Dependency tooling | Dependabot (already configured) is sufficient for a small private repo. | Same, plus enable GitHub's secret scanning + push protection (free for public repos) and Code Scanning (CodeQL) — both are no-cost safety nets that matter more once the clone/fork surface is unbounded. |

The concrete near-term gap if this repo goes public: `ci.yml`'s `deploy` job
trusts every push to `master`, which is fine under direct-collaborator-only
write access but would need the secrets-isolation split above before
accepting external contributions.
