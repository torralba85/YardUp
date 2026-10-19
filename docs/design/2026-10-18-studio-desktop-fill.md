# Studio desktop: one viewport, a full stage, a reachable CTA

Andrew reported a blank area under Tools in the desktop Studio and a blank strip under the page on
October 18, 2026, and asked for the Studio to be improved for users generally. Measured on the live
site at 1536×816, the cause was structural and went beyond the blank areas:

- The step body had no `min-h-0`, so it grew to its tallest pane inside the locked `main`
  (`lg:overflow-hidden`, from #306). Every step except Builders overflowed by 119–197px with no way
  to scroll: the rail's certificate CTA, Design's lower finishes and the Certificate step's
  "Continue to secure checkout — $29" were cut off at the viewport edge.
- The center column was stretched to the rail's height while the 3D canvas stayed capped at
  `clamp(340px,54dvh,560px)`, which left chalk below Tools.
- The planning-guide section sat below a full-height shell, so the page scrolled by its height. A
  wheel over a short pane chained to the page and slid the view tabs and logo out of view.
- On a real lot, the email card's `sr-only` label had no positioned ancestor. It escaped the clip and
  stretched the page (to 1257px at an 816px viewport), which was the blank strip in the report.

## Rules

- **Desktop Studio is one viewport.** Panes scroll on their own; the page never scrolls. The step
  body is `min-h-0`, and `main` is `relative` so absolutely positioned descendants stay clipped.
- **The stage fills its column.** The scene section grows into free height; when content follows
  (the purchased permit guide, the design gallery, the Your Lot header) it shrinks to an explicit
  floor, `clamp(480px,72dvh,720px)`. The floor must be explicit: the scene's percentage heights make
  the automatic content minimum circular, and the stage would never shrink.
- **The certificate CTA stays in reach.** In the desktop rail the free preview's unlock button is a
  sticky footer while the preview is on screen (`StudioPreview stickyCta`). Mobile is unchanged.
- **The planning guide is a 3rem bar.** On desktop it is the last row of the viewport
  (`--studio-guide-bar`, subtracted by `StudioShell`) and opens upward over the Studio. Its text stays
  in the server HTML for crawlers. Below `lg` it remains a normal section under the page.

## Verification

`e2e/studio-desktop-layout.spec.ts` runs at 1366×768: no page scroll and no step overflow on any
step, the stage reaches its column bottom, the CTA sits above the guide bar, Tools opens without page
scroll, a signed-in real lot leaves no strip, and the guide opens in view. Local measurements at
1366×650, 1536×816 and 1920×960 matched the rules; tablet and phone widths use the mobile journey
and were unchanged.
