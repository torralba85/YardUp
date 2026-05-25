# Agent Working Agreement — YardUp / ADU Advisor

## Product Center

The product is YardUp (customer-facing brand) operated under the legal name ADU Advisor. The center is **ADU earning potential and builder connection**, not design exploration. In QA mode, flag any UI that hides revenue, cost, payback, or builder-readiness behind decorative design controls.

Do not restrict the app's framing to California unless the specific feature or data source is California-only. Use "supported markets", "local rules", and "jurisdiction" framing.

## Design System

Always read [DESIGN.md](./DESIGN.md) before making any visual or UI decisions. All font choices, colors, spacing, hierarchy, and copy posture are defined there. DESIGN.md now includes machine-readable design tokens in its frontmatter — prefer those over re-deriving values from prose.

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code. The repo is pinned to Expo SDK 54, React Native 0.81, React 19, and Expo Router 6.

## Stack Facts

- Mobile client: Expo Router under `app/(tabs)`, screens at `index.tsx` (Value), `estimate.tsx`, `contractors.tsx` (Builders), `guide.tsx` (Permits), `ideas.tsx` (Studio). A hidden `inspiration.tsx` exists but is not in the tab bar.
- Source: shared code under `src/` (components, data, domain, services, state, storage, theme).
- Backend: Firebase Cloud Functions under `functions/` targeting the `yardup-2026` Firebase project, region `us-central1`. Native bundle IDs remain `com.aduadvisor.app`.
- Local persistence: `expo-sqlite` with tables for projects, inspirations, concepts, regulations, property records, and a sync queue.
- AI: Gemini is server-side only. Mobile must never hold a Gemini key.
- Sibling: `github.com/torralba85/YardUp` is a Next.js prototype that experiments with Gemini Vision photo analysis. It is not part of the mobile bundle and its privacy assumptions do not transfer to this app.

## Verification

Before claiming a change is done:

```bash
npm run typecheck
npm test
npm run backend:typecheck
npm run backend:test
```

Run `npm run release:check` before tagging a store build.

## What Not To Do

- Do not change the bundle IDs (`com.aduadvisor.app`). The rebrand to YardUp is brand-only; store listing continuity depends on stable identifiers.
- Do not invent support emails, domains, or legal entities — use `support@aduadvisor.app` until explicitly told otherwise.
- Do not commit OpenAI keys, Gemini keys, Firebase service-account JSON, or other secrets. Backend env lives in Firebase runtime config / Secret Manager.
- Do not mention California as the product's geographic scope outside California-only features.
- Do not put cards inside cards, use purple gradients, or animate decorative blobs.

## Documentation Sources Of Truth

- [README.md](./README.md) — Stack, scripts, app surfaces, release env
- [DESIGN.md](./DESIGN.md) — Quiet Ascent design system + tokens
- [docs/api/api-design.md](./docs/api/api-design.md) — Callable contract and resource model
- [docs/legal/privacy-policy.md](./docs/legal/privacy-policy.md)
- [docs/legal/support.md](./docs/legal/support.md)
- [docs/release/store-review-notes.md](./docs/release/store-review-notes.md)
- [docs/marketing/marketing-kit.md](./docs/marketing/marketing-kit.md)
- [docs/marketing/web-assets.md](./docs/marketing/web-assets.md)
