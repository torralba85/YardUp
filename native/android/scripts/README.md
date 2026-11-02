# scripts

## Overview
Native mobile application wrapper, build configuration, and bridge for android/scripts.

## Interface
- `validate-config.mjs:main` - Executable entrypoint / script

## Invariants
- `validate-config.mjs:JSON.parse` - Schema / validation invariant

## Side Effects
- `validate-config.mjs:fetch` - External call or state mutation
- `validate-config.mjs:fetchNoRedirect` - External call or state mutation

## Verification
- Run: `npm test`
