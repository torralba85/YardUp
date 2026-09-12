# GCP API Key Audit

**Date:** 2026-08-31
**Project:** `yardup-2026`
**Scope:** Google API-key restrictions reviewed ahead of making `torralba85/YardUp` public.

This records the live Cloud Console credential findings captured on 2026-08-31. It intentionally contains key names and restriction posture only; no key values are recorded here.

## Findings

| Key | Restrictions observed | Action |
|---|---|---|
| `next_public_google_places_key` | HTTP referrers; 33 APIs | Reduce API scope to only the Google APIs the browser code actually calls. Confirm usage in the codebase before changing restrictions. |
| Browser key (Firebase auto) | No application restriction; 25 APIs | Add HTTP referrer restrictions. This key is intentionally shipped by `lib/firebase.ts`, but unrestricted browser use leaves a billing-abuse surface outside Firestore rules/App Check. |
| iOS key (Firebase auto) | No application restriction; 25 APIs | Add an iOS bundle-ID restriction. |
| Android key (Firebase auto) | No application restriction; 25 APIs | Add Android package-name + SHA-1 restrictions. |
| `lotfoundry-web-places` | HTTP referrers; 3 APIs | No change required based on this audit. |
| `lotfoundry-server-*` (Places, Maps) | No application restriction | Expected for server-side keys; no change required based on this audit. |

## Repository exposure review

A full git-history audit completed on 2026-08-31 found no live Stripe, OpenAI, GitHub, GitLab, GCP service-account, private-key, JWT, or App Check debug secrets. `npm run repo:public-check` passed.

One Google Places browser key appears in a committed Playwright console log from 2026-07-01 (`.playwright-cli/console-*.log`). The matching browser key is HTTP-referrer restricted and the same class of key is already delivered to browsers in production, so this finding does not block making the repository public and does not justify a history rewrite.

Optional defense in depth: rotate `next_public_google_places_key` and `lotfoundry-web-places`, both created before the 2026-07-01 log exposure, after confirming their current consumers and referrer restrictions.

## Follow-up

The restriction changes above require Cloud Console access and are not code changes. None of them block changing repository visibility; they are pre-existing GCP-side hardening items.
