# public

## Overview

Static web application assets and service worker runtime.

## Interface

- [`sw.js`](./sw.js) — `install event`, `activate event`, `fetch event`

## Invariants

None identified in the direct source.

## Side Effects

- [`sw.js`](./sw.js) — service-worker cache access via cache.match, cache.put, caches.match, caches.open, caches.delete. event listener registration or cleanup via self.addEventListener. HTTP requests via fetch.

## Verification

Run `npm test` from the YardUp repository root.
