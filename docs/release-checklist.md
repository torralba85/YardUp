# Release Checklist

Run against a clean install: `rm -rf node_modules .next && npm ci`

## Automated Gates

- [ ] `npm ci`
- [ ] `npm run lint` — zero warnings, zero errors
- [ ] `npm run test` — all unit tests passing
- [ ] `npm run test:e2e` — all Playwright tests passing
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npm run build` — production build succeeds
- [ ] `FIREBASE_SMOKE_EMAIL=<test user> FIREBASE_SMOKE_PASSWORD=<password> npm run smoke:firebase` - Firebase Auth sign-in and scenario save/load/delete pass against the deploy project

## Manual QA

- [ ] Semantic-color check: base clay is used for interactive fills and borders; clay-ink is used for interactive text and focus on light surfaces; clay-on-dark is used on mahogany or espresso.
- [ ] State-color check: current/selected controls are clay, completed/readiness states are forest, and forest commit CTAs use their solid semantic hover role.
- [ ] Account/support flow: `/settings`, `/about`, `/help`, `/feedback`, `/delete-account`, `/privacy`, and `/terms` load; test-account export and deletion are understandable and complete.

- [ ] Desktop visual check at 1440x900 — no clipped UI, no blank scene
- [ ] Tablet visual check at 768x1024 — no horizontal overflow
- [ ] Mobile visual check at 390x844 — no horizontal overflow
- [ ] Mobile visual check at 320x568 — no horizontal overflow
- [ ] Keyboard navigation — Tab cycles through controls, no focus traps
- [ ] Report print/save — print stylesheet hides controls, shows report
- [ ] Download summary — `.txt` file downloads with scenario data
- [ ] Export CSV — `.csv` file downloads
- [ ] Share link — copies current scenario URL to clipboard
- [ ] 3D scene renders — house, ADU, trees, fences visible
- [ ] Arrow keys move ADU — within setback bounds, clamped
- [ ] Drag to place ADU — mouse drag repositions within buildable area
- [ ] Address search renders — input appears (disabled without API key)
- [ ] Live parcel flow — with API keys, address search → aerial view

## Security

- [ ] No secrets committed — check `.env.local`, `functions/.env` not staged
- [ ] `npm audit` reviewed — no unsafe forced downgrade applied
- [ ] API keys restricted — Google Places key restricted by HTTP referrer in GCP Console
- [ ] Firebase Auth provider enabled - email/password sign-in works for the smoke test user
- [ ] Firestore rules deployed - `users/{uid}/savedScenarios` allows owner create/read/delete and rejects malformed scenario payloads

## Firebase Deploy (if applicable)

- [ ] If native-store verification is enabled, validate StoreKit and Play Billing sandbox receipts through `/api/store/purchases/verify`; do not substitute an unverified web Stripe flow for native purchase testing.

- [ ] `npm run build:firebase` succeeds
- [ ] `firebase deploy --only hosting,functions` succeeds
- [ ] Site loads on Firebase Hosting URL
- [ ] API routes return 200 on Firebase Functions URL
- [ ] Address search works with live API keys
- [ ] Scenario smoke command passes after deploy
