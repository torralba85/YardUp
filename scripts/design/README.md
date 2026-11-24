# design

## Overview

Build, CI, design auditing, and automation scripts for design.

## Interface

- [`audit.mjs`](./audit.mjs) — `root`, `sourceFiles`, `authoredText`, `inspect`, `audit`, `literalGrowth`; CLI supports `--inventory`.
- [`checks.mjs`](./checks.mjs) — script entry point.
- [`generate.mjs`](./generate.mjs) — script entry point; CLI supports `--check`.

## Invariants

None identified in the direct source.

## Side Effects

- [`audit.mjs`](./audit.mjs) — filesystem reads via readdirSync, readFileSync.
- [`checks.mjs`](./checks.mjs) — filesystem reads via readFileSync.
- [`generate.mjs`](./generate.mjs) — filesystem reads via readFileSync. filesystem writes via writeFileSync.

## Verification

Run `npm test` from the YardUp repository root.
