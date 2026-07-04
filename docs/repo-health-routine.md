# Repository Health Routine

Recurring maintenance for `torralba85/YardUp`, consolidated into one place
(`docs/AGENTS.md` links here). Owners: `@torralba85` / `@andrewtorralba-collab`
(see `CODEOWNERS`).

## Weekly

- [ ] Review open Dependabot PRs (`.github/dependabot.yml` runs weekly for
  npm root, `functions/`, and GitHub Actions). Merge grouped minor/patch PRs
  after CI passes; review major-version bumps manually for breaking changes.
- [ ] Check CI health on `master` (`.github/workflows/ci.yml`,
  `ai-maintainer.yml`) — any recurring flaky job or rising build time.
- [ ] Triage new issues to inbox-zero using `.github/triage_checklist.md`.

## Monthly (first Monday)

- [ ] **Stale branch audit** — run `.github/stale_branch_cleanup.md`.
- [ ] **Dependency audit** — `npm audit` (root and `functions/`) reviewed
  against `SECURITY.md`'s accepted-advisory list; update or remove entries
  that are no longer applicable. Never `npm audit fix --force`.
- [ ] **Secrets scanning** — confirm no secrets were committed:
  `git log -p --all -- .env.local functions/.env` should return nothing;
  spot-check recent commits for accidentally-pasted API keys/tokens. GitHub's
  built-in secret scanning + push protection should stay enabled on the repo.
- [ ] **Documentation freshness** — confirm `CLAUDE.md` and `AGENTS.md` are
  still mirrored, `docs/AGENTS.md` reflects current architecture/status, and
  environment variable lists match `.env.local`/`functions/.env` usage.
- [ ] **CODEOWNERS review** — confirm deploy-sensitive paths
  (`firebase.json`, `firestore.rules`, `.github/workflows/`,
  `scripts/prepare-firebase.js`) still route to the correct owner.

## Release tagging & changelog

- Semantic Versioning (`MAJOR.MINOR.PATCH`); `CHANGELOG.md` follows
  [Keep a Changelog](https://keepachangelog.com/), grouped under
  `### Added` / `### Changed` / `### Fixed` per version.
- Because CI deploys to production on every push to `master` (continuous
  deployment, no release branches), a version tag marks a checkpoint rather
  than gating a deploy: move `## [Unreleased]` entries into a new
  `## [x.y.z] - YYYY-MM-DD` heading, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
- Not currently automated. If changelog upkeep becomes a bottleneck, consider
  `release-please` or a Conventional-Commits-based generator — commit
  messages already follow Conventional Commits (`CONTRIBUTING.md`), so the
  history is compatible with either without changing commit style first.

## Archiving / deprecation

Single active product repo today — no forks or superseded projects to
archive. If a future prototype or spike branch is superseded:

1. Tag it (`git tag archive/<name> <sha> && git push origin archive/<name>`)
   per `.github/stale_branch_cleanup.md`'s archival safeguard.
2. Delete the branch/repo only after the tag is pushed and confirmed.
3. Note the deprecation and pointer to the replacement in the relevant
   `docs/superpowers/plans/*` or `docs/AGENTS.md` entry, so future readers
   aren't misled by a stale plan.
