# hooks

## Overview
Custom React state, layout, and event hooks.

## Interface
- `useSignupFormState.ts:SIGNUP_FORM_STORAGE_KEY` - Exported constant / variable
- `useSignupFormState.ts:SignupRole` - Type Definition
- `useSignupFormState.ts:UseSignupFormStateOptions` - TypeScript Interface
- `useSignupFormState.ts:SignupFormState` - TypeScript Interface
- `useSignupFormState.ts:parseStoredSignupFormState` - Exported Function
- `useSignupFormState.ts:clearPersistedSignupFormState` - Exported Function
- `useSignupFormState.ts:useSignupFormState` - Exported Function

## Invariants
- `useSignupFormState.ts:JSON.parse` - Schema / validation invariant

## Side Effects
- `useSignupFormState.ts:window.sessionStorage.getItem` - External call or state mutation
- `useSignupFormState.ts:window.sessionStorage.setItem` - External call or state mutation
- `useSignupFormState.ts:window.sessionStorage.removeItem` - External call or state mutation

## Verification
- Run: `npm test`
