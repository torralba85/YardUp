# CI scope and efficiency

CI always creates a `verify` result. The `scope` job runs repository hygiene and
the dependency-free CI safeguard suite before choosing heavy jobs. `quality`
runs lint, units, and Firestore rules alongside `browser`, which runs typecheck,
build, and both Playwright projects. Desktop and mobile run as separate matrix
jobs with unique report artifacts; neither is canceled if the other fails.
Deploy waits for the aggregate `verify`, including both browser projects.

## Changed-file rules

- PR scope compares the merge base with the complete PR head. A documentation
  commit on a code PR never skips that PR's code validation.
- Master scope compares the entire push, plus production inputs since the
  recorded release. Outstanding runtime changes require full validation even
  when the latest push only changes docs.
- Only Markdown under `docs/` and the explicit root documentation filenames in
  `scripts/ci/scope.mjs` qualify as documentation-only. Hygiene still runs,
  including secret-pattern and LFS-pointer checks.
- Locks, migrations, rules, shared code, unknown files, mixed changes, missing
  history, and detection errors receive full validation. Renames include both
  old and new paths. Git history avoids API changed-file truncation limits.
- Tests need full validation but do not by themselves change production inputs.
  Workflow changes always receive full validation. A `ci.yml` edit can avoid a
  deployment only when its workflow header and complete `deploy` job are byte
  identical after newline normalization; an unrecognized layout deploys.

## Production baseline and recovery

The deploy job creates a GitHub deployment record in `firebase-production`
immediately before any Firebase deployment. It marks the record successful only
after the complete existing release sequence succeeds. Only that job receives
`deployments: write`; scope uses read permission, and PRs do not query records.

The latest attempt is authoritative. Missing records, an unfamiliar record,
API failure, and pending/failed/canceled attempts require full validation and
deployment. The next docs-only push cannot silently leave a partial release
unrepaired. The initial master run after this change establishes the baseline
with a full release. A failed status write also leaves a conservative baseline.

Secret rotations and manual Firebase releases are not observable in a Git diff.
After either, use a forced master release to apply the current environment and
restore a consistent recorded baseline:

```bash
gh workflow run ci.yml --ref master -f force_deploy=true
```

Default master dispatch runs full verification and compares deployment inputs.
`force_deploy=true` always runs full verification and requests a master deploy.
Manual dispatch on any other branch can never deploy. Master workflows and
production releases remain serialized and are not canceled by newer pushes.

## Local and live validation

```bash
node --test scripts/ci/scope.checks.mjs
actionlint .github/workflows/ci.yml
```

The safeguard suite covers full PR diffs, mixed/unknown paths, >300 changed
files, renames, failed-release recovery, forced redeploys, aggregate failures,
workflow deployment boundaries, and recording release outcomes.

For a non-protected branch already containing this workflow, push an incremental
docs-only commit, then dispatch with the earlier full SHA:

```bash
gh workflow run ci.yml --ref YOUR_BRANCH -f validation_base=FULL_BASE_SHA
```

`validation_base` is honored only for a non-master manual dispatch. It cannot
alter PR or production scope. Verify in GitHub that `scope` and `verify` pass,
`quality`/`browser` skip, and `deploy` skips. Repeat with a mixed/runtime change
to require the heavy jobs. Two quick PR updates should cancel the stale run and
leave the newest complete PR fully checked. A new branch's first push alone is
not evidence of correct path gating.

For each experiment, record the full head SHA, event, scope decision, individual
job conclusions, and run URL. A canceled older run is not evidence that the
newest commit passed its required checks.

The diagnostic dispatch checks the selected incremental diff, not the PR's
complete change set. Its green result never substitutes for the latest PR
`verify` result, which must still validate any earlier code/configuration edits.

Record elapsed workflow time separately from the sum of job durations. Parallel
jobs shorten feedback time but add checkout/install overhead. Keep the full
desktop/mobile test counts and measure any proposed browser sharding separately.

The desktop/mobile split retains all 280 cases (140 per project before runtime
skips). The previous serial browser job exhausted its 30-minute budget on
2026-10-21. Five longer Studio scenarios retain their assertions and use a
60-second total scenario budget to accommodate software-rendered 3D interaction;
individual expectations retain their existing deadlines.
