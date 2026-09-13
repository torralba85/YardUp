# Web Interface Guidelines repairs

Implements the 26 source findings in the September 13 review (`LotFoundry/artifacts/web-interface-guidelines-review-2026-09-13.md`). Uses the existing A LOT MORE palette, controls and layout.

| Surface | Result |
| --- | --- |
| Studio reset and saved concepts | Native confirmation names the destructive action; cancel preserves current work. Firestore deletion runs only after confirmation. |
| Security settings | Persistent labels, inline field errors, invalid-state associations and first-error focus. |
| Profile and feedback | Carbon keyboard focus replaces low-contrast orange focus. |
| Auth, desktop Studio and builder | Main landmarks provide the root skip-link target. |
| Sign-in modal | Contains overscroll and locks background scrolling for its open lifetime. |
| Saved-concept list | Load buttons have a 44px hit height. |
| Photo uploader | Hidden input belongs to its visible focus-styled label; progress and errors are announced. Replacing a photo uses the existing consent flow. |
| Shared sliders and aerial fallback | Carbon thumb boundaries and dark-surface muted text meet the respective contrast floors. |
| Builder inbox | Status filters use grouped pressed buttons. Filter, display mode, selected lead and page restore from the URL and browser history. At most 20 cards or rows render per page. |
| Feedback | Submit explains the 10-character minimum and focuses invalid content. Message drafts persist in this tab's session storage, scoped by authenticated user or guest; successful submission clears the draft. |
| Password reset | Errors are announced and associated with the email field; success receives focus. |
| Mobile fine-tune drawer | Opening focuses Close without requesting the keyboard; closing returns focus to the opener. |
| Builder profile | Field validation is associated and focused; active-status label has a 44px target; save uses the shared loading spinner. |

Inbox pagination bounds rendered UI, not the existing Firestore query: full inbox data still feeds totals and filters. No contact/address information is added to URLs, and existing unlock checks remain authoritative. Feedback stores only the message draft, not credentials or reply email; when storage is unavailable, unloading an unsent message triggers the browser safeguard.

Regression coverage includes cancellation before reset/deletion, field validation and focus, draft restoration/clearing, URL restoration and pagination, photo replacement, modal scroll locking, password-reset confirmation, and desktop/mobile keyboard checks. Release validation is recorded with the delivery handoff; these changes do not themselves publish a release.

## Local validation, September 13

- Production build, TypeScript and repository lint passed; `git diff --check` passed.
- Full unit run: 1,165 passed, 21 skipped, five failures caused by tests using the previous inbox tab semantics and photo replacement flow. After updating those tests, all 26 tests in the six-file focused rerun passed. The full suite was not repeated after those test corrections.
- Browser coverage: design-system, mobile-studio, ux-audit-followup and web-guidelines suites ran against the production build. Initial run: 37 passed, 11 skipped, one signup navigation timeout passed on retry, and three failures in new test selectors. Corrected feedback selectors and expanded the uploader section; rerun: eight passed, one skipped, one failure from an incorrect focus-shadow assertion. The uploader's 2px ring plus 2px offset correctly produces a 4px shadow spread; after correcting that expectation, the remaining uploader/reset/skip test passed. No unresolved failures in these selected suites.
- Logs: `LotFoundry/artifacts/web-guidelines-{unit-tests,rerun,build,types,lint-final,browser,browser-rerun,browser-upload}.log`.
- Local and uncommitted on `fix/web-interface-guidelines-20260913`; no CI run, deployment, real account mutation or assistive-technology/device validation is claimed.
