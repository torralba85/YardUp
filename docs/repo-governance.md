# Repository Governance

This is the operating guide for maintaining `torralba85/YardUp` (product: LotFoundry).
It complements the templates already in `.github/` rather than duplicating them —
see the cross-references in each section.

Repo profile: **private, two-owner** repo (`@torralba85`, `@andrewtorralba-collab`
per `CODEOWNERS`), single Next.js/Firebase deploy target, CI auto-deploys `master`
to production. Every recommendation below is sized for that team, not a large OSS
community — see [§6](#6-oss-vs-private-adaptation) for what would change if this
repo ever opens up.

## 1. Issue Triage & Bug Report Management

**Labeling taxonomy** (create these in the GitHub UI under Issues → Labels if not
already present):

| Prefix | Values | Purpose |
|---|---|---|
| `type:` | `bug`, `feature`, `chore`, `security` | What kind of change |
| `status:` | `triage`, `needs-repro`, `confirmed`, `in-progress`, `blocked`, `wontfix`, `stale` | Lifecycle state |
| `area:` | `studio`, `builder`, `auth`, `ai`, `stripe`, `parcel`, `landing`, `firebase` | Subsystem, matches `Repo Map` in `CLAUDE.md` |
| `priority:` | `P0`, `P1`, `P2`, `P3` | Severity × impact (below) |
| `good-first-issue` | — | Small, well-scoped, no hidden context needed |

**Severity × impact matrix** for the `priority:` label:

| | High impact (most users / core flow: studio, checkout, auth) | Low impact (edge case, cosmetic, single user) |
|---|---|---|
| **High severity** (crash, data loss, security, broken deploy) | **P0** — drop everything, fix same day | **P1** — next available cycle |
| **Low severity** (degraded UX, workaround exists) | **P1** — next available cycle | **P2/P3** — backlog, batch with related work |

- P0: production down, auth broken, checkout broken, secret leaked, data loss.
- P1: a core surface (studio 3D scene, feasibility calc, builder inbox) is wrong or broken for a segment of users.
- P2: minor bug or missing polish with a workaround.
- P3: cosmetic, nice-to-have, or speculative enhancement.

**Reproducibility requirements before an issue leaves `status: triage`:**
OS, runtime/Node version, browser + version (this is a browser-first app), steps
to reproduce, expected vs. actual behavior, and console/network logs or a
screenshot. The bug report template (`.github/ISSUE_TEMPLATE/bug_report.md`)
already collects all of these — do not accept a bug past triage without them
filled in; apply `status: needs-repro` and ask instead.

**Triage workflow:** the repo owner (`@torralba85`) triages new issues within
2 business days. A triage pass is "done" when every issue opened since the last
pass has: a `type:` label, an `area:` label, a `priority:` label, and either
`status: confirmed` (reproduced) or `status: needs-repro` (waiting on the
reporter). Use `.github/triage_checklist.md` as the step-by-step checklist for
each individual issue.

## 2. Diagnosing Errors & Reproducing Bugs

Methodology, in order:

1. **Collect logs first.** Browser console + network tab, Vercel/Firebase
   Hosting logs, Cloud Functions logs (`firebase functions:log` or GCP
   Console), and — for AI/Stripe routes — the structured error responses from
   `lib/server/openai.ts` / `app/api/stripe/webhook/route.ts`. Do not start
   changing code before you have the actual stack trace or HTTP status.
2. **Isolate the environment.** Reproduce with `npm run dev` locally first. If
   it only fails on Firebase Hosting/Functions, the cause is almost always
   env vars (see `CLAUDE.md` → Environment), a rewrite mismatch between
   `firebase.json` / `functions/index.js` / `scripts/prepare-firebase.js`, or
   a Node version skew (CI pins Node 22).
3. **Bisect the regression** once you know it used to work:
   ```bash
   git bisect start
   git bisect bad HEAD
   git bisect good <last-known-good-tag-or-commit>
   # git checks out a midpoint; test it, then:
   git bisect good   # or: git bisect bad
   # repeat until git reports the first bad commit
   git bisect reset
   ```
   For UI regressions, pair this with the relevant Playwright spec or a quick
   manual check at the affected route so each step is a fast yes/no.
4. **Build a Minimal Reproducible Example (MRE)** before escalating or filing:
   strip the repro down to the smallest route/component/input that still
   fails, remove unrelated state (auth, saved scenarios, unrelated panels),
   and paste the exact steps + expected/actual behavior into the bug report
   template. An MRE is required before a P0/P1 bug is assigned — it's usually
   what reveals the actual root cause.

**Flaky tests:** re-run the specific spec 3x locally (`npx playwright test
<file> --repeat-each=3`) before assuming it's flaky rather than a real race.
Common causes in this repo: R3F/WebGL scene not finished rendering before an
assertion (add an explicit wait for the canvas/label sprite instead of a fixed
sleep), and hydration timing on `motion-safe:` transitions. Quarantine a
confirmed-flaky test with `test.fixme()` + a linked issue rather than deleting
it or leaving it silently red.

**Environment-specific failures:** check Node version (`node -v` vs. CI's
Node 22), and whether `LOTFOUNDRY_ALLOW_PUBLIC_API` / `OPENAI_API_KEY` /
Firebase env vars are set — most "works on my machine" gaps here are missing
`.env.local` keys, not code bugs.

**Dependency regressions:** `git log -- package-lock.json` around the
regression window, or bisect as above. Never `npm audit fix --force` (see
`CLAUDE.md` gotchas) — it can force a breaking Next.js downgrade; track
upstream fixes in `SECURITY.md` instead.

## 3. Branch Management Strategy

**Recommended: GitHub Flow**, not Git Flow or full trunk-based development.
Rationale: two-person team, no parallel release trains, CI deploys `master`
straight to production on every push (see `.github/workflows/ci.yml`). Git
Flow's `develop`/`release/*` branches add ceremony this team doesn't need;
pure trunk-based (commit straight to `master`) skips the PR review this repo
already relies on for `CODEOWNERS`-gated paths (`firebase.json`,
`firestore.rules`, deploy scripts, workflows).

**Branch naming:** `feat/<slug>`, `fix/<slug>`, `chore/<slug>`,
`style/<slug>`, `docs/<slug>`, `hotfix/<slug>` — matching the Conventional
Commit types already used in this repo's git log. `release/*` is not used
today; introduce it only if a second concurrent release line becomes
necessary.

**Merge policy:**
- **Squash merge** (default) for feature/fix branches with many small or WIP
  commits — keeps `master` history readable and matches the Conventional
  Commits scope this repo uses for changelog/versioning.
- **Merge commit** when a branch's individual commits are already
  well-scoped and worth preserving (e.g. a multi-part feature landed as
  reviewed, atomic commits) — this repo's history already has some of these
  (`Merge pull request #NN ...`).
- **Rebase** locally before opening/updating a PR to keep it up to date with
  `master`; avoid rebasing a branch that's already been pushed and reviewed,
  to not invalidate reviewer context.

**Branch protection on `master`** (configure under Settings → Branches if not
already set):
- Require a pull request before merging — no direct pushes, including for
  admins if the team is comfortable with that friction.
- Require the `verify` CI job (`.github/workflows/ci.yml`) to pass before
  merge.
- Require review from a `CODEOWNERS` match on protected paths
  (`firebase.json`, `firestore.rules`, `.github/workflows/`,
  `scripts/prepare-firebase.js`).
- No force-push, no branch deletion, on `master`.
- Since CI deploys production on every `master` push, treat "merge" as
  "deploy" — do not merge anything you wouldn't ship immediately.

## 4. Repository Health Routine

**Weekly:**
- Review Dependabot PRs (`.github/dependabot.yml` already runs weekly for
  root, `functions/`, and GitHub Actions) — merge minor/patch groups after CI
  is green; review major bumps manually.
- Skim CI run history for `.github/workflows/ci.yml` and
  `.github/workflows/ai-maintainer.yml` for new flakiness or slow steps.
- Triage new issues to `status: confirmed` / `needs-repro` (§1).

**Monthly:**
- Run the stale-branch audit exactly as documented in
  `.github/stale_branch_cleanup.md` (first Monday of the month).
- `npm audit` review — log any accepted risk in `SECURITY.md` the same way
  the existing PostCSS entry is documented, with status, path, and why it's
  not yet patched. Never use `npm audit fix --force`.
- GitHub secret scanning / push protection alerts review (enable both under
  Settings → Code security if not already on, since this repo handles
  Stripe/OpenAI/Firebase secrets).
- Spot check that `CLAUDE.md`, `AGENTS.md`, `docs/AGENTS.md`, and `README.md`
  still match the actual stack/commands (they must be kept in sync per
  `CLAUDE.md`).

**Release tagging & changelog:** this repo already follows [Keep a
Changelog](https://keepachangelog.com/) + [SemVer](https://semver.org/) in
`CHANGELOG.md`, and Conventional Commits in commit messages (`fix(scope):`,
`feat(scope):`, etc. per `CLAUDE.md`). Keep doing this manually — add entries
under `[Unreleased]` as PRs land, cut a version by moving `[Unreleased]` into
a dated `[x.y.z]` section and bumping `package.json`'s `version` field to
match. If this becomes a burden, introduce
[`release-please`](https://github.com/googleapis/release-please) or
[`changesets`](https://github.com/changesets/changesets) to automate the
version bump + changelog PR from Conventional Commit history — not required
today at this team size.

**Archiving/deprecating:** no unmaintained forks or side-projects live in this
repo today. If a large experimental branch or spec under
`docs/superpowers/plans/` is abandoned, close the branch per
`.github/stale_branch_cleanup.md` and mark the plan doc with a one-line
"Superseded by / Abandoned — see #<issue>" header rather than deleting it.

## 5. Templates & Checklists

All five are already in place — this section just indexes them so they're
easy to find, per `CLAUDE.md`'s instruction to keep this file from bloating
with content that belongs elsewhere:

| Template | Location |
|---|---|
| Issue Triage Checklist | [`.github/triage_checklist.md`](../.github/triage_checklist.md) |
| Bug Report Template | [`.github/ISSUE_TEMPLATE/bug_report.md`](../.github/ISSUE_TEMPLATE/bug_report.md) |
| Feature Request Template | [`.github/ISSUE_TEMPLATE/feature_request.md`](../.github/ISSUE_TEMPLATE/feature_request.md) |
| Pull Request Checklist | [`.github/pull_request_template.md`](../.github/pull_request_template.md) |
| Stale Branch Cleanup Plan | [`.github/stale_branch_cleanup.md`](../.github/stale_branch_cleanup.md) |

Related existing docs: `SECURITY.md` (vulnerability reporting + accepted-risk
log), `.github/dependabot.yml` (dependency update cadence), `CODEOWNERS`
(review routing), `docs/release-checklist.md` (pre-release manual + automated
QA gates — complements, not replaces, this file's release/changelog process).

## 6. OSS vs. Private Adaptation

This repo is currently **private, two-owner, no external contributors** — the
policies above assume that. If `torralba85/YardUp` is ever opened up publicly,
add:

- **`CONTRIBUTING.md`** — setup steps, how to run `npm run lint && npm run
  test && npx tsc --noEmit && npm run build` before opening a PR, and how PRs
  from forks are handled (CI in `.github/workflows/ci.yml` currently assumes
  `push`/`pull_request` from within the repo; forked-PR workflows need
  `pull_request_target` handling or a maintainer-triggered CI run to avoid
  leaking secrets to untrusted code).
- **`CODE_OF_CONDUCT.md`** — required for any repo accepting outside
  contributions.
- **DCO or CLA bot** — a `Signed-off-by` DCO check (lightweight,
  GitHub-native) is a reasonable default over a full CLA for a small OSS
  project; a CLA is heavier tooling this team doesn't need while private.
- **Public security disclosure policy** — `SECURITY.md` already has a private
  reporting channel via GitHub Security Advisories, which is the right
  mechanism for OSS too; add an expected response-time SLA once there are
  external reporters to set expectations for.
- **Public-safe secret hygiene** — going public means the CI deploy step in
  `.github/workflows/ci.yml` (which writes `OPENAI_API_KEY`, `STRIPE_*`,
  Firebase secrets to disk during deploy) must never run on
  contributor-triggered workflow runs; keep production deploy gated to
  `push` on `master` from the base repo only, as it is today, and never
  extend it to `pull_request_target` without careful secret scoping.
- **Fine-grained `CODEOWNERS`** already exists and scales fine to OSS — no
  change needed there, just expect more paths to need explicit owners as
  more contributors touch more areas.
- **Tooling parity** — Dependabot, branch protection, and secret scanning
  (all recommended above) work identically for private and public repos on
  GitHub; the main OSS-specific additions are contributor-facing docs and
  the CI/secrets boundary called out above, not new infrastructure.

Internal/private-repo equivalents of the OSS items above, already in place:
`CODEOWNERS`-based review routing stands in for a CLA/DCO gate, and
`.github/triage_checklist.md` + issue templates stand in for a public
contributor-facing bug bounty/support process.
