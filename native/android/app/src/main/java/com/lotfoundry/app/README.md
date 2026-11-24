# app

## Overview

Native mobile application wrapper, build configuration, and bridge for android/app/src/main/java/com/lotfoundry/app.

## Interface

- [`Application.java`](./Application.java) — `Application`, `onCreate`
- [`DelegationService.java`](./DelegationService.java) — `DelegationService`, `onCreate`
- [`LauncherActivity.java`](./LauncherActivity.java) — `LauncherActivity`

## Invariants

None identified in the direct source.

## Side Effects

- [`DelegationService.java`](./DelegationService.java) — registerExtraCommandHandler registers the Digital Goods request handler.
- [`LauncherActivity.java`](./LauncherActivity.java) — setRequestedOrientation sets the activity orientation.

## Verification

Run `npm test` from the YardUp repository root.
