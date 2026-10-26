# Secret scanning

The CI `scope` job runs Gitleaks 8.30.1 on every pull request, master push, and
manual CI run, including documentation-only changes. A finding fails `scope`,
which also fails the existing `verify` job and blocks deployment.
The scanner covers all fetched Git refs and their history; it does not scan
ignored local environment files, GitHub discussions, or unreachable Git objects.

GitHub's hosted secret scanning is currently unavailable for this private,
personally owned repository. This CI check provides detection after a push; it
does not claim to provide GitHub's server-side push protection. See
[GitHub's eligibility requirements](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning).

The repository's current plan also rejects private branch-protection/ruleset
requests with HTTP 403 and an upgrade requirement. CI therefore does not enforce
a merge block. If an eligible plan is enabled later, require the `verify` status
check for master and prevent bypasses through branch protection or a ruleset.

## Run locally before committing

Install the pinned Gitleaks release from
[the official releases](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1),
verify its published checksum, then run from the repository root:

```sh
gitleaks git . --pre-commit --staged --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore --ignore-gitleaks-allow --redact=100
```

To repeat the CI history scan:

```sh
gitleaks git . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore --log-opts="--all --full-history" --ignore-gitleaks-allow --redact=100
```

Exit 0 means the scan completed without unreviewed findings. Exit 1 means a
finding or scanner failure needs investigation; read the error before calling
it a leak. Use `--verbose` with `--redact=100` for file and line information.
Never upload an unredacted report or test a discovered key against a billable
API merely to see whether it works.

## Reviewed historical findings

`.gitleaksignore` records exact commit/file/rule/line fingerprints, with reasons.
It contains no credential values. It excludes neither entire directories nor
provider rules. A new secret in the same file or a copy in a new commit still
fails the history scan. Inline `gitleaks:allow` comments are ignored by CI.

The 2026-10-26 review found public client identifiers and synthetic fixtures:

- Firebase web configuration: the current browser key was matched in Google
  Cloud and has an explicit 25-API Firebase allowlist, without Maps or Gemini
  Developer API access. Firebase keys are public project identifiers, while
  authorization depends on Security Rules, IAM and App Check. See
  [Firebase's key guidance](https://firebase.google.com/docs/projects/api-keys).
- A Maps/Places browser key in an old, removed Playwright log: matched to
  `New next_public_google_places_key` in `yardup-2026`; its four website
  restrictions were verified, and its API list was reduced from 33 to Maps
  JavaScript API, Places API and Places API (New). No key value was changed.
- Legacy `adu-advisor` Firebase client configuration: intentionally public
  configuration in historical mobile commits. The current Google account
  cannot access that project, so its live restrictions remain an owner follow-up.
  This historical exception does not establish that the legacy key is revoked.
- Cloudflare's public analytics beacon identifier, the published IndexNow
  verification key, synthetic Cesium/certificate test fixtures, and a
  local-storage key name.

Do not generate new ignore entries automatically. Review each finding's exact
context and provider restrictions, document the reason, and keep the fingerprint
specific to the reviewed commit. For a real credential, revoke/rotate it and
update consumers before considering history cleanup or an exception.

## CI supply chain

The workflow downloads the official Linux binary at an exact version and checks
its SHA-256 before execution. No scanner service receives the repository, and
the scan step receives no application/provider secrets. Checkout uses a read-only
token with `persist-credentials: false`. When updating Gitleaks, update the
release URL and digest together and repeat both a passing history scan and a
synthetic-secret rejection check.
