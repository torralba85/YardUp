# Mobile Native-Feel Layer — Design

**Date:** 2026-07-28
**Status:** Approved, not implemented
**Scope:** The mobile five-reveal journey (`components/studio/mobile/journey/`) as experienced inside the Android TWA. Desktop is untouched.

## Problem

LotFoundry ships to Play as a TWA (`native/android/twa-manifest.json`, `display: standalone`). The packaged app runs the same code as the website — and that is the defect. Removing the browser chrome changed the correctness requirements without changing a line of the app.

Two of the resulting issues destroy user state:

1. **The Android back button exits the app.** `journeyStep` is plain `useState` (`components/FeasibilityStudio.tsx:291`) and the repo contains no `popstate` listener. In `standalone` display there is no browser UI to absorb the gesture, so a user three reveals deep who swipes back leaves LotFoundry and loses the entire study.
2. **Pull-to-refresh wipes the journey.** `app/globals.css` contains no `overscroll-behavior` declaration, so Chrome's pull-to-refresh is live inside the TWA. Because journey position is React-only state, a reload returns the user to Find.

Both share one root cause: journey position lives only in React state, so anything that unwinds the browsing context destroys it.

Three further issues are sensory rather than functional:

3. **No haptics.** A repo-wide search for `vibrate|haptic` returns no files.
4. **Tap-highlight flash.** `-webkit-tap-highlight-color` is unset, so every tap paints a translucent box — likely the loudest single "web page" tell.
5. **No step transition.** Reveals swap instantly with no directional motion.

Already correct, and therefore out of scope: `--color-lf-sand: #F2E5D5` (`app/globals.css:14`) exactly matches the TWA `backgroundColor` and `themeColor`, so splash-to-first-paint continuity is seamless.

## Design

Two new modules, additions to `app/globals.css`, and edits to three existing files. Each new module follows a pattern the codebase already established rather than introducing a new one.

| File | Purpose | Pattern followed |
|---|---|---|
| `lib/haptics.ts` | Named haptic vocabulary + capability detection | Pure SSR-guarded module |
| `lib/use-journey-history.ts` | Binds journey position to session history | `useSyncExternalStore` + `serverDefault`, as in `lib/use-media-query.ts` |
| `app/globals.css` additions | Touch chrome (tap highlight, selection, overscroll) | Extends the existing `.lf-entrance` / `.lf-stagger` block |

Touch points: `components/FeasibilityStudio.tsx` (call the history hook), `components/studio/mobile/journey/MobileJourney.tsx` (transition wrapper, `overscroll-contain`), `components/ui/Button.tsx` (haptic on press).

### Hydration constraint

`CLAUDE.md` warns against JS-driven motion wrappers. The codebase's answer is twofold: `useMediaQuery` uses `useSyncExternalStore` with an explicit `serverDefault` so the server renders one known tree and the client corrects after hydration; and all motion lives in CSS classes gated by `@media (prefers-reduced-motion: no-preference)`, so markup is identical on both sides and CSS alone decides whether it moves. Both new modules inherit these patterns.

### History integration

**Forward:** each advance calls `history.pushState({ lfJourneyStep: id }, "", window.location.href)` — same URL, new state entry.

The same-URL detail is load-bearing. `e2e/hero.spec.ts:61` enforces a privacy rule: a guest's typed address must never land in the URL or history. Encoding the step in the URL is the obvious approach and would quietly break that guarantee. State-only entries give back-navigation with nothing readable written down.

**Backward:** a `popstate` listener reads `event.state?.lfJourneyStep` and sets journey position. At `find` no pushed entry remains, so back exits the app — correct behavior for the first screen.

**Two failure modes handled explicitly:**

- `components/studio/CertificatePanel.tsx:135` already calls `history.replaceState`, overwriting our state object on the current entry. The handler treats missing state as "fall back to the derived step" rather than trusting it.
- Pull-to-refresh gets `overscroll-behavior-y: contain` on `MobileJourney`'s `<main>`. Scoped there, not globally: the journey root is already `h-dvh overflow-hidden`, making that container the only scroller in the journey, and desktop stays untouched.

### Haptics

`lib/haptics.ts` exposes a named vocabulary rather than raw milliseconds, so call sites read as intent (`haptic("commit")`) and physical feel stays tunable in one place. SSR-guarded, feature-detects `navigator.vibrate`, no-ops silently where unsupported.

**Platform asymmetry, accepted deliberately:** `navigator.vibrate` is Android/Chrome only. iOS Safari and iOS PWAs do not implement it. The Play build gets haptics; an iOS build would not. Play is the active release track, so this is an accepted progressive enhancement, not a gap to close.

