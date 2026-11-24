# hooks

## Overview

Custom React state, layout, and event hooks.

## Interface

- [`useSignupFormState.ts`](./useSignupFormState.ts) — `SIGNUP_FORM_STORAGE_KEY`, `SignupRole`, `UseSignupFormStateOptions`, `SignupFormState`, `parseStoredSignupFormState`, `clearPersistedSignupFormState`, `useSignupFormState`

## Invariants

- [`useSignupFormState.ts`](./useSignupFormState.ts) — SignupRole accepts user, builder. The module declares the React client boundary with "use client".

## Side Effects

- [`useSignupFormState.ts`](./useSignupFormState.ts) — event listener registration or cleanup via window.addEventListener, window.removeEventListener. browser storage updates via window.sessionStorage.setItem, window.sessionStorage.removeItem.

## Verification

Run `npm test` from the YardUp repository root.
