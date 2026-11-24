# adu-concept

## Overview

Handles POST requests at `/api/ai/adu-concept`. Generates an ADU concept from the submitted design request.

## Interface

- [`route.ts`](./route.ts) — `runtime`, `POST`

## Invariants

- [`route.ts`](./route.ts) — runtime = "nodejs". requireApiAuth checks the caller. Response branches explicitly set HTTP 400.

## Side Effects

- [`route.ts`](./route.ts) — Submits the concept request through createOpenAIResponse.

## Configuration

- [`route.ts`](./route.ts) — Reads `OPENAI_TEXT_MODEL` (defaults to `"gpt-5.6-sol"`) for architectural style analysis and `OPENAI_IMAGE_MODEL` (defaults to `"gpt-5.6-sol"`) for concept image generation.

## Verification

Run `npm test` from the YardUp repository root.
