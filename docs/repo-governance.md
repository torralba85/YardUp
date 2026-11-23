# Repository Governance

This is the umbrella doc for how `torralba85/YardUp` is triaged, debugged,
branched, and maintained. It complements — not replaces — these existing
files:

- `CONTRIBUTING.md` — branch strategy, naming, merge policy, branch protection
- `CODEOWNERS` — required reviewers on deploy-sensitive paths
- `SECURITY.md` — private vulnerability disclosure
- `.github/pull_request_template.md` — PR author/reviewer checklist
- `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md` — issue intake forms
- `.github/triage_checklist.md` — per-issue triage steps
- `.github/stale_branch_cleanup.md` — monthly branch audit
- `.github/dependabot.yml` — automated dependency PRs

This doc covers what those don't: the priority matrix triage uses, how to
debug and bisect a regression, the recurring repo-health routine, and the
release/changelog strategy.

## Priority framework (Severity × Impact)

`.github/triage_checklist.md` asks the triager to "evaluate Severity vs.
Impact and apply a single priority tag." This is that matrix. Severity is
how broken the behavior is; impact is how much of the product/user base hits
it. Priority is the higher of the two axes, not an average.

| Severity ↓ / Impact →         | Low (edge case, cosmetic) | Medium (a core flow, workaround exists) | High (core flow, no workaround, or affects most users) |
|---|---|---|---|
| **Critical** (data loss, security, prod down, payment broken) | P1 | P0 | P0 |
| **Major** (feature broken, wrong output, blocks a task) | P2 | P1 | P0 |
| **Minor** (visual glitch, wrong copy, non-blocking) | P3 | P2 | P1 |

- **P0 — drop everything.** Production is down, Stripe checkout/webhook is
  broken, Firestore rules leak data, auth is broken for all users, or the
  Firebase deploy in `.github/workflows/ci.yml` is failing on `master`.
  Fix or roll back same-day.
- **P1 — next up.** A core studio/builder flow (feasibility calc, parcel
  lookup, AI panel, lead unlock) is broken for a meaningful slice of users
  with no workaround. Target: current week.
- **P2 — scheduled.** Real bug or missing capability, but a workaround
  exists or the surface area is narrow (one browser, one device class, one
  secondary panel). Target: next few PR cycles.
- **P3 — backlog.** Cosmetic, copy, `good-first-issue` candidates,
  nice-to-haves. No target date; pick up opportunistically.

Re-triage on new information: a P3 that turns out to affect Stripe billing
or Firestore security rules becomes P0/P1 immediately, regardless of how it
was first labeled.

## Diagnosing errors & reproducing bugs

Order of operations before touching code:

1. **Collect logs.** Browser console + network tab for client bugs;
   `functions` logs (`firebase functions:log` or the Firebase console) for
   server/API route failures; the failing CI job's log for build/test
   failures. For AI routes (`app/api/ai/*`), check the rate-limit and auth
   layers (`lib/server/ai-rate-limit.ts`, `lib/server/api-auth.ts`) before
   assuming the OpenAI call itself failed.
2. **Isolate the environment.** Reproduce with `npm run dev` locally first.
   Note Node version, browser, OS, and whether `LOTFOUNDRY_ALLOW_PUBLIC_API`
   / `LOTFOUNDRY_DEMO_UNLOCKS` / demo-mode (no parcel API keys) change the
   outcome — these flags materially change code paths and are a common
   source of "works on my machine."
3. **Bisect if it's a regression.** If the bug wasn't present at some known
   commit/tag:

   ```bash
   git bisect start
   git bisect bad                 # current master or the failing commit
   git bisect good <known-good-sha-or-tag>
   # Bisect re-checks out a commit each round; test it, then:
   git bisect good   # or: git bisect bad
   # Repeat until git reports the first bad commit.
   git bisect reset
   ```

   Automate the "test it" step when possible so bisect runs unattended:

   ```bash
   git bisect run npm run test -- path/to/failing.test.ts
   ```

   For UI regressions, bisect against a specific Playwright spec
   (`npx playwright test e2e/failing.spec.ts`) rather than the full suite —
   faster per-round and avoids unrelated flakiness contaminating the bisect.

