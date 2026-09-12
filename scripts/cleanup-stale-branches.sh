#!/usr/bin/env bash
#
# Archive and delete the stale branches classified in
# docs/branch-audit-2026-09-10.md, following Step 4 of
# .github/stale_branch_cleanup.md: tag first, verify the tag reached the
# remote, only then delete.
#
# Run from a checkout with push rights to the repository.
#
#   scripts/cleanup-stale-branches.sh --dry-run   # show what would happen
#   scripts/cleanup-stale-branches.sh             # tag, verify, delete
#
# Nine of the original twelve targets were archived and deleted on 2026-09-11;
# see docs/branch-audit-2026-09-10.md. Only the three below remain, each the
# upstream source of work the stale-branch-cleanup pull request salvages.
#
# Kept deliberately: master, backup/expo-main (the only copy of the pre-Next.js
# Expo history), and wip/local-backup-2026-09-09 (the only copy of the deferred
# Kickstarter Remotion composition).

set -euo pipefail

REMOTE="${REMOTE:-origin}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# Tag namespace established by the 2026-09-11 cleanup run:
#   archive/<date>/remote/<branch> for remote branches.
# Override to re-date a later run.
ARCHIVE_DATE="${ARCHIVE_DATE:-$(date -u +%Y-%m-%d)}"

BRANCHES=(
  # Held back on 2026-09-11 because each is the upstream source of work this
  # branch salvages. Delete only after that pull request merges.
  fix/166-checkout-attempt-idempotency
  agent/stripe-checkout-sponsorship
  codex/ci-maintenance-2026-08-31
)

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  would run: $*"
  else
    "$@"
  fi
}

git fetch "$REMOTE" --prune

echo "== Stage 1: archive tags =="
for branch in "${BRANCHES[@]}"; do
  if ! git rev-parse --verify --quiet "$REMOTE/$branch" >/dev/null; then
    echo "  skip $branch (not on $REMOTE)"
    continue
  fi
  tag="archive/${ARCHIVE_DATE}/remote/${branch}"
  echo "$branch -> $tag ($(git rev-parse --short "$REMOTE/$branch"))"
  run git tag -f "$tag" "$REMOTE/$branch"
  run git push -f "$REMOTE" "refs/tags/$tag"
done

echo
echo "== Stage 2: verify every tag is on the remote =="
missing=0
for branch in "${BRANCHES[@]}"; do
  git rev-parse --verify --quiet "$REMOTE/$branch" >/dev/null || continue
  tag="archive/${ARCHIVE_DATE}/remote/${branch}"
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "  would verify $tag"
  elif git ls-remote --exit-code --tags "$REMOTE" "refs/tags/$tag" >/dev/null 2>&1; then
    echo "  ok $tag"
  else
    echo "  MISSING $tag"
    missing=1
  fi
done

if [ "$missing" -eq 1 ]; then
  echo
  echo "Refusing to delete: at least one archive tag is not on the remote." >&2
  exit 1
fi

echo
echo "== Stage 3: delete the remote branches =="
for branch in "${BRANCHES[@]}"; do
  git rev-parse --verify --quiet "$REMOTE/$branch" >/dev/null || continue
  echo "deleting $branch"
  run git push "$REMOTE" --delete "$branch"
done

echo
echo "Done. Restore any branch with:"
echo "  git push $REMOTE archive/$ARCHIVE_DATE/remote/<branch>:refs/heads/<branch>"
