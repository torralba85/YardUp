# scripts

## Overview
Component package providing domain logic and interface implementations for scripts.

## Interface
- `agent-pass.mjs:main` - Executable entrypoint / script (create, report and revoke real estate agent passes; dry run unless `--write`)
- `build-market-data.js:main` - Executable entrypoint / script
- `build-san-diego-adu-permits.mjs:main` - Executable entrypoint / script
- `capture-landing-demo.mjs:main` - Executable entrypoint / script
- `capture-store-screenshots.mjs:main` - Executable entrypoint / script
- `firebase-scenario-smoke.mjs:main` - Executable entrypoint / script
- `firebase-signup-smoke.mjs:main` - Executable entrypoint / script
- `indexnow-submit.mjs:main` - Executable entrypoint / script
- `indexnow.mjs:parseSitemap` - Exported Function
- `indexnow.mjs:diffSitemapStates` - Exported Function
- `indexnow.mjs:run` - Exported Function
- `prepare-firebase.js:main` - Executable entrypoint / script
- `preview-mobile-studio.mjs:main` - Executable entrypoint / script
- `render-app-icons.mjs:main` - Executable entrypoint / script
- `render-brand-assets.mjs:main` - Executable entrypoint / script
- `render-feature-graphic.mjs:main` - Executable entrypoint / script
- `run-jev-geocode-eval.mjs:main` - Executable entrypoint / script
- `validate-public-repo.mjs:main` - Executable entrypoint / script
- `verify-store-bindings.cjs:main` - Executable entrypoint / script

### Subdirectories
- [ci](<./ci/README.md>) - Build, CI, design auditing, and automation scripts for ci.
- [design](<./design/README.md>) - Build, CI, design auditing, and automation scripts for design.

## Invariants
- `build-market-data.js:throw` - new Error(`Invalid FMR values in row: ${JSON.stringify(rec)}`)
- `build-san-diego-adu-permits.mjs:throw` - new Error(`Missing columns: ${missing.join(", ")}`)
- `build-san-diego-adu-permits.mjs:JSON.parse` - Schema / validation invariant
- `capture-landing-demo.mjs:throw` - new Error("Capture requires a local demo server.")
- `capture-store-screenshots.mjs:throw` - error
- `firebase-scenario-smoke.mjs:throw` - new Error(`App Check debug token exchange failed: ${response.status} ${message}`
- `firebase-scenario-smoke.mjs:JSON.parse` - Schema / validation invariant
- `firebase-scenario-smoke.mjs:throw` - new Error(`${response.status} ${message}`)

## Side Effects
- `build-market-data.js:fs.readFileSync` - External call or state mutation
- `build-market-data.js:fs.writeFileSync` - External call or state mutation
- `build-san-diego-adu-permits.mjs:fs.mkdirSync` - External call or state mutation
- `build-san-diego-adu-permits.mjs:fs.createWriteStream` - External call or state mutation
- `build-san-diego-adu-permits.mjs:fs.existsSync` - External call or state mutation
- `build-san-diego-adu-permits.mjs:fs.writeFileSync` - External call or state mutation
- `build-san-diego-adu-permits.mjs:fs.readFileSync` - External call or state mutation
- `firebase-scenario-smoke.mjs:fetch` - External call or state mutation

## Verification
- Run: `npm test`
