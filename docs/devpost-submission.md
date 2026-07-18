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

Accessory dwelling units can add housing, rental income, and flexibility to a
property, but the first step is needlessly fragmented. Homeowners bounce between
zoning documents, parcel maps, cost calculators, design inspiration, and
contractor conversations before they can answer a basic question: is this worth
pursuing?

We built LotFoundry to turn that uncertainty into one visual, evidence-aware
decision journey.

## What it does

LotFoundry starts with an address or a built-in demo parcel and organizes the
decision into five reveals: **Find, Earn, Shape, Check, and Act**.

- Find the parcel and its recorded context.
- Earn with localized cost, rent, NOI, and payback estimates.
- Shape an ADU concept directly on an interactive 3D lot.
- Check setbacks, lot coverage, zoning signals, and permit questions.
- Act with a shareable Certificate of Feasibility and a builder handoff.

Authenticated users can save scenarios, request an AI parcel-and-permit brief,
and create a style-matched ADU concept from a consented home photo. The
deterministic feasibility engine remains the source of truth; AI explains and
organizes the evidence instead of silently changing the numbers.

## What changed during Build Week

LotFoundry existed before July 13, so we treated Build Week as a real product
extension rather than a relabeling exercise. The dated commit history shows the
new work:

- completed account settings, support, feedback, export, and deletion flows;
- added explicit AI-photo consent and current legal/privacy surfaces;
- built web, StoreKit, and Play Billing purchase routing with server-side,
  idempotent receipt verification;
- prepared Android TWA and iOS shell configuration;
- redesigned the mobile studio into the five-reveal homeowner journey;
- localized market estimates and strengthened responsive/accessibility QA;
- migrated authenticated OpenAI workflows to GPT-5.6 Sol defaults; and
- added public-repository, release, and Android validation.

## How we built it

The app uses Next.js 16, React 19, TypeScript, Firebase Hosting and Functions,
Firebase Auth and Firestore, Three.js with React Three Fiber, Regrid parcel data,
Google Maps, and Stripe.

The core feasibility engine is deterministic: parcel dimensions, setbacks,
coverage, ADU geometry, construction assumptions, rent, and operating costs
produce reproducible outputs. The authenticated AI pipeline uses the OpenAI
Responses API with GPT-5.6 Sol, structured outputs, and a bounded tool loop. A
parcel/permit tool joins jurisdiction context to the project brief, while the
style-match path uses image understanding and image generation after explicit
user consent.

## How Codex helped

Codex worked as an engineering collaborator across the repository: tracing
behavior through multiple worktrees, implementing release slices, writing
regression tests, validating Firebase packaging, reviewing mobile layouts, and
auditing the public repository. Codex also helped expose uncomfortable release
truths—such as the difference between a valid TWA configuration and a signed,
store-tested AAB—instead of papering over them.

The human owner made the product, design, architecture, legal, licensing,
privacy, and release decisions. Codex accelerated implementation and evidence
collection; it did not make the final submission or store-release decision.

## Challenges

The hardest problem was keeping three kinds of truth separate:

1. recorded parcel and jurisdiction data;
2. deterministic estimates and geometry; and
3. generative explanation and concepts.

We also had to keep a dense 3D workspace usable on small phones, make
store-specific purchases fail closed, and support a convincing no-key demo
without pretending the demo parcels are live data.

## Accomplishments

We are proud that LotFoundry now feels like a coherent homeowner journey rather
than a collection of calculators. It connects an address, spatial design,
financial evidence, risk signals, AI explanation, a portable certificate, and a
next action in one product.

We are equally proud of the trust layer: explicit consent, export and deletion,
honest fallbacks, server-side purchase verification, and clear release gates.

## What we learned

Homeowners rarely need another wall of raw data. They need a legible distinction
between what is known, what is estimated, what is generated, and what must be
confirmed locally. AI is most useful here when it translates and connects
evidence while deterministic systems keep authority over the math.

## What's next

Next we will complete Play App Signing and internal-track Android testing,
capture final store assets, expand nationwide jurisdiction coverage, validate
native purchase restoration and revocation on real devices, and onboard the
first verified builder network.

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
