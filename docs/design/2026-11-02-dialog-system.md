# 2026-11-02 One dialog

The [2026-11-02 audit](./2026-11-02-design-system-audit.md) found six hand-rolled modals:

| Modal | Scrim | Shell |
|---|---|---|
| Sign-in (`AuthModal`) | 75% | Hairline frame |
| Legal re-acceptance (`LegalReacceptGate`) | 75% | Hairline frame |
| Builder unlock slip (`UnlockSlip`) | 90% | 1.5px carbon frame with a hairline mat |
| Before/after board (`BeforeAfterBoard`) | 90% | 1.5px carbon frame |
| Certificate preview (`ReportPreview`) | 70% | Hairline frame and a card shadow |
| Landing sample certificate | 70% | Native `<dialog>` |

Escape, focus and scroll lock were each written their own way. The unlock slip and the legal prompt
neither returned focus nor locked scroll. Andrew chose one shared component at 75% "as long as it looks
award winning", and asked for rules that keep other agents from drifting.

## The look

The unlock slip and the before/after board already looked like a certificate on a mount. That became
the shared look:

- **Backdrop:** `lot-scrim`, a new token: carbon at 75%. One value for every modal backdrop, including
  the fine-tune drawer (it was 50%).
- **Sheet:** chalk, radius 0, a 1.5px carbon frame and an inner hairline mat 6px in.
- **Elevation:** no exterior shadow. Andrew reported that the original desktop `shadow-paper` offset
  looked like another window behind sign-in. The carbon frame and inner mat define a single sheet on
  the scrim. Paper shadows remain for artwork on chalk; `shadow-overlay` stays reserved.
- **Anatomy:**
  - an optional stone kicker;
  - a Space Grotesk 500 title (24px, 30px from `sm`);
  - an optional description, which becomes the accessible description;
  - an optional toolbar row;
  - a scrolling body;
  - an optional pinned footer for the task action.

  Header and footer dividers run between the mat lines.
- **Close:** a 44px hairline square with "Esc" beside the X from `sm` up, and
  `aria-keyshortcuts="Escape"`.
- **Phones:** below `sm` the sheet is a full-width bottom sheet that rises from the bottom edge, with
  safe-area padding.
- **Motion:** the scrim fades in at 180ms and the sheet settles 14px in at 300ms `ease-settle`, with no
  overshoot. Reduced motion opens it in place.

## Behaviour

`Dialog` portals to `body`. It:

- makes the rest of the page `inert`, so screen readers and the pointer stay inside;
- traps Tab (`useFocusTrap`);
- locks page scroll and pads for the scrollbar, so the page doesn't jump;
- closes on Escape (only the topmost of stacked dialogs), the close button, and a press that starts and
  ends on the scrim;
- returns focus to its opener.

Options:

- `onClose` omitted: a blocking dialog. Escape and the scrim do nothing, and focus starts on the sheet.
- `busy`: holds the dialog open while a purchase records.
- `printable`: keeps the certificate's print layout.
- `initialFocus` and `restoreFocus={false}`: let the sign-in modal keep its own focus handling. It
  returns focus to the account control that replaces the sign-in button after a successful sign-in.

A native `<dialog>` was rejected for three reasons:

- Its top layer makes the certificate's multi-page print layout unpredictable.
- jsdom cannot open it, which is why the old landing sample dialog never had an open-state unit test.
- Chrome can force-close it on a second Escape, which the blocking legal prompt cannot allow.

## Migrations

- **Sign-in:** kicker "Free account" / "Sign in". The mode switch moves to the footer. Its own Escape,
  Tab and scroll code is gone.
- **Legal re-acceptance:** blocking. The checkbox is in the body; accept, sign out and delete-account
  are in the footer.
- **Unlock slip:**
  - The slip's details are in the body and the pay button is pinned in the footer, so it is always in
    reach.
  - The title becomes an `h2`, not an `h1`.
  - The pay button gets the focus ring it lacked and a tokenised hover.
  - Ten hand-set sizes become utilities.
- **Before/after board:** the serial and date move to the kicker, and the actions move to the footer.
- **Certificate preview:**
  - The print, download, CSV, share and builders actions form the toolbar.
  - Their labels rise from 11px to the 14px control size (`size="sm"`, 44px).
  - Print stays `#export`.
