# Contributing to YardUp / LotFoundry

This is a small, closed-collaborator repo (`torralba85/YardUp`), not a public
OSS project. These are the working conventions for anyone with push access.

## Branch strategy: GitHub Flow

We use **GitHub Flow**, not Git Flow or trunk-based development:

- `master` is always deployable. CI (`.github/workflows/ci.yml`) deploys
  Hosting + Functions + Firestore rules to `yardup-2026` on every push to
  `master`.
- All work happens on a short-lived branch off `master`, opened as a PR, and
  merged back into `master`. There is no long-lived `develop` branch and no
  release branches — release cadence is continuous deployment, so Git Flow's
  release/hotfix branches add ceremony without benefit here. Trunk-based
  development (committing straight to `master`) isn't used either, because
  every change should pass CI and get at least a self-review via PR before it
  reaches production.

### Branch naming

```text
feat/<short-description>       new functionality
fix/<short-description>        bug fix
chore/<short-description>      tooling, deps, config, non-behavioral cleanup
style/<short-description>      visual/CSS-only changes
docs/<short-description>       documentation only
hotfix/<short-description>     urgent production fix, still goes through PR + CI
```

Use Conventional Commits for commit messages and PR titles (see `CLAUDE.md`):
`fix(landing): ...`, `feat(parcel): ...`, `style(studio): ...`, `chore(ci): ...`.

### Merge policy

- **Squash merge** into `master` for feature/fix/chore branches — keeps
  `master` history one commit per logical change and matches the Conventional
  Commits convention used for changelogs.
- **Rebase** your branch on `master` before merging if it has drifted, rather
  than merging `master` into your branch, to keep history linear.
- Do not use merge commits for routine PRs.

### Branch protection on `master`

- Require the CI `verify` job (lint, test, `tsc --noEmit`, build, Playwright)
  to pass before merge.
- Require at least one review (or self-review checklist completion for
  solo-authored changes, given the two-owner team size) before merge.
- No direct pushes to `master` without a PR; no force-push to `master`.
- `CODEOWNERS` requires the admin owner's review on deploy-sensitive paths
  (`firebase.json`, `firestore.rules`, `firestore.indexes.json`,
  `.github/workflows/`, `scripts/prepare-firebase.js`) — see `/CODEOWNERS`.

## Before opening a PR

Run the core release gate locally for anything beyond a trivial change:

```bash
npm run lint && npm run test && npx tsc --noEmit && npm run build
```

Then fill out `.github/pull_request_template.md`, which is applied
automatically.

## Issues

New issues are triaged using `.github/triage_checklist.md`. Use
`.github/ISSUE_TEMPLATE/bug_report.md` for bugs and
`.github/ISSUE_TEMPLATE/feature_request.md` for feature/enhancement requests.

## Stale branches

Branches are audited monthly per `.github/stale_branch_cleanup.md`.

## Debugging & repo maintenance

For reproducing and diagnosing bugs (log collection, environment isolation,
`git bisect`, minimal reproducible examples, flaky tests), see
`docs/debugging-guide.md`. For the recurring weekly/monthly maintenance
routine (dependency review, CI health, doc freshness, stale branches,
release tagging), see `docs/repo-health-routine.md`.

## Security

Do not open public issues for suspected vulnerabilities — see `SECURITY.md`
for private reporting via GitHub Security Advisories.
