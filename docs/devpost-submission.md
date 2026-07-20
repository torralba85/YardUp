# OpenAI Build Week 2026 submission

**Official rules:** [openai.devpost.com/rules](https://openai.devpost.com/rules)
**Submission deadline:** July 21, 2026 at 5:00 PM Pacific
**Recommended track:** Apps for Your Life

LotFoundry existed before the submission window. Only work meaningfully added
during the July 13–21 Build Week window should be presented as the eligible
extension.

## Existing baseline before July 13

- Browser-based ADU feasibility studio with deterministic parcel, zoning,
  coverage, cost, rent, NOI, and payback calculations.
- 3D parcel visualization, Firebase auth and persistence, builder marketplace,
  Stripe checkout, reports, PWA support, and initial AI panels.

## Build Week extension

The dated `master` history provides the primary evidence:

- `fe26bfe`–`c755b1b` (July 13): AI and auth integration work landed from the
  preserved local implementation branch.
- `eab5e7b` (July 16): account, feedback, deletion, and commerce flows hardened.
- `f059f5d` and `0727519` (July 16): native store verification and Firebase CI
  were made fail-closed.
- `08e1ee5` (July 16): the five-reveal mobile journey and address-specific
  market data landed.
- `c76f936` (July 17): mobile safe-area/touch-target fixes and the Android
  upload-key Digital Asset Link landed.
- The public-release cleanup updates active OpenAI routes to GPT-5.6 Sol,
  removes generated repository clutter, and adds repeatable public/Android
  validation.

## How Codex and GPT-5.6 are used

Codex was used to inspect and reconcile multiple worktrees, design and implement
launch work, write regression coverage, validate Firebase packaging, audit the
mobile experience, and prepare the repository for judging. Human decisions
remain explicit for product scope, visual direction, licensing posture, store
signing, privacy/legal review, and release approval.

The app uses the OpenAI Responses API for the authenticated project brief,
deterministic permit-tool orchestration, structured output, photo style
analysis, and image-generation tool flow. Active defaults are
`gpt-5.6-sol`; environment overrides remain available. Deterministic feasibility
calculations remain the source of truth, and AI output is labeled as conceptual.

## Submission checklist

- [x] Working web demo available at
  [yardup-2026.web.app](https://yardup-2026.web.app).
- [x] README distinguishes the pre-existing baseline from Build Week work and
  explains the Codex/GPT-5.6 collaboration.
- [x] Repository includes an evaluation license and secret-safe setup template.
- [x] Demo mode lets judges test core feasibility without private API keys.
- [ ] Make the repository public, or keep it private and share it with
  `testing@devpost.com` and `build-week-event@openai.com`.
- [ ] Record a public YouTube demo under three minutes with audio, covering the
  product, Build Week work, and Codex/GPT-5.6 usage.
- [ ] Run `/feedback` in the primary Codex build task and place that Codex
  Session ID in the Devpost form.
- [ ] Add the final repository URL, live demo URL, video URL, testing
  instructions, screenshots, and English project description to Devpost.
- [ ] Confirm all third-party APIs, images, fonts, and dependencies are used
  under appropriate terms.
- [ ] Keep the web demo free and accessible through the judging period ending
  August 5, 2026.

## Android release boundary

The repository contains a TWA configuration, upload-key fingerprint, Play
Billing routing, and server-side purchase verification. It does not yet contain
a generated/signed AAB or the Play App Signing fingerprint. Run:

```bash
npm run android:validate
npm run android:validate:release
```

The first command validates checked-in configuration. The release command is
expected to fail until the generated Bubblewrap project, Play signing
fingerprint, and final manifest screenshots exist.

## Devpost field draft

**Project name:** LotFoundry

**Elevator pitch:** Turn any backyard into a clear ADU decision: what fits, what
it earns, what could block it, and what to do next.

**Built with:** OpenAI, GPT-5.6 Sol, Codex, Responses API, Next.js, React,
TypeScript, Three.js, React Three Fiber, Firebase, Firestore, Stripe, Regrid,
Google Maps, Playwright, Vitest, PWA, Trusted Web Activity

**Try it:** [yardup-2026.web.app](https://yardup-2026.web.app)

**Code:** [github.com/torralba85/YardUp](https://github.com/torralba85/YardUp)

**Judge instructions:** Open the live app and choose Seattle, Portland, or Austin
to use the complete feasibility journey without private API keys or payment.
Move and resize the ADU, compare the financial and rule signals, and open the
certificate. Live address, authenticated AI, cloud-save, and purchase paths
depend on configured third-party services; missing configuration degrades to an
honest setup state rather than fabricated results.

### Project story

## Inspiration

ADUs are a big deal for homeowners — extra rental income, a place for family,
added property value. But when you actually try to figure out if you can build
one, everything is scattered. Zoning docs on one site, cost calculators on
another, contractors telling you different things. I got frustrated trying to
answer the basic question: "is this even worth pursuing on my lot?"

That's the question LotFoundry answers.

## What it does

You give LotFoundry an address (or use a demo one). It pulls the property data
and walks you through five things:

- **Find** — what your lot actually looks like on paper.
- **Earn** — realistic rent, income, and payback numbers for your area.
- **Shape** — drag an ADU around your lot in 3D, watch setbacks update in real
  time.
- **Check** — the zoning and permit questions you'll hit.
- **Act** — a shareable feasibility report you can hand to a builder.

If you're signed in, you can save runs, get an AI-written summary of your
parcel and permit situation, and even upload a photo of your house to get an
ADU concept that matches its style. The math is deterministic — the AI just
explains what the numbers mean, it doesn't change them.

## What changed during Build Week

LotFoundry already existed before Build Week (I'd been working on it for
months), so I used the week to finish loose ends. In seven days I:

- Finished the account settings, support, and account-deletion flows.
- Added explicit consent for the AI photo feature — I felt weird shipping
  without it.
- Wired up Stripe purchases with server-side receipt verification.
- Got the Android TWA wrapper and iOS shell to a state where they'll actually
  build for the stores.
- Rebuilt the mobile studio around the five-step journey above (it was messy
  before).
- Localized the market estimates so they aren't just Bay Area numbers.
- Migrated the OpenAI calls to gpt-5.6-sol.
- Set up release automation and a public-repo checklist so I couldn't
  accidentally ship a secret.

## How we built it

Stack: Next.js 16, React 19, TypeScript, Firebase (auth, Firestore, hosting,
functions), Three.js + React Three Fiber for the 3D lot view, Regrid for parcel
data, Google Maps, Stripe.

The feasibility engine is deterministic — same inputs always give the same
numbers out. No AI in that path.

The AI parts use OpenAI's Responses API with gpt-5.6-sol, structured outputs,
and a bounded tool loop. There's a parcel/permit tool the model can call to
bring in local jurisdiction info. The style-match feature uses image
understanding + image generation, only after the user opts in.

## How Codex helped

Codex was like a really fast pair-programmer. I'd give it a task — "figure out
why the deploy is failing" or "add server-side receipt verification for
Stripe" — and it would dig through the code, propose a fix, and often catch
things I would've missed. It wrote most of the regression tests. It walked me
through why my TWA config wasn't the same as a store-signed AAB. I didn't know
the difference before.

The product and design decisions were still mine. Codex made me faster, not
different.

## Challenges

The hardest part was keeping three kinds of information from bleeding into
each other: real recorded data (parcel dimensions, zoning), estimates the code
calculates (rent, payback), and things the AI generates (explanations, concept
images). Homeowners will trust the wrong number if you don't visually separate
them.

Two runners-up: making the 3D studio actually usable on a phone screen (it
kept feeling like a spreadsheet), and making the demo mode good enough to show
the product off without pretending demo parcels are real data.

## Accomplishments that we're proud of

Honestly, I'm just proud that this feels like a single product now instead of
a pile of calculators taped together. An address goes in, and the person walks
out with a 3D model, real numbers, permit context, an AI-drafted concept, and a
report they can share. That was the goal.

The other thing I care about: the trust layer. Explicit consent for AI, export
and delete your data, honest fallbacks when a feature isn't configured, real
receipt verification on the server side. No dark patterns.

## What we learned

Homeowners don't need more data. They need to know which number to trust.
Separating "recorded fact" from "our estimate" from "AI-generated" ended up
mattering more than the numbers themselves. When people can tell what kind of
answer they're looking at, they trust the tool.

## What's next for LotFoundry

Get the Android version signed and into internal testing on Play. Ship real
store assets. Expand parcel coverage past the current cities. Test purchase
restoration on actual iOS/Android devices. Start onboarding real builders so
the "builder connect" side has someone on the other end.

## Three-minute demo outline

- **0:00–0:15 — Hook:** “Before paying for plans, know what your backyard can
  support and what could stop it.”
- **0:15–0:35 — Find:** choose a demo parcel or address and show the evidence
  boundary.
- **0:35–1:15 — Earn and Shape:** reveal localized economics, resize/move the ADU,
  and show the 3D lot responding.
- **1:15–1:45 — Check:** show setbacks, coverage, permit risks, and the
  AI-generated parcel/permit brief.
- **1:45–2:10 — Act:** open the Certificate of Feasibility and builder handoff.
- **2:10–2:35 — Build Week:** flash the dated commit evidence and the mobile,
  trust, commerce, Android, and GPT-5.6 additions.
- **2:35–2:55 — Codex:** show a real Codex task, regression check, and one human
  decision point.
- **2:55–3:00 — Close:** “LotFoundry turns backyard uncertainty into a decision
  you can act on.”
