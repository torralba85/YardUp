# Repository Governance

How `torralba85/YardUp` (LotFoundry) is triaged, branched, released, and kept
healthy. This is the narrative companion to the ready-to-use files already
living in `.github/`; it explains the *why* behind them and covers the
ground they don't (debugging methodology, branch strategy, maintenance
cadence, OSS vs. private posture). Read this once, then keep `.github/` as
the day-to-day checklist.

## What already exists in this repo

| Concern | File |
| --- | --- |
| Bug report template | `.github/ISSUE_TEMPLATE/bug_report.md` |
| Feature request template | `.github/ISSUE_TEMPLATE/feature_request.md` |
| Issue template router (blank issues off, security advisory link) | `.github/ISSUE_TEMPLATE/config.yml` |
| PR checklist | `.github/pull_request_template.md` |
| Issue triage checklist | `.github/triage_checklist.md` |
| Stale branch cleanup plan | `.github/stale_branch_cleanup.md` |
| Dependency updates | `.github/dependabot.yml` |
| CI gate + prod deploy | `.github/workflows/ci.yml` |
| Review ownership | `CODEOWNERS` |
| Vulnerability disclosure + accepted-risk register | `SECURITY.md` |
| Manual release log | `CHANGELOG.md` |

This doc doesn't repeat those files — it explains the framework around them
and calls out the gaps below.

## 1. Issue Triage & Bug Report Management

**Severity × Impact priority matrix:**

