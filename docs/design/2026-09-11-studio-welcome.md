# Studio welcome and required sign-in

Guests opening `/studio` now see a short introduction to LotFoundry, an
illustrative backyard-home concept, and three steps explaining how the Studio
works. Both **Get started** and **Sign in** open the existing authentication
dialog. Closing that dialog keeps the workspace locked.

Returning authenticated owners enter directly. Builders continue to their
dashboard. Signing out unmounts the workspace and restores the introduction.
Shared scenario parameters and private session-storage property handoffs survive
authentication; address text is never accepted from query parameters.

## Verification

On September 11, lint, TypeScript, and the production Next.js build passed.
Production Playwright coverage passed 33 tests with 15 expected device-specific
skips. Coverage includes narrow-screen layout, authentication dismissal and focus,
shared scenarios, pending-property handoff, sign-out, address retry, the mobile
journey, and desktop navigation.

The browser authentication fixture intercepts Firebase responses and blocks
unmocked Google and application API requests. It creates no production account
and sends no synthetic token to a live service.

Local review artifacts are retained in `qa-artifacts/studio-welcome/`:
`desktop-production.png`, `mobile-production.png`, and `browser-resume.log`.
The full unit-suite result is recorded in the pull request after completion.

## Release boundary

This is a hosted-web change. Building or testing it locally does not update the
Android app's hosted content. Merge and successful master deployment are required
before the new welcome is live. The separate code-10 Android sandbox-purchase
verification is recorded in the shared Obsidian release page.
