# Incident: branches pushed during the judging freeze, then reverted

**Date:** 2026-08-03 (PDT) / 2026-08-04 (UTC)
**Repo:** `torralba85/YardUp` (private)
**Status:** reverted the same day; one residual artifact cannot be reverted (see below)
**Recorded by:** Claude (Opus 5), at the request of Andrew Torralba, for transparency

## Summary

While restoring this project after the 2026-07-31 data loss, two branches were pushed to this
repository **during the Devpost judging freeze**. They were deleted the same day and the remote
ref list was restored to exactly its prior state. **No submission material was altered at any
point:** `master` never moved, no tag changed, and nothing was merged.

The freeze rule being violated is this repository's own, at
`docs/superpowers/specs/2026-07-28-mobile-native-feel-design.md`:

> **GitHub freeze until 2026-08-03** (Devpost judging). All work stays local — commits are fine,
> pushes and GitHub writes are not.

The cause was a process failure, not a judgement call: the repository was inspected via the GitHub
API and via git state, but was never searched for its own written constraints before writing to it.
The rule was in the repo the whole time.

## Timeline

| When (UTC) | What |
|---|---|
| 2026-08-03 ~18:00 | Workspace audit finds LotFoundry absent from the reorganized `~/Projects` tree and its `Downloads\Repos\yardup` path to be an empty husk |
| 2026-08-04 ~03:2x | Recovered worktree restored from the recovery drive to `Projects\GitHub\torralba85\YardUp`; verified 589/589 files, `git fsck` clean, HEAD `01de672` |
| 2026-08-04 ~03:31 | **Pushed** `recovered-latest` → `refs/heads/recovered/2026-07-29` (`01de672`) and `release/mobile-store` (`cd9c621`) |
| 2026-08-04 ~03:5x | Freeze rule discovered in this repo's own docs |
| 2026-08-04 ~04:0x | **Both branches deleted**; remote ref list verified byte-identical to pre-push |

## What was affected

- Two branch refs existed on the remote for roughly 30 minutes.
- `pushed_at` on the repository metadata advanced to `2026-08-04T03:31:23Z`.

## What was NOT affected

- `master` remained `0ca61ffc10fe03f9d98040124445221200716d6e` throughout — verified before the
  push, after the push, and after the deletion. Zero commits were added to it.
- Tag `v1.0.1` (`a5a3724`) unchanged.
- Nothing was merged, no pull request was opened, no setting was changed.
- Repository visibility remained **private** throughout.
- The pushed content was **post-submission work** (commits dated 2026-07-24 to 2026-07-29). The
  submission deadline was 2026-07-21, so none of it was ever part of the judged artifact.

## Residual artifact that cannot be reverted

The repository's `pushed_at` timestamp now reads `2026-08-04T03:31:23Z`. Deleting the branches
does not restore the prior value, and GitHub exposes no way to reset it. Anyone inspecting
repository metadata can see that a push occurred on that date, even though the ref list and all
submission material are unchanged. This document exists so that fact has an honest explanation
rather than an unexplained gap.

## Restore after judging concludes

Judging ends **2026-08-05** per `docs/devpost-submission.md` ("the judging period ending
August 5, 2026"). Note that the spec quoted above dates the freeze to 2026-08-03 — **the later
date governs.** Once winners are announced:

```bash
cd ~/Projects/LotFoundry
git push origin recovered-latest:refs/heads/recovered/2026-07-29
git push origin release/mobile-store:refs/heads/release/mobile-store
git push origin docs/freeze-incident-2026-08-03   # this record
```

Both refs are held locally at `~/Projects/GitHub/torralba85/YardUp` and on the recovery drive
(`D:\VERISHARE_YARDUP_RECOVERY_2026-08-02\reconstructed\`), so nothing was lost by the deletion.

Then reconcile the divergence deliberately — `recovered-latest` holds 19 commits `master` lacks
(Play Billing/Bubblewrap, target API 36, TWA native-feel, journey history, haptics), while
`master` holds 2 doc-only commits from 2026-07-23. Merge base is `5e917e4` (2026-07-21).
**Do not force-push either direction.**