| | High impact (most users / core flow) | Low impact (edge case / cosmetic) |
| --- | --- | --- |
| **High severity** (data loss, broken build, prod deploy failure, security) | **P0** — drop everything | **P1** — next available slot |
| **Low severity** (visual glitch, minor UX friction) | **P1** — next available slot | **P2**/**P3** — backlog |

- **P0**: production down, feasibility numbers wrong, auth broken, deploy
  pipeline failing on `master`. Fix or roll back same day.
- **P1**: a real flow is broken for a subset of users/parcels; no
  workaround. Fix within the current week.
- **P2**: workaround exists, or affects a non-critical surface (e.g. one
  studio panel, one device class). Scheduled normally.
- **P3**: cosmetic, nice-to-have, or only reproducible in rare
  configurations. Backlog, candidate for `good-first-issue`.

**Label taxonomy** (apply one from each relevant group):

| Group | Labels |
| --- | --- |
| Type | `type: bug`, `type: feature`, `type: chore` |
| Status | `status: triage`, `status: needs-repro`, `status: confirmed`, `status: in-progress`, `status: blocked`, `status: stale` |
| Priority | `P0`, `P1`, `P2`, `P3` |
| Area | `area: parcel`, `area: studio`, `area: feasibility`, `area: auth`, `area: report`, `area: deploy`, `area: landing` |
| Disposition | `good-first-issue`, `wontfix`, `duplicate`, `security` |

Apply `security` and immediately switch to private handling per
`SECURITY.md` instead of continuing triage in the public issue thread.

**Reproducibility bar before an issue leaves `status: triage`:** OS,
browser/device, Node version if local dev, the parcel/address or demo
preset used (Seattle/Portland/Austin), exact steps, expected vs. actual
behavior, and console/network logs or a screenshot for anything visual or
3D-scene related. `.github/ISSUE_TEMPLATE/bug_report.md` already collects
all of this — an issue that skips fields gets `status: needs-repro`, not a
priority label.

**Workflow:** a maintainer triages new issues against
`.github/triage_checklist.md` within 2 business days. A triage pass is
"done" when every untriaged issue has a `type:`, a `status:`, and (if not
`needs-repro`) a priority label. Re-sweep `needs-repro` issues weekly;
auto-close after 14 days of no response (see §4 for the stale policy).

## 2. Diagnosing Errors & Reproducing Bugs

**Methodology:** logs → environment isolation → bisect → minimal
reproduction.

1. **Collect logs first.** Browser console + network tab for studio/3D
   issues, server logs for `app/api/*` routes, Firebase Functions logs
   (`firebase functions:log`) for anything that only fails in prod.
2. **Isolate the environment.** Does it reproduce in demo mode (no parcel
   API keys) or only with live Regrid/Maps data? Does it reproduce on a
   clean `npm ci` + `npm run dev`, or only on the reporter's machine
   (Node version, OS, browser)?
3. **Bisect to find the regression commit:**
   ```bash
   git bisect start
   git bisect bad HEAD
   git bisect good <last-known-good-tag-or-commit>
   # at each step:
   npm ci && npm run build && npm run test   # or a targeted repro script
   git bisect good   # or: git bisect bad
   git bisect reset
   ```
   For UI/visual regressions, swap the check for the relevant Playwright
   spec (`npx playwright test e2e/<spec>.spec.ts`) instead of the full
   suite, so each bisect step is fast.
4. **Build a Minimal Reproducible Example (MRE)** before escalating: the
   smallest parcel input / route / component state that triggers the bug,
   stripped of unrelated app state. An MRE is required before a `P0`/`P1`
   gets assigned past triage — it's what lets a second person reproduce in
   under a minute instead of guessing.

**Flaky tests:** if a Vitest or Playwright spec fails intermittently, don't
retry-and-ignore. Re-run the specific spec 5–10x locally
(`npx playwright test <spec> --repeat-each=10`); if it's timing/animation
related, prefer explicit waits over `sleep`. File it with `status:
needs-repro` + a `flaky-test` note rather than silently skipping it — a
skipped flaky test is a regression waiting to happen.

**Environment-specific failures:** check Node version (CI pins Node 22 in
`ci.yml`) and whether the failure needs live `GOOGLE_MAPS_API_KEY` /
`REGRID_API_KEY` / Firebase config that demo mode doesn't exercise.

**Dependency regressions:** Dependabot groups minor/patch updates weekly
(`.github/dependabot.yml`). When a Dependabot PR breaks CI, bisect within
that PR's diff first (usually one package) before assuming an app bug.

## 3. Branch Management Strategy

**Recommendation: GitHub Flow**, not Git Flow or pure trunk-based.

- Git Flow's `develop`/`release/*` branches add overhead this two-owner
  (`CODEOWNERS`: `@torralba85`, `@andrewtorralba-collab`) repo doesn't need,
  and there's no separate release train — `master` deploys to production
  on every push (`ci.yml` `deploy` job).
- Pure trunk-based (commit straight to trunk, no PRs) doesn't fit because
  CI already gates on PRs and `CODEOWNERS` implies review is expected.
- **GitHub Flow** — short-lived branches off `master`, PR + CI gate, merge,
  auto-deploy — is what's already implemented in `ci.yml`. Keep it.

**Branch naming**, matching what's already in use in this repo:

| Prefix | Use |
| --- | --- |
| `feat/` | new functionality |
| `fix/` | bug fix |
| `chore/` | tooling, deps, governance, non-product |
| `docs/` | documentation only |
| `refactor/` | no behavior change |
| `redesign/` | larger UI/UX direction changes (e.g. `redesign/feasibility-verdict`) |
| `release/`, `hotfix/` | reserved for if/when a release train is needed |
| `claude/<session>` | agent-authored sessions (this repo's Claude Code branches) |

**Merge policy:**
- **Squash merge by default** — keeps `master` history one commit per PR,
  matches the Conventional Commits subject line, and keeps `git bisect`
  fast.
- **Merge commit** only for a PR that intentionally ships a sequence of
  meaningful, independently-reviewable commits (e.g. the
  `docs/superpowers/plans` → spec → implementation pattern already used
  here).
- **Avoid rebase-merge** on this repo: rewriting history on a branch that
  CI auto-deploys from on every push raises the cost of a mistake for
  little benefit at this team size.

**Branch protection on `master`** (verify these are turned on in GitHub
repo settings — `CODEOWNERS` and `ci.yml` alone don't enforce anything by
themselves):
- Require a PR before merging, no direct pushes.
- Require the `verify` job from `.github/workflows/ci.yml` (lint, test,
  tsc, build, e2e) to pass.
- Require review from Code Owners, require branches to be up to date
  before merging.
- Disallow force-push and branch deletion on `master`.

This matters more than usual here because a merge to `master` is a
production deploy, not just a merge.

## 4. Repository Health Routine

| Cadence | Task |
| --- | --- |
| Weekly | Review/merge Dependabot PRs (npm root, `functions/`, GitHub Actions); confirm `ci.yml` is green on `master`. |
| Weekly | Sweep `status: needs-repro` issues older than 7 days; close at 14 days with no response. |
| Monthly (1st Monday) | Run the stale branch audit in `.github/stale_branch_cleanup.md`. |
| Quarterly | Full `npm audit`, review `SECURITY.md`'s accepted-risk entries for upstream fixes (e.g. the tracked PostCSS/Next.js advisory), dependency major-version review, re-read `README.md`/`docs/deployment.md` for drift. |
| Per release | Update `CHANGELOG.md` under `[Unreleased]` as PRs land; cut a version section + tag on deploy. |

**Release tagging & changelog:** `CHANGELOG.md` already follows Keep a
Changelog + SemVer and is maintained by hand, and commits already follow
Conventional Commits per `CLAUDE.md`. Since both pieces are already in
place, the only gap is automation — consider `release-please` (Conventional
Commits → changelog + version PR) once changelog upkeep becomes a chore
rather than maintaining it by hand indefinitely.

**Archiving/deprecating:** an unmaintained branch follows
`.github/stale_branch_cleanup.md`. A whole feature direction that's
abandoned (e.g. a `redesign/*` spike that's superseded) should be tagged
(`git tag archive/<branch>-backup`) before deletion, same as that doc
already specifies — don't invent a separate process for "big" abandoned
work.

## 5. Templates & Checklists

Already delivered and in active use — see the table at the top of this
doc. No changes needed; they match the standard shape (environment +
repro steps + expected/actual for bugs, motivation + alternatives +
acceptance criteria for features, author/reviewer checklist for PRs,
audit/communicate/delete/archive for stale branches).

## 6. Private repo today vs. opening up to OSS contributors

**Current state:** private, two owners, no external contributors — but
already holding itself to public-repo hygiene (`SECURITY.md` with a
private advisory intake, issue/PR templates, Dependabot). That's the right
posture if a public launch is on the roadmap; it means there's no second
migration later.

**If/when this repo (or a public LotFoundry repo) takes outside
contributors, add:**
- `CODE_OF_CONDUCT.md` (Contributor Covenant is the default choice).
- `CONTRIBUTING.md` covering local setup (already in `README.md`), how to
  claim a `good-first-issue`, and the PR process.
- A DCO bot (`probot/dco`) or CLA bot if contribution licensing needs to be
  explicit — DCO (`Signed-off-by` trailer) is the lighter-weight, more
  contributor-friendly default; reserve a full CLA for cases needing
  copyright assignment.
- A public-facing security policy section that's explicit about response
  time SLAs, since right now `SECURITY.md` is intake-only.

**Tooling stays mostly the same either way** — `CODEOWNERS`, branch
protection, and Dependabot apply equally to private and OSS repos. The
difference is process (who's allowed to triage/merge, public vs. private
disclosure, contributor agreement) rather than tooling.

## Open items from this review

- **`.github/workflows/ai-maintainer.yml`** triggers on every new issue and
  posts an "AI Maintainer Bot" comment, but the analysis is a hardcoded
  placeholder string, not a real model call, and the job has no
  `permissions: issues: write` block — under default token permissions the
  comment step will fail, and even if it succeeded it would post a
  fabricated assessment to every new issue. Recommend either wiring it up
  to a real call or removing it until it is — left untouched pending a
  decision, since it's a meaningful behavior change either way.
- Branch protection rules for `master` (required reviews, required status
  checks, no force-push) need to be confirmed/enabled in GitHub repo
  settings — they can't be verified from the file tree alone.