4. **Build a Minimal Reproducible Example (MRE).** Required before escalating
   to another maintainer or filing upstream. An MRE strips the report down
   to the smallest input/state that still reproduces: a single parcel
   address, a single scenario URL (`lib/scenario-url.ts` payload), or a
   focused Vitest/Playwright spec — not "the whole studio is broken." If you
   can't reduce it below "the entire app," that itself is information: the
   bug may be state-dependent (auth session, Firestore doc shape) rather
   than input-dependent.

### Flaky tests

- Re-run the specific spec 5–10x locally (`npx playwright test <spec> --repeat-each=10` or a `for` loop around `vitest run`) before concluding it's flaky rather than a real intermittent bug.
- Common causes in this stack: R3F/Three.js scene not finished mounting before assertions (add explicit waits, not fixed `sleep`s), Firebase Auth state not yet hydrated client-side, and Playwright timing on `motion-safe:` CSS transitions.
- Quarantine (skip with a comment linking the tracking issue) rather than delete — a flaky test still encodes intent.

### Environment-specific and dependency-regression failures

- Environment-specific: diff `node -v`, `npm ls <pkg>`, and OS/browser between the machine that reproduces and the one that doesn't before assuming code is at fault.
- Dependency regressions: check `npm ls <pkg>` for an unexpected transitive bump, then `git log -- package-lock.json` around the time the regression appeared — Dependabot PRs (`.github/dependabot.yml`) are the most common source. Revert the single dependency locally to confirm before filing.

## Repository health routine

**Weekly**

- Review open Dependabot PRs (`.github/dependabot.yml` runs monthly with a
  cooldown for npm in `/` and `functions/`, GitHub Actions, and Android Gradle
  in `native/android`, while security updates open immediately); merge grouped
  minor/patch PRs after CI passes, review major-version bumps manually.
- Confirm the latest `master` CI run (`.github/workflows/ci.yml`) is green;
  review newly opened issues and the issue-triggered `ai-maintainer.yml`
  intake comments, and investigate the first failure rather than re-running blind.
- Skim new issues against `.github/triage_checklist.md`; nothing should sit
  in `status: triage` for more than a week.

**Monthly**

- Run the stale branch audit per `.github/stale_branch_cleanup.md` (first
  Monday of the month).
- Run `npm audit` (root and `functions/`) and review anything not already
  tracked in `SECURITY.md`. Do not run `npm audit fix --force` (see
  `CLAUDE.md` gotchas — it can force a breaking Next.js downgrade).
- Enable/verify GitHub secret scanning and push protection on the repo
  settings; grep recent commits for accidentally committed `.env.local` /
  `functions/.env` content as a manual backstop.
- Spot-check doc freshness: `CLAUDE.md`, `AGENTS.md`, `README.md`,
  `docs/deployment.md` against actual `package.json` scripts and
  `firebase.json` — these drift after infra changes if not updated in the
  same PR.

## Release tagging & changelog

`CHANGELOG.md` (Keep a Changelog format) and `package.json`'s version field
already exist and are hand-maintained per release. What's missing is tag
automation — no `git tag` is currently cut to match a changelog/version
bump, and nothing generates changelog entries from commits. Recommended
approach, chosen to fit the existing Conventional Commits discipline already
required in `CONTRIBUTING.md`/`CLAUDE.md`:

- **Versioning:** Semantic Versioning (`MAJOR.MINOR.PATCH`), already
  reflected in `package.json`. Given continuous deployment to `yardup-2026`
  on every `master` push (see `CONTRIBUTING.md`), treat tags as release
  *markers* for rollback/changelog purposes, not as gates that block
  deploys.
