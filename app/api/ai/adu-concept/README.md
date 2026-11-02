# adu-concept

## Overview
Server API route handler providing backend endpoints for ai/adu-concept.

## Interface
- `route.ts:runtime` - Exported constant / variable
- `route.ts:POST` - Exported Function

## Invariants
- `route.ts:throw` - new OpenAIProviderError("OpenAI returned no style output.")
- `route.ts:throw` - new OpenAIProviderError("OpenAI returned no generated image.")
- `route.ts:JSON.parse` - Schema / validation invariant
- `route.ts:throw` - new OpenAIProviderError("OpenAI returned an invalid style analysis.")

## Side Effects
- None

## Verification
- Run: `npm test`