- **Landing sample certificate:**
  - Now `Dialog` with `fill`, so the iframe fills the sheet.
  - Its 21 lines of CSS-module dialog styles are deleted.
  - Its unit test opens it in the client.

The arbitrary-text-size ratchet fell from 166 to 151, and inline kickers from 24 to 23.

## Guards

`app/design-tokens.test.ts` adds three checks:

- **Modals:** no `role="dialog"`, `aria-modal`, `<dialog>`, or `fixed inset-0` carbon-alpha scrim outside
  `components/ui/Dialog.tsx`. On the previous commit this fails in all seven files.
- **Docs:** every `components/ui` component and hook export needs a row in design-system §6. That section
  now documents the dialog, status chip, skeleton, panel header, field label and slider, step rail,
  bezel, brand lockup, domain cards and hooks.
- **Buttons:** a `rawButtons` ratchet at 75 caps `<button>` outside `components/ui`, so new UI uses
  `ui/Button`.

`CLAUDE.md`, `AGENTS.md` and `GEMINI.md` state the same rules, so Codex and Gemini read them before
they write UI.

## Found on the way

- **The title size was not applying.** `.lf-panel-heading` is unlayered CSS in `globals.css`, so it beat
  Tailwind's layered `sm:text-3xl` and every title rendered at 24px. The dialog title now sets its type
  with utilities. All six measure 30px at 1440 and 24px at 390.
- **Money was green.** The certificate preview's `ReportFact` still mapped a `money` tone to eligible
  green: "$16,605 annual net income estimate" (§2.6). It is now carbon, semibold and tabular. The
  money-green guard checked only the line with the amount, so it now also rejects a `"money"` tone that
  maps to green within the next two lines; on the old code it fails at that mapping.

## Verification

- Lint (design:check and ESLint, 0 warnings), `tsc` and the production build pass.
- **Vitest:** 293 files and 2,855 tests passed (85 skipped as intended). This includes 7 new `Dialog`
  tests: naming, portal, inert, scroll lock, focus return, Tab trap, scrim press, blocking, busy, and a
  stacked Escape.
- **Playwright, full suite on the production build, desktop and mobile:** 255 passed, 64 skipped,
  1 flaky. The flaky test, `visual-breakpoints` desktop-1440 under the mobile project, passed on retry
  and does not open a dialog.
- **Rendered review** at 1440 and 390: every dialog has the 75% scrim, a 30/24px title and focus on Close
  (on the sheet for the blocking prompt). The certificate preview, unlock slip and board were captured
  on a temporary preview route that was never committed. The legal prompt needs a live session, so its
  shell was checked on a replica.

Evidence, in [`evidence/dialog-system-20261102/`](./evidence/dialog-system-20261102/):

- [sign-in at 1440](./evidence/dialog-system-20261102/sign-in-1440.webp) and [at 390](./evidence/dialog-system-20261102/sign-in-390.webp);
- [sample certificate](./evidence/dialog-system-20261102/sample-certificate-1440.webp);
- [unlock slip at 1440](./evidence/dialog-system-20261102/unlock-slip-1440.webp) and [at 390](./evidence/dialog-system-20261102/unlock-slip-390.webp);
- [certificate preview](./evidence/dialog-system-20261102/certificate-preview-1440.webp);
- [before/after board](./evidence/dialog-system-20261102/before-after-board-1440.webp).

## Not changed

- The certificate preview's toolbar has two signal-orange actions: Print and Connect with builders.
  The one-orange-action rule says one of them should step down. Which one is a product call.
- The fine-tune drawer stays a vaul drawer, because dragging is its interaction. Only its backdrop moved
  to `lot-scrim`.

## Reported shadow correction

The sign-in regression in `e2e/design-system.spec.ts` fails against the original live desktop dialog's
`12px 16px` paper shadow and passes against the corrected production build. The focused unit suite
passes 56 tests; the desktop/mobile design-system browser suite passes 22 tests (2 platform skips).
Rendered checks confirm one dialog, no exterior shadow and no horizontal overflow at 1440, 390 and
320px. Updated screenshots:
[desktop](./evidence/dialog-shadow-20261102/sign-in-1440.png),
[phone](./evidence/dialog-shadow-20261102/sign-in-390.png),
[small phone](./evidence/dialog-shadow-20261102/sign-in-320.png).
