# Agent Working Agreement — LOTFOUNDRY / ADU Advisor

## Product Center

The product is LOTFOUNDRY (customer-facing brand) operated under the legal name ADU Advisor. The center is **ADU earning potential and builder connection**, not design exploration. In QA mode, flag any UI that hides revenue, cost, payback, or builder-readiness behind decorative design controls.

Do not restrict the app's framing to California unless the specific feature or data source is California-only. Use "supported markets", "local rules", and "jurisdiction" framing.

## Repository Identity

This checkout is the canonical LOTFOUNDRY mobile application repository. Its Git remote is `https://github.com/torralba85/YardUp.git`; the GitHub repo name, the local folder name `ADU Advisor`, and the native bundle IDs preserve legal and store continuity and do not indicate a separate product repository. The repository was previously branded YardUp; brand assets, copy, and visual system have moved to LOTFOUNDRY (see DESIGN.md), but identifiers stayed put for store-listing and link continuity.

Before using prior repo assumptions or moving work between projects, verify the active checkout with `git remote -v` and treat this repository and `origin/main` as the source of truth. Do not describe `github.com/torralba85/YardUp` as a sibling prototype unless a separate, explicit prototype repository is provided.

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
- Repository: `github.com/torralba85/YardUp` is this Expo mobile product repository. Any web or Gemini Vision prototype must be identified by a separate explicit path or remote before its behavior or privacy assumptions are considered.

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

- Do not change the bundle IDs (`com.aduadvisor.app`). The rebrand to LOTFOUNDRY is brand-only; store-listing continuity depends on stable identifiers.
- Do not change the GitHub remote URL or repository name. The repo stays at `github.com/torralba85/YardUp` for link and history continuity.
- Always render the brand name as `LOTFOUNDRY` — all caps, one word, no slash and no space. Never `Lot/Foundry`, never `Lot Foundry`, never `LotFoundry`, never "the Foundry" on its own. (The slash form `Lot/Foundry` is retired; it survives only in historical changelog entries and the dated `docs/brand/lotfoundry-direction-05.html` snapshot.)
- The logo is the **Foundation Monogram**: an interlocking L + F block where LOT reads in charcoal (`colors.text`) and FOUNDRY in Capital Brass (`colors.capitalBrass` `#A47A3B`), paired with the `LOTFOUNDRY` wordmark. It is implemented in `src/components/LotFoundryLogo.tsx`. This supersedes the earlier emerald-slash mark.
- Do not invent support emails, domains, or legal entities — use `support@aduadvisor.app` until explicitly told otherwise.
- Do not commit OpenAI keys, Gemini keys, Firebase service-account JSON, or other secrets. Backend env lives in Firebase runtime config / Secret Manager.
- Do not mention California as the product's geographic scope outside California-only features.
- Do not put cards inside cards, use purple gradients, or animate decorative blobs.

## Documentation Sources Of Truth

- [README.md](./README.md) — Stack, scripts, app surfaces, release env
- [DESIGN.md](./DESIGN.md) — LOTFOUNDRY (Foundry System) design tokens, mark, and voice
- [docs/brand/lotfoundry-direction-05.html](./docs/brand/lotfoundry-direction-05.html) — Canonical brand identity reference (Direction 05)
- [docs/api/api-design.md](./docs/api/api-design.md) — Callable contract and resource model
- [docs/legal/privacy-policy.md](./docs/legal/privacy-policy.md)
- [docs/legal/support.md](./docs/legal/support.md)
- [docs/release/store-review-notes.md](./docs/release/store-review-notes.md)
- [docs/marketing/marketing-kit.md](./docs/marketing/marketing-kit.md)
- [docs/marketing/web-assets.md](./docs/marketing/web-assets.md)
