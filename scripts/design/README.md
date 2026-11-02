# design

## Overview
Build, CI, design auditing, and automation scripts for design.

## Interface
- `audit.mjs:root` - Exported constant / variable
- `audit.mjs:sourceFiles` - Exported Function
- `audit.mjs:authoredText` - Exported Function
- `audit.mjs:inspect` - Exported Function
- `audit.mjs:audit` - Exported Function
- `audit.mjs:literalGrowth` - Exported Function
- `checks.mjs:main` - Executable entrypoint / script
- `generate.mjs:main` - Executable entrypoint / script

## Invariants
- `audit.mjs:postcss.parse` - Schema / validation invariant
- `audit.mjs:JSON.parse` - Schema / validation invariant
- `checks.mjs:JSON.parse` - Schema / validation invariant
- `checks.mjs:assert.ok` - Schema / validation invariant
- `checks.mjs:assert.equal` - Schema / validation invariant
- `checks.mjs:assert.deepEqual` - Schema / validation invariant
- `checks.mjs:assert.doesNotMatch` - Schema / validation invariant
- `checks.mjs:assert.match` - Schema / validation invariant

## Side Effects
- None

## Verification
- Run: `npm test`
