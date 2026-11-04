# /design-sync notes (YardUp → Claude Design "A LOT MORE")

Project: https://claude.ai/design/p/7ff0e4d3-df13-49ca-ac9f-6bd42cfb99bf (pinned in config.json).

## How this repo is synced

- YardUp is a Next.js app, not a published package. `.design-sync/kit/` stands in for one:
  `src/index.ts` re-exports the `components/ui` modules (bundled as `window.LotFoundryUI`), and
  `build.mjs` (the config's `buildCmd`) writes `kit/dist/`: tsc declarations, the compiled Tailwind 4
  stylesheet (`kit.css` → `dist/styles.css`) and the two brand fonts.
- **A new `components/ui` module needs a line in `kit/src/index.ts`**, plus a `docsMap` group entry and,
  when it isn't the file's namesake export, a `componentSrcMap` entry (Field.tsx holds Input, Select,
  Textarea, Checkbox, FieldLabel, Segmented, Slider; Panel.tsx holds PanelHeader; BrandLockup.tsx holds
  ParcelMark).
- Groups come from the one-line stubs in `.design-sync/groups/*.md` via `docsMap`.
- Lucide icons ship through `kit/src/icons.ts` (`extraEntries`) as a hand-kept list of the icons the app
  imports. Refresh it on every sync:
  `grep -rhoE 'import \{[^}]+\} from "lucide-react"' --include=*.tsx app components`.
- `kit.css` force-generates every `lot-*` / `status-*` colour utility, the `lf-*` type utilities and the
  shadow/radius names with `@source inline(...)`, so designs can use utilities the app hasn't used yet.
- Fonts: next/font loads Space Grotesk and Manrope at app build time, so there's no `@font-face` in the
  repo. `build.mjs` fetches the latin + latin-ext woff2 subsets from Google Fonts (SIL OFL) — a network
  dependency of every build.
- `Dialog` portals to `body` with a `fixed inset-0` scrim and makes the rest of the page inert; its card
  is `cardMode: single` with `primaryStory: PurchaseSlip`. Previews pass `initialFocus="none"`.

- The conventions header (`conventions.md`, via `readmeHeader`) names classes from the compiled CSS. It's a
  precompiled Tailwind build, not a runtime, so validate every name against `ds-bundle/_ds_bundle.css`
  after a rebuild. When searching that file from Git Bash, build the backslash with
  `String.fromCharCode(92)`: the shell collapses `\\` in heredocs and `node -e`, so `.sm\:grid-cols-2`
  silently fails to match.

- `npm run lint` (`eslint .`) also lints the gitignored sync output (`.ds-sync/`, `ds-bundle/`,
  `.design-sync/kit/dist/`) in a synced checkout; CI never sees those. The committed sync files lint clean.

## Previews

- `FeasibilityBadge` is a `<details>` disclosure with no `open` prop. The NeedsReview and ZoningUnverified
  stories share a title, so their `Expanded` wrapper opens the details after mount to show each reason.
- `Slider` has no disabled styling (thumb and track ignore `disabled`), so there is no Disabled story;
  `AtMinimum` shows the 4 ft code-minimum state instead. Design gap to raise, not a sync bug.
- Known render warns: none (validate clean on 2026-11-04).

## Re-sync risks

- Fonts are fetched from Google Fonts on every `buildCmd` run; offline builds fail at step 3.
- `kit/src/icons.ts` is a hand-kept list; new `lucide-react` imports in the app don't reach designs until it's
  refreshed.
- `kit/src/index.ts` is a hand-kept module list; a new `components/ui` module is invisible until it's added.
- Preview data (San Diego lot, prices, consent copy) is inlined and can drift from the product's real copy.
- The compiled CSS only carries utilities the app (or `kit.css`'s inline safelist) uses; a utility dropped from
  the app disappears from designs on the next sync.

## History

- 2026-10-13: first attempt (worktree `design-sync-20261013`, backed up as `wip/chore/design-sync-20261013`)
  built 17 components cleanly, graded Button, PanelHeader and StepRail, and uploaded only those three plus
  the base files; it never wrote `_ds_sync.json`, so the project was un-anchored.
- 2026-11-04: resumed on `chore/design-sync-20261104` from master `265e12b`; added Dialog and Checkbox
  (both new since 10-13) and 10 newly used icons.
