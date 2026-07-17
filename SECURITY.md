# Security

## Reporting

Report suspected vulnerabilities privately via GitHub Security Advisories on
this repository.

## Known advisories (resolved / tracked)

### Resolved: GHSA-qx2v-qp2m-jg93 - PostCSS XSS via unescaped `</style>` (moderate)

- **Status:** Resolved. The repository's PostCSS override is `^8.5.10`, so
  this advisory is no longer accepted as current audit debt.
- **Record:** Retained for audit history. Continue reviewing audit output after
  dependency updates; do not use `npm audit fix --force` as a substitute for a
  reviewed dependency change.

### GHSA-mp7j-qc5w-4988 and GHSA-xv26-6w52-cph6 - `websocket-driver` (current)

- **Status:** Tracked. `npm audit --audit-level=moderate` currently reports
  the transitive `websocket-driver@0.7.4` through the Firebase database tree.
- **Impact:** Resource-limit bypass through message compression (moderate) and
  protocol-length-header message corruption (critical) affect versions below
  `0.7.5`.
- **Action:** Open a separate, immediate dependency-fix PR to update the
  resolved package path to `websocket-driver@0.7.5`, verify the lockfile and
  release gates, then remove this entry. This documentation release does not
  modify dependencies or `package-lock.json`.