- **Changelog:** keep hand-maintaining `CHANGELOG.md` under `[Unreleased]`
  as PRs land (already the practice), and cut a dated version heading at
  release time, until commit volume justifies automation.
- **Automation path when ready:** adopt
  [`release-please`](https://github.com/googleapis/release-please) as a
  GitHub Action. It reads Conventional Commit messages already required by
  this repo and opens a "release PR" that bumps `package.json`, updates
  `CHANGELOG.md`, and tags on merge — no manual version bookkeeping. This is
  **not** wired up yet; introducing it means adding a new workflow next to
  `ci.yml`/`ai-maintainer.yml`, which touches CI and should go through its
  own reviewed PR rather than being silently added.
- **Rollback:** because deploy is automatic on `master` push, the fastest
  rollback is `git revert` of the offending merge commit (not a force-push
  or history rewrite), which re-triggers CI and redeploys the prior state.

## Archiving / deprecating old work

- Merged feature branches: deleted per `.github/stale_branch_cleanup.md`.
- Abandoned/unmerged branches: tag-and-archive per the same doc
  (`archive/<branch-name>-backup`) before deletion — never delete unmerged
  work without a recovery point.
- If a whole surface is deprecated (e.g. a superseded plan under
  `docs/superpowers/plans/`), move it under a `docs/superpowers/plans/archive/`
  subfolder with a one-line header noting the date and replacement, rather
  than deleting — these are historical design records, not code.

## Source-available vs. open-source considerations

`torralba85/YardUp` is maintained by a small collaborator team and is
source-available under the LotFoundry Evaluation License. Public visibility
does not make it open source or open external contribution rights. The comparison
below records what would change if the owner later adopts an OSI-approved license
and accepts community work:

| Area | Source-available evaluation repo | If opened to OSS |
|---|---|---|
| Contribution agreement | None needed — both collaborators are known/trusted (`CODEOWNERS`) | Add a DCO bot (`Signed-off-by` on commits) or a CLA-assistant bot before accepting external PRs |
| Code of conduct | Not required for a 2-person team | Add `CODE_OF_CONDUCT.md` (e.g. Contributor Covenant) — required by most OSS communities and by GitHub's community profile check |
| Vulnerability disclosure | `SECURITY.md` + GitHub Security Advisories (already correct for OSS too) | Keep as-is; consider a disclosure timeline (e.g. 90 days) once there are external users to protect |
| Review requirements | Self-review checklist acceptable given team size (`CONTRIBUTING.md`) | Require review from a non-author for every external PR; CODEOWNERS becomes mandatory, not advisory |
| CI/CD secrets | GitHub Actions deploy secrets are limited to trusted `master` runs | Never expose deploy secrets to workflows triggered by fork pull requests; keep pull-request verification secret-free and protect deployment environments |
| Issue/PR volume | Handled ad hoc, weekly review is enough | Add `good-first-issue`/`help-wanted` grooming, a public roadmap, and possibly a bot (e.g. Dependabot + a stale-issue Action) to keep volume manageable |
| Governance docs | This file + `CONTRIBUTING.md` + evaluation license | Add a `GOVERNANCE.md` covering maintainer promotion, decision-making, and attribution expectations |

## Related tooling by context

| Need | Source-available evaluation repo | Public OSS repo |
|---|---|---|
| Dependency updates | Dependabot (already configured) | Dependabot or Renovate (Renovate scales better with many ecosystems/monorepos) |
| Required reviewers | `CODEOWNERS` (already configured) | `CODEOWNERS` + branch protection requiring review from a team, not just an individual |
| Secret scanning | GitHub secret scanning (enable in repo settings) | Same, plus push protection turned on by default for public repos |
| CI | GitHub Actions (`.github/workflows/ci.yml`) | Same, but gate secrets behind environment protection rules so fork PRs can't exfiltrate them |
| Contributor onboarding | `CONTRIBUTING.md` (already covers this) | Same, plus a CLA/DCO bot and a `good-first-issue` label queue |