**Decision 3(a) — does reduced-motion silence haptics?** There is no `prefers-reduced-haptics` media query. Reduced-motion is the closest available signal, but it is a proxy for vestibular comfort, and for some users haptics substitute for motion they have turned off rather than adding to it.

*Default if not overridden:* respect reduced-motion and silence haptics. Conservative, and a one-line change to flip.

**Decision 3(b) — the event vocabulary.** Over-vibration is the fastest way to make haptics feel cheap. Candidate events, most to least defensible: primary/commit CTA press; the money reveal landing on Earn; journey step advance; rail step selection; `FineTuneDrawer` slider detents; every `Button` press regardless of variant.

*Default if not overridden:* the first two only, with step advance folded into the CTA press that caused it. `ActStep.tsx:32` already commits to restraint ("a settle, not a confetti cannon") and this matches it.

The pattern map is the product's tactile personality. `lib/haptics.ts` ships with the vocabulary signature and the map stubbed for the repo owner to fill in during implementation.

### Transition choreography

`ShapeStep` receives the 3D scene as a prop — `components/FeasibilityStudio.tsx:648` passes `scene={<SceneViewport sceneNode={sceneNode} …/>}`. The obvious technique (a `key` on the step wrapper so React remounts it and a CSS animation replays) would therefore tear down and rebuild the WebGL context on every entry to and exit from Shape — twice per session, mid-journey, as a visible hitch.

**Stable wrapper, imperative replay.** `MobileJourney` keeps one non-keyed wrapper element around `{children}`. A `useLayoutEffect` fires on step change and calls `element.animate()` (Web Animations API) with direction derived from comparing the new step index against a ref holding the previous one. Forward enters from the right, back from the left. No remount, so the WebGL context survives untouched.

This clears the hydration constraint rather than violating it: a layout effect never runs during SSR or the first hydration pass, and WAAPI mutates a stable node imperatively rather than changing rendered attributes. Server and client markup stay identical.

**Reduced-motion trap.** The global kill switch at `app/globals.css:378` forces `animation-duration: 0.01ms !important`, but that governs only CSS animations. WAAPI is a separate stack and ignores it. The effect must check `matchMedia("(prefers-reduced-motion: reduce)").matches` itself and skip. Inheriting the existing safety net here would fail silently, and reduced-motion users would be the ones to discover it.

**Motion values:** ~200ms, `ease-out`, `translateX` ±12px with opacity. `DESIGN.md` calls for panels that slide-settle with ease-out; existing durations are 200–220ms; 12px is a settle rather than a carousel swipe.

**View Transitions API — considered and rejected.** `document.startViewTransition` is well supported in the TWA's Chrome and would be elegant, but it needs a fallback path for the web build and would become a third motion pattern in a codebase that already has two. WAAPI reaches the same result inside the existing vocabulary.

### Touch chrome

Added to `app/globals.css`:

- `-webkit-tap-highlight-color: transparent` on interactive elements.
- `user-select: none` on journey chrome (rail, buttons, kickers) but **not** on content. Addresses, money figures, and APNs stay selectable — users copy those.

## Verification

| Layer | Covers |
|---|---|
| `lib/haptics.test.ts` | Capability detection; silent no-op when `navigator.vibrate` is absent; vocabulary map resolves; reduced-motion behavior per 3(a) |
| `lib/use-journey-history.test.ts` | Pushes on advance; `popstate` restores the right step; missing-state fallback (the `CertificatePanel` `replaceState` collision); back at `find` does not trap the user |
| `MobileJourney.test.tsx` (extend) | Direction resolution forward/back; **wrapper identity stays stable across step changes** — the regression guard against someone reverting to a `key` and silently killing the WebGL context |
| `e2e/feasibility-studio.spec.ts` (extend, mobile project) | `page.goBack()` from Shape lands on Earn with state intact rather than leaving the app |
| CSS assertion | `overscroll-behavior-y: contain` present on the journey scroller — pull-to-refresh cannot be driven from Playwright |
| **Manual, on-device** | **Haptics — not automatable at any layer.** `navigator.vibrate` is fire-and-forget with no observable result. Requires a real Android device against the TWA build. |

Release gate after implementation: `npm run lint && npm run test && npx tsc --noEmit && npm run build`.

## Constraints

- **GitHub freeze until 2026-08-03** (Devpost judging). All work stays local — commits are fine, pushes and GitHub writes are not.
- Current branch is `release/mobile-store`, which carries uncommitted changes predating this work.

## Out of scope

- Splash/theme continuity — already correct.
- iOS haptics — no platform API exists.
- The other three mobile findings from the 2026-07-28 audit, deferred deliberately: step labels hidden below 440px (`JourneyRail.tsx:75`), rail tap targets failing 44×44 at that width, and the under-designed money reveal on `EarnStep`.
