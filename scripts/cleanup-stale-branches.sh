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
# Kept deliberately: master, fix/mobile-production-20260910 (open PR #190),
# and backup/expo-main (the only copy of the pre-Next.js Expo history).

set -euo pipefail

REMOTE="${REMOTE:-origin}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

BRANCHES=(
  # Fully merged into master.
  chore/dependabot-config
  codex/release-hardening-2026-09-01
  codex/play-upload-key-2026-09-03
  # Superseded: the work landed elsewhere, or merging would regress master.
  copilot/fix-payments-scope-idempotency-keys
  fix/parcel-debug-pass-2
  fix/166-checkout-attempt-idempotency
  agent/stripe-checkout-sponsorship
  release/android-1.0.6
  claude/security-scan-public-repo-fbon3u
  codex/ci-maintenance-2026-08-31
  claude/project-visual-polish-mb7j3k
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
  tag="archive/${branch//\//-}-backup"
  echo "$branch -> $tag ($(git rev-parse --short "$REMOTE/$branch"))"
  run git tag -f "$tag" "$REMOTE/$branch"
  run git push -f "$REMOTE" "refs/tags/$tag"
done

echo
echo "== Stage 2: verify every tag is on the remote =="
missing=0
for branch in "${BRANCHES[@]}"; do
  git rev-parse --verify --quiet "$REMOTE/$branch" >/dev/null || continue
  tag="archive/${branch//\//-}-backup"
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
echo "  git push $REMOTE archive/<branch-with-dashes>-backup:refs/heads/<branch>"
