# Security

## Reporting

Report suspected vulnerabilities privately via GitHub Security Advisories on
this repository.

## Secret scanning

CI scans Git history with Gitleaks and fails the verification job on
new findings. See [Secret scanning](docs/secret-scanning.md) for local pre-commit
commands, reviewed historical exceptions, and credential-remediation steps.

## Known advisories (resolved / tracked)

### September 12, 2026 dependency refresh

- Updated both lockfiles to `sharp@0.35.4` for GHSA-rgj7-g3m4-5g8c.
- Updated root `js-yaml` to 4.3.2 for GHSA-2883-xcg3-v3hh.
- Updated `qs` to 6.16.0 for GHSA-x5fp-wj9c-mxmx and
  GHSA-4mjr-xmp4-gh2g. Functions overrides `qs` because Express 4.22.2's
  `~6.15.1` range excludes the fixed minor release.
- Validate both dependency trees with `npm audit` and `npm audit --prefix functions`.

### Resolved: GHSA-qx2v-qp2m-jg93 - PostCSS XSS via unescaped `</style>` (moderate)

- **Status:** Resolved. The repository's PostCSS override is `^8.5.10`, so
  this advisory is no longer accepted as current audit debt.
- **Record:** Retained for audit history. Continue reviewing audit output after
  dependency updates; do not use `npm audit fix --force` as a substitute for a
  reviewed dependency change.

### Resolved: GHSA-mp7j-qc5w-4988 and GHSA-xv26-6w52-cph6 - `websocket-driver`

- **Status:** Resolved. The root and Functions package manifests override the
  transitive dependency to `websocket-driver@^0.7.5`, which contains the fixes
  for the resource-limit bypass and protocol-length-header advisories affecting
  earlier versions.
- **Verification:** The mobile store release fix in PR #145 updated both
  dependency trees and reported clean production audits. Keep reviewing root
  and Functions audit output after dependency updates.
- **Record:** Retained for audit history. Do not remove or weaken the override
  without confirming the resolved lockfile version and rerunning the release
  gates.
