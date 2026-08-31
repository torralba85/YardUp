# GitHub Actions Startup-Failure Investigation

**Date:** 2026-08-31
**Repo:** `torralba85/YardUp`
**Affected workflow ID:** `343134271`

## Current evidence

PR #167 currently targets `master`. Its head commit `b28e5761e5e595adab1f7aba313eb5a912f7b98d` produces an Actions run with these properties:

- run ID: `33442450718`
- workflow ID: `343134271`
- workflow name: empty
- conclusion: `startup_failure`
- jobs: none

A separate control PR (#168), created from `master` with only Dependabot configuration and documentation changes, independently produced the same failure on head commit `83fbed1c83a5d751e2c75a5cff7cd7ed48fa5140`:

- run ID: `33442663669`
- workflow ID: `343134271`
- workflow name: empty
- conclusion: `startup_failure`

The same workflow ID also appeared on the prior PR #167 head as another zero-job `startup_failure`. This reproduces across independent branches and changesets rather than tracking the analytics code or a single malformed commit.

The checked-in workflow inventory on `master` contains only:

- `.github/workflows/ci.yml` — `push`/`pull_request` for `master`
- `.github/workflows/labels.yml` — path-filtered `push` on `master` plus `workflow_dispatch`
- `.github/workflows/ai-maintainer.yml` — `issues: opened`

None of those files has workflow ID `343134271`, and no current repository code or commit message matches `BuildFailed`.

## Diagnosis

This repository is owned by a personal GitHub account, not an organization, so an organization-level required workflow is not a plausible source.

The empty workflow name, synthetic workflow ID, `startup_failure` conclusion, and zero-job run match a GitHub Actions backend failure pattern reported in 2026 where a deleted/orphaned workflow registration appears as `BuildFailed` and intercepts normal event dispatch. Similar reports:

- <https://github.com/orgs/community/discussions/190193>
- <https://github.com/orgs/community/discussions/206103>

This points to an Actions registry/service-side defect rather than a failure inside `ci.yml`. A malformed job step would still create a workflow/job record; these runs fail before any job exists.

## Impact

PR #167 cannot be driven to green while normal CI dispatch is being replaced by the zero-job startup failure. The PR should remain draft until a real `CI` run executes and passes.

This is separate from the private-repository Actions-minutes exhaustion documented in `docs/release-handoff-2026-08-26.md`. Making the repo public removes the metered-minutes blocker, but the orphaned workflow registration may still require GitHub to clear or reindex the Actions state.

## Recommended owner action

1. Make the repository public as already planned, which removes the private-repo minutes gate.
2. Trigger a fresh PR/push event and confirm whether workflow ID `343134271` disappears and the real `CI` workflow queues.
3. If the same empty-name `startup_failure` persists, open GitHub Support with repo `torralba85/YardUp`, workflow ID `343134271`, and run IDs `33442450718` / `33442663669`, asking for the orphaned/deleted Actions workflow registration to be purged or the repository Actions registry to be repaired.
4. Do not rewrite working workflow YAML or add dummy workflows unless Support specifically requests it; current evidence does not point to repository workflow syntax as the source.
