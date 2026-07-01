# Repository Governance

Maintainer playbook for `torralba85/YardUp` (product: LotFoundry). This is the
policy layer; the ready-to-use checklists and templates it references live in
`.github/` and are linked inline below. Current repo posture: **private,
two-owner** (`@torralba85`, `@andrewtorralba-collab`, see `CODEOWNERS`),
CI-deploys-to-production on `master`. Section 6 covers what would need to
change if this repo ever opens to outside contributors.

---

## 1. Issue Triage & Bug Report Management

### Prioritization framework (Severity × Impact)

| | **Widespread** (most users/all envs) | **Narrow** (edge case, one env) |
|---|---|---|
| **Breaks core flow** (parcel search, feasibility calc, auth, checkout, deploy) | **P0** — drop other work, fix same day | **P1** — next release, can hotfix if trivial |
| **Degrades a feature** (AI panel, report export, 3D scene glitch) | **P1** — next release | **P2** — scheduled, batched with related work |
| **Cosmetic / minor friction** | **P2** — scheduled | **P3** — backlog, `good-first-issue` candidate |

Security reports always start at P0/P1 regardless of the matrix above — route
through `SECURITY.md`, never a public issue.

### Labeling taxonomy

| Category | Labels |
|---|---|
| Type | `type: bug`, `type: feature`, `type: chore`, `type: security` |
| Status | `status: triage`, `status: needs-repro`, `status: confirmed`, `status: in-progress`, `status: blocked`, `status: wontfix`, `status: stale` |
| Priority | `P0`, `P1`, `P2`, `P3` |
| Area | `area: studio`, `area: parcel`, `area: ai`, `area: auth`, `area: stripe`, `area: builder`, `area: deploy` |
| Community | `good-first-issue`, `help-wanted` |

This is the taxonomy already seeded by `.github/ISSUE_TEMPLATE/*` (`status:
triage`, `type: bug`, `type: feature`) and `.github/triage_checklist.md`
(`P0`–`P3`, `status: needs-repro`, `good-first-issue`, `area: *`) — extend
this table before inventing a new label rather than the other way around.

### Reproducibility bar before acceptance

An issue moves out of `status: triage` only once it has: OS + runtime
version (Node version, browser), LotFoundry commit/version, exact steps to
reproduce, expected vs. actual behavior, and logs/console output or a
screenshot. `.github/ISSUE_TEMPLATE/bug_report.md` collects all of these
fields at submission time; anything missing gets `status: needs-repro` and a
comment naming the specific gap (not a generic "please add more info").

### Triage workflow

- **Who:** a CODEOWNER (currently `@torralba85` or `@andrewtorralba-collab`).
- **Cadence:** new issues get a first pass within 2 business days; a full
  sweep of the open backlog runs weekly (bundle with the health routine in
  §4).
- **Steps:** follow `.github/triage_checklist.md` — dedupe check, environment
  review, reproducibility validation, secrets/security screening, label
  application, priority assignment, ownership assignment for P0/P1.
- **Done looks like:** every open issue has a `type:`, a `status:`, and (if
  past `needs-repro`) a priority label; P0s have an assignee.

---

## 2. Diagnosing Errors & Reproducing Bugs

Standard escalation path, cheapest step first:

1. **Log collection.** Browser console + network tab for client bugs;
   `functions` logs (`firebase functions:log` or the GCP console) for
   API-route/Cloud Function bugs; Vitest/Playwright output for test failures.
   Capture the exact request payload and response for API-route bugs — most
   `app/api/*` handlers here are thin wrappers around `lib/server/*`.
2. **Environment isolation.** Reproduce with a clean install
   (`rm -rf node_modules .next && npm ci`) to rule out local dependency
   drift. Toggle `LOTFOUNDRY_ALLOW_PUBLIC_API` / `LOTFOUNDRY_DEMO_UNLOCKS` /
   missing API keys to see if the bug is env-config-dependent (demo mode vs.
   live-data mode behave differently by design — check `README.md` before
   assuming a missing key is the bug).
3. **Bisect.** If the bug is a regression (worked before, broken now), use
   `git bisect` against `master`:
   ```bash
   git bisect start
   git bisect bad                 # current commit is broken
   git bisect good <last-known-good-sha>
   # for each step: reproduce, then:
   git bisect good   # or: git bisect bad
   # when done:
   git bisect reset
   ```
   Automate the reproduction step with `git bisect run <script>` when the bug
   has a scriptable repro (a failing Vitest/Playwright spec, a `curl` against
   a route that asserts on the response).
