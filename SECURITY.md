# Security

## Reporting

Report suspected vulnerabilities privately via GitHub Security Advisories on
this repository.

## Known advisories (accepted / tracked)

### GHSA-qx2v-qp2m-jg93 — PostCSS XSS via unescaped `</style>` (moderate)

- **Status:** Accepted, awaiting upstream fix.
- **Path:** `next > postcss` (transitive, bundled inside Next.js, not a
  direct dependency).
- **Why not patched yet:** The fix requires PostCSS >= 8.5.10. Next.js 16.2.6
  (current stable) still bundles PostCSS 8.4.31; only Next canary builds ship
  the patched version. A direct override of the nested PostCSS risks breaking
  Next's CSS pipeline.
- **Real-world risk:** Low. This XSS only triggers when PostCSS processes
  untrusted, user-supplied CSS. All CSS in this app is authored at build time.
- **Action:** Re-run `npm audit` after each Next.js upgrade and drop this
  entry once a stable Next release bundles PostCSS >= 8.5.10.
