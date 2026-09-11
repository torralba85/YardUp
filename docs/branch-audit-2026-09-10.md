# Branch Audit — 2026-09-10

**Scope:** every branch on `origin` for `torralba85/YardUp`, classified against `master`
at `0796f1f` (`fix(parcel): close GIS correctness gaps without dropping coverage`, #193).

Revised 2026-09-11: `fix/mobile-production-20260910` moved from Keep to Fully merged
when PR #190 landed, taking the delete list from eleven branches to twelve.

Ahead/behind counts are `git rev-list --left-right --count origin/master...<branch>`.
Because the repository squash-merges, a non-zero "ahead" count does not mean the
work is unlanded — every branch below was additionally checked by content.

## Keep

| Branch | State | Reason |
|---|---|---|
| `master` | default | — |
| `backup/expo-main` | ahead 28, behind 128 | Deliberate archive of the pre-Next.js Expo application. Its history exists nowhere else; deleting it destroys the only copy. |

## Fully merged — safe to delete

| Branch | State | Reason |
|---|---|---|
| `chore/dependabot-config` | ahead 0 | Zero commits `master` does not have. |
| `codex/release-hardening-2026-09-01` | ahead 0 | Zero commits `master` does not have. |
| `codex/play-upload-key-2026-09-03` | ahead 1 | Per-platform native-store flags landed. `ENABLE_APPLE_STORE_VERIFICATION` and `ENABLE_GOOGLE_PLAY_VERIFICATION` are both read in `functions/index.js`. |
| `fix/mobile-production-20260910` | merged | PR #190 merged as `1262f16` on 2026-09-11, after this audit was first written. Held out of the original delete list only because that PR was open. |

## Superseded — safe to delete

| Branch | State | Reason |
|---|---|---|
| `copilot/fix-payments-scope-idempotency-keys` | ahead 1 | PR #170, closed. Single commit "Initial plan" changes zero files. |
| `fix/parcel-debug-pass-2` | ahead 3, behind 1 | PR #192, closed in favour of #193. The branch removes 662 lines of `county-parcels` coverage; #193 landed the same correctness fixes while keeping that coverage. Re-merging would regress it. |
| `fix/166-checkout-attempt-idempotency` | ahead 11 | PR #169, closed. Attempt-scoped Stripe idempotency landed through #172; `checkoutAttemptId` is enforced in `app/api/stripe/checkout/route.ts`. One unlanded module remains — see Deferred. |
| `agent/stripe-checkout-sponsorship` | ahead 13, behind 107 | PR #160, closed. Payments hardening landed through #162: `lib/server/stripe-idempotency.ts`, `lib/credit-packs.ts` and the credits checkout route are all on `master`. Only `.github/FUNDING.yml` was unlanded; it is salvaged here. |
| `release/android-1.0.6` | ahead 1, behind 58 | PR #171 merged. The extra commit pins `twa-manifest.json` to versionName 1.0.6 / code 7; `master` is at 1.0.9 / code 10. Merging it is a release rollback. |
| `claude/security-scan-public-repo-fbon3u` | ahead 1, behind 107 | PR #161, closed. A lockfile-only audit fix from 2026-08-05, 107 commits stale. Both lockfiles have moved since; re-run `npm audit` instead of merging. |
| `codex/ci-maintenance-2026-08-31` | ahead 4, behind 85 | PR #168, closed. Both investigation documents are salvaged here. The Dependabot limit change is deliberately not taken — see Deferred. |
| `claude/project-visual-polish-mb7j3k` | ahead 7, behind 126 | No PR. Built entirely on the retired Blue Hour / Golden Hour system: it edits `components/landing/nocturne/*` (deleted), adds `remotion/nocturne/*`, and tunes `rounded-full` / `lf-clay-ink` tokens. `CLAUDE.md` forbids applying archived design to new work. |
| `wip/local-backup-2026-09-09` | ahead 10, behind 13 | No PR. A local safety copy taken before the parcel work was split into #188 / #191 / #193. Its parcel lineage predates that hardening, so re-merging `lib/server/parcel-resolver.ts` would undo it. The genuinely unlanded pieces are salvaged or deferred below. |

## Salvaged into this branch

- **Google Play purchase-verification tests** — `lib/server/store-receipt-verifiers.test.ts`,
  from `wip/local-backup-2026-09-09`. `verifyGooglePlayPurchase` had no coverage on
  `master` despite gating paid entitlements. Adds seven cases: demo tokens, malformed
  service-account JSON, incomplete service accounts, OAuth failure, a valid purchased
  token, a non-purchased state, and Android Publisher error responses. Also guards the
  Apple pinned-chain suite behind an `openssl` availability check so it runs on Windows
  developer machines; CI runners have `openssl`, so nothing is skipped there.
- **`docs/gcp-api-key-audit-2026-08-31.md`** — the Cloud Console credential audit taken
  before the repository was made public. Records restriction posture and follow-ups.
- **`docs/github-actions-startup-failure-2026-08-31.md`** — the phantom-workflow
  investigation, including the control reproduction on an unrelated branch.
- **`.github/FUNDING.yml`** — the repository Sponsor button.
- **`TODOS.md`** — two P2 backlog entries: public per-jurisdiction ADU pages, and the
  Kickstarter campaign rewording.

## Picked up from the deferred list

- **Resumable Stripe Checkout sessions.** `lib/server/active-checkout-sessions.ts` and its
  tests are ported from `fix/166-checkout-attempt-idempotency` and wired into both the
  lead-unlock and certificate checkout routes. One reservation per entitlement, resumed
  while Stripe reports the Session open, replaced only once Stripe confirms it expired.
  Account deletion clears reservations before the Auth identity goes away, and
  `firestore.rules` denies all client access to the new `activeCheckoutSessions`
  collection. **This needs a rules deploy** (`npm run deploy:rules`, or a full deploy).

  This changes a documented behaviour. Previously each `checkoutAttemptId` produced its own
  Stripe idempotency key, so a fresh attempt minted a second payable Session. The
  reservation now decides, so a second tab resumes the first tab's Session instead. The
  route tests were rewritten to assert the new contract.

- **Regrid rate-limit degradation.** `app/api/parcel/route.ts` returned HTTP 503 with
  `Retry-After: 10` on a Regrid 429 — the only Regrid failure mode that did not fall
  through the provider chain. It now degrades to the public county/statewide GIS tier and
  the preset fallback, like every other failure. Recorded in
  `docs/adr/0001-parcel-resolution-rate-limit-degradation.md`, which now matches the code.

## Still deferred

- **Kickstarter Remotion composition** (`remotion/kickstarter/*`, from
  `wip/local-backup-2026-09-09`). About 1,350 lines, a poster asset, three npm render
  scripts, and a `qs` override. Self-contained but a feature addition.
- **Dependabot pull-request limits** (from `codex/ci-maintenance-2026-08-31`). Proposes
  5/5/3 to 3/2/1. `master` re-established 5/5/3 later via #177, so this reads as
  deliberately superseded rather than unlanded.

## Executing the deletions

This session could not create the archive tags Step 4 of
`.github/stale_branch_cleanup.md` calls for: pushing to `refs/tags/*` is refused with
HTTP 403 while branch pushes to the session's own branch succeed, so the credential is
scoped to that branch. No branch was deleted, because the archive snapshot is the
safeguard that makes deletion reversible.

`scripts/cleanup-stale-branches.sh` performs both halves from a checkout with full push
rights. It tags every branch first, verifies each tag landed on the remote, and only then
deletes. Run it with `--dry-run` first.