4. **Minimal Reproducible Example (MRE).** Before escalating or filing,
   strip the repro to the smallest scenario that still fails — a single
   Vitest test, one demo-preset flow, one API route call with minimal
   payload. An MRE is required before a bug moves past `status:
   needs-repro`: it's the difference between "the studio is broken" (not
   actionable) and "`computeFeasibility` returns `NaN` NOI when `bedrooms:
   0`" (actionable, and usually becomes the regression test for the fix per
   the working rule in `CLAUDE.md`: *"A bug fix should usually get a
   reproducing test before the fix."*).

### Flaky tests, env-specific failures, dependency regressions

- **Flaky tests:** re-run in isolation (`npx vitest run <file>` /
  `npx playwright test <file> --repeat-each=5`) before assuming flakiness —
  confirm it isn't a real race first. If genuinely flaky, check for
  unmocked timers/dates, real network calls that should be mocked, or
  R3F/canvas timing (see the `LabelSprite` gotcha in `CLAUDE.md`) before
  adding retries or skips.
- **Environment-specific failures:** compare Node version, OS, and browser
  against CI (`.github/workflows/ci.yml`) first — most "works on my machine"
  cases here trace back to a missing `.env.local` var (demo mode masks it)
  or a Playwright browser-channel mismatch.
- **Dependency regressions:** `git log -p -- package-lock.json` around the
  suspect window, or `npm ls <package>` to confirm the resolved version
  matches what CI/Dependabot bumped. Never run `npm audit fix --force` (see
  `CLAUDE.md` Critical Gotchas) — pin/override deliberately instead.

---

## 3. Branch Management Strategy

**Recommendation: GitHub Flow**, not Git Flow or full trunk-based
development. Rationale: this is a two-owner team shipping continuously
(CI deploys `master` straight to production Firebase Hosting/Functions on
every push — see `.github/workflows/ci.yml`), not a scheduled-release
product. Git Flow's `develop`/`release` branches add ceremony with no
payoff at this team size; strict trunk-based (commit straight to `master`)
removes the PR review gate that `CODEOWNERS` and CI status checks depend on.
GitHub Flow — short-lived feature branches off `master`, PR + review + CI,
merge, deploy — matches both the team size and the existing CI/CD wiring.
Revisit this if the team grows past ~5 active contributors or release
cadence becomes fixed-schedule.

### Branch naming

| Prefix | Use |
|---|---|
| `feat/<slug>` | New functionality |
| `fix/<slug>` | Bug fix |
| `chore/<slug>` | Tooling, deps, non-product-behavior changes |
| `style/<slug>` | Visual/design-only changes |
| `docs/<slug>` | Documentation only |
| `release/<version>` | Rare — only if a release needs its own stabilization window |
| `hotfix/<slug>` | Urgent production fix bypassing the normal queue |
| `claude/<generated-slug>` | Sessions launched via Claude Code on the web (current convention — do not rename) |

### Merge policy

- **Default: squash merge.** Keeps `master` history one commit per logical
  change, matches the Conventional Commits requirement already in
  `CLAUDE.md` and enforced via the PR checklist's Release Impact section.
- **Merge commit:** acceptable for a `release/*` branch carrying multiple
  already-reviewed, independently meaningful commits worth preserving
  individually.
- **Rebase:** use locally to keep a feature branch current with `master`
  before requesting review (`git rebase origin/master`); do not rebase a
  branch that's already under active review without flagging it, since it
  invalidates in-flight review comments' line anchors.

### Branch protection on `master`

- Require at least 1 approving review (2 for changes touching
  `firebase.json`, `firestore.rules`, `firestore.indexes.json`,
  `.github/workflows/`, or `scripts/prepare-firebase.js` — these are the
  paths `CODEOWNERS` already restricts to `@torralba85`).
- Require status checks to pass before merge: lint, Vitest, `tsc --noEmit`,
  build, Playwright (the jobs `.github/workflows/ci.yml` already runs).
- Require branches to be up to date with `master` before merging.
- No direct pushes to `master` (PR-only), no force-push, no branch deletion
  override.
- Restrict who can push to `master` to CODEOWNERS, since `master` deploys to
  production on every merge.

---

## 4. Repository Health Routine

### Schedule

| Cadence | Task |
|---|---|
| Weekly | Issue triage sweep (§1). Review open Dependabot PRs (`.github/dependabot.yml` runs weekly for `npm` root, `npm` `functions/`, and `github-actions`) — merge patch/minor groups after CI passes, evaluate majors individually. |
| Weekly | CI pipeline health check — any flaky/red job on `master` gets a same-week fix, not a silent re-run habit. |
| Monthly | Stale branch audit — first Monday, per `.github/stale_branch_cleanup.md`. |
| Monthly | Secrets scan — confirm no `.env.local`/`functions/.env` values ever hit history (`git log -p -- .env.local functions/.env` should be empty); rotate any key that was ever exposed, note it in `SECURITY.md`. |
| Monthly | Documentation freshness — spot-check `README.md`, `CLAUDE.md`/`AGENTS.md`, and `docs/AGENTS.md` against actual `package.json` scripts and `app/` routes; stale docs get filed as `type: chore`. |
| Per release | Run `docs/release-checklist.md` in full before any deploy beyond routine `master` pushes. |

### Release tagging & changelog

Already in place — keep using it:
- **Versioning:** Semantic Versioning (`package.json` `version`, currently
  `1.0.1`).
- **Changelog:** `CHANGELOG.md`, Keep a Changelog format, updated under
  `[Unreleased]` as changes land and cut into a dated version section at
  release time.
- **Commit convention:** Conventional Commits (`fix(scope): ...`,
  `feat(scope): ...`) is already required per `CLAUDE.md`'s Git Workflow
  section and the PR checklist's Release Impact block — this is what would
  let a tool like `release-please` or `conventional-changelog` auto-draft
  the changelog if/when tagging volume justifies automating it. Not needed
  yet at this cadence; a manual `CHANGELOG.md` edit per notable change is
  sufficient.
- **Tagging:** tag `master` at each version bump (`git tag v1.0.1 && git
  push origin v1.0.1`) once tagging starts being used for rollback
  reference — not currently tagged (`git tag` is empty as of this writing),
  worth starting at the next release cut so `docs/deployment.md` rollback
  steps have a concrete ref to roll back to.

### Archiving / deprecating unmaintained work

- A branch that fails the stale-branch cleanup criteria twice in a row
  (still unmerged, still inactive after the warning window) gets archived
  via `archive/<branch-name>-backup` tag and deleted, per
  `.github/stale_branch_cleanup.md` §4.
- A feature or experiment that's shipped-but-abandoned (code merged, not
  removed, no longer on the roadmap) belongs in `TODOS.md` with its trigger
  condition, not silently left in the tree — that file already tracks this
  kind of deferred/parked work with rationale.

---

## 5. Templates & Checklists

All five are already implemented and live under `.github/` — this section is
the index, not a re-implementation:

| Template | Location |
|---|---|
| Issue Triage Checklist | [`.github/triage_checklist.md`](../.github/triage_checklist.md) |
| Bug Report Template | [`.github/ISSUE_TEMPLATE/bug_report.md`](../.github/ISSUE_TEMPLATE/bug_report.md) |
| Feature Request Template | [`.github/ISSUE_TEMPLATE/feature_request.md`](../.github/ISSUE_TEMPLATE/feature_request.md) |
| Pull Request Checklist | [`.github/pull_request_template.md`](../.github/pull_request_template.md) |
| Stale Branch Cleanup Plan | [`.github/stale_branch_cleanup.md`](../.github/stale_branch_cleanup.md) |

Supporting config already in place: `.github/ISSUE_TEMPLATE/config.yml`
(routes security reports to GitHub Security Advisories instead of a public
issue), `.github/dependabot.yml` (weekly dependency PRs, grouped
minor/patch), `CODEOWNERS` (review routing), `SECURITY.md` (disclosure
policy + tracked advisories).

---

## 6. Adapting for Private vs. OSS

This repo is currently **private/enterprise**: two named owners, no outside
contributors, CI deploys straight to production. Several things above are
already written in an OSS-compatible way (public-facing `SECURITY.md`
advisory flow, issue templates, `good-first-issue` labeling) — that's
intentional headroom, not overbuild, in case the repo opens up. What's
still private-only vs. what full OSS would require:

| Concern | Private/enterprise (current) | Full OSS |
|---|---|---|
| Contributor agreement | None needed — both owners are trusted, no CLA/DCO | Add a DCO bot (`Signed-off-by` enforcement) or CLA-assistant before accepting outside PRs |
| Security disclosure | `SECURITY.md` + GitHub Security Advisories (already public-repo-shaped) | Same mechanism works as-is; add a public disclosure timeline (e.g., 90-day) once there's an external user base to protect |
| Code of conduct | Not needed at 2 owners | Add `CODE_OF_CONDUCT.md` (Contributor Covenant is the standard default) before opening issues/PRs to the public |
| Review/merge rights | Both owners can merge; `CODEOWNERS` gates sensitive paths | Keep `CODEOWNERS` gating deploy-critical paths (`firebase.json`, `firestore.rules`, workflows) to maintainers only even after opening contributions elsewhere |
| CI | GitHub Actions with repo secrets, deploys on `master` (`.github/workflows/ci.yml`) | Same Actions setup, but gate the deploy job so it never runs off a fork's PR (forked-PR runs must not have access to Firebase/Stripe secrets — use `pull_request_target` carefully or split build-and-test from deploy) |
| Onboarding | Direct — `README.md` + `CLAUDE.md`/`AGENTS.md` are the onboarding doc | Add a `CONTRIBUTING.md` covering local setup, how to pick up a `good-first-issue`, and the PR/triage flow described above, since new contributors won't have this conversation history |
| Dependency/secret scanning | Dependabot (`.github/dependabot.yml`) + manual secrets check (§4) | Same, plus enable GitHub secret scanning + push protection at the org level (requires public repo or GHAS) |

**If this repo opens to outside contributors:** add `CONTRIBUTING.md` and
`CODE_OF_CONDUCT.md` first, split the CI workflow so untrusted fork PRs
never see deploy secrets, and only then start labeling issues
`good-first-issue` in earnest — the label already exists in the taxonomy
above but has no real audience yet in a two-owner private repo.
