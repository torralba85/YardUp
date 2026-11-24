# scripts

## Overview

Native mobile application wrapper, build configuration, and bridge for android/scripts.

## Interface

- [`validate-config.mjs`](./validate-config.mjs) — script entry point; supports `--release`, `--verify-live`.

## Invariants

None identified in the direct source.

## Side Effects

- [`validate-config.mjs`](./validate-config.mjs) — filesystem reads via readFileSync. subprocess execution via execFileSync. HTTP requests via fetch.

## Configuration

- [`validate-config.mjs`](./validate-config.mjs) — reads optional `LOTFOUNDRY_UPLOAD_KEY_SHA256` (verified against `public/.well-known/assetlinks.json` and `native/android/twa-manifest.json`), and in `--release` mode when `app-release.aab` exists reads `ORG_GRADLE_PROJECT_LOTFOUNDRY_STORE_FILE`, `ORG_GRADLE_PROJECT_LOTFOUNDRY_KEY_ALIAS`, `ORG_GRADLE_PROJECT_LOTFOUNDRY_STORE_PASSWORD`, and `ORG_GRADLE_PROJECT_LOTFOUNDRY_KEY_PASSWORD` to verify the upload keystore and AAB signer.

## Verification

Run `npm test` from the YardUp repository root.
