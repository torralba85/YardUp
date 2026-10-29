# Repository Health Routine

A recurring maintenance schedule for `torralba85/YardUp`, on top of the
per-PR release gate in `docs/release-checklist.md`. This is a small-team,
source-available evaluation repo deploying continuously to production — the
routine below is sized for that, not for a large open-source project.

## Weekly

- **Dependabot PRs** (`.github/dependabot.yml` — npm root, `functions/`, and
  GitHub Actions, grouped minor/patch, weekly): review and merge grouped
  minor/patch PRs after CI passes. Do not batch-merge major-version bumps —
  review each individually against `CLAUDE.md` → Critical Gotchas (e.g. the
  PostCSS/Next.js advisory tracked in `SECURITY.md`).
- **CI pipeline health:** check the last 5-10 runs of `.github/workflows/ci.yml`
  and `ai-maintainer.yml` on the Actions tab for creeping duration, flaky
  reruns, or warnings that pass but shouldn't (e.g. deprecation notices from
  `actions/*` or `firebase-tools`). A green run that took 3x longer than
  usual is worth a look before it becomes a timeout.
- **`npm audit`** (informational — CI does not gate on it): run locally,
  compare against `SECURITY.md`'s tracked-advisories list, and update that
  file if a new advisory appears or a tracked one gets an upstream fix. Do
  not run `npm audit fix --force`.

## Monthly

- **Stale branch audit** — first Monday of the month, per
  `.github/stale_branch_cleanup.md` (merged branches deleted; unmerged
  branches inactive 45+ days get a warning, then deletion after 5 business
  days, with an `archive/<branch>-backup` tag as a safeguard).
- **Documentation freshness:** diff `CLAUDE.md`, `AGENTS.md`, and
  `docs/AGENTS.md` against what's actually true — env vars, commands, repo
  map entries, "current status" sections. These three files are the primary
  context an agent or new collaborator loads first; stale entries there
  compound. `CLAUDE.md` and `AGENTS.md` must stay in sync with each other
  per their own header note.
- **CHANGELOG freshness:** confirm `[Unreleased]` in `CHANGELOG.md` reflects
  everything merged since the last tagged version. This repo maintains
  `CHANGELOG.md` by hand (Keep a Changelog + SemVer) rather than via
  `release-please`/conventional-commit automation — if that manual upkeep
  starts slipping, consider adopting `release-please` since PR titles
  already follow Conventional Commits.
- **Secrets scanning:** run `npm run repo:public-check`, verify GitHub secret
  scanning/push-protection availability for the repository's current ownership
  and visibility, and repeat the redacted Gitleaks history scan in
  [Secret scanning](secret-scanning.md). CI runs the same pinned scanner in the
  always-running `scope` job. Review exact historical exceptions periodically;
  do not automatically baseline new findings or print raw credential matches.
- **CODEOWNERS accuracy:** confirm `/CODEOWNERS` still lists the correct
  owners for deploy-sensitive paths (`firebase.json`, `firestore.rules`,
  `firestore.indexes.json`, `.github/workflows/`,
  `scripts/prepare-firebase.js`) as the team changes.

## Quarterly / as-needed

- **Archiving unmaintained work:** if a long-lived branch, `docs/plans/*` or
  `docs/superpowers/plans/*` entry, or experimental script in `scripts/`
  hasn't been touched in a quarter and isn't on the near-term roadmap
  (`docs/AGENTS.md` → current status/next priorities), either fold it into
  the roadmap explicitly or move it under an `archive/` note referencing the
  backup tag so it's not silently mistaken for active work.
- **Firebase project hygiene:** review `yardup-2026` for unused Cloud
  Functions, stale Hosting channels/previews, and Firestore indexes no
  longer referenced by `firestore.indexes.json` (drift here doesn't show up
  in `git` history, so it needs a manual console check).
- **Release tagging:** tag a version (`git tag vX.Y.Z`) when `CHANGELOG.md`'s
  `[Unreleased]` section represents a meaningful shipped milestone, following
  SemVer (breaking → major, feature → minor, fix-only → patch). Given
  continuous deployment to `master`, tags here are a changelog/rollback
  reference point, not a deploy trigger.

## Ownership

Per `CODEOWNERS`, deploy-sensitive paths require `@torralba85` review. The
monthly items above (stale branches, CODEOWNERS accuracy, secrets spot
check) should be run by whichever owner has push access that month; note
completion in a PR or issue comment so it's auditable, since this repo does
not currently have a dedicated maintenance-tracking issue template.
