# ai

## Overview

Server API route handler providing backend endpoints for ai.

## Interface

### Subdirectories & Boundaries

- [adu-concept](./adu-concept/README.md) — Handles POST requests at `/api/ai/adu-concept`. Generates an ADU concept from the submitted design request.
- [project-brief](./project-brief/README.md) — Handles POST requests at `/api/ai/project-brief`. Produces a project brief through the shared AI panel pipeline.

## Invariants

See the linked child contracts.

## Side Effects

See the linked child contracts.

## Verification

Run `npm test` from the YardUp repository root.
