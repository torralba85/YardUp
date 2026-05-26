# Store Review Notes

YardUp is an offline-first ADU feasibility planning app for homeowners. The customer-facing brand is **YardUp**; the legal entity and store account is **ADU Advisor**. Native bundle identifiers remain `com.aduadvisor.app` on iOS and Android to preserve store listing continuity through the rebrand.

The app can be reviewed without creating a traditional account. Firebase anonymous authentication is used only to protect cloud-backed writes (quote requests and product feedback).

## Backend state during review

Backend services are live during review and target the Firebase project `yardup-2026`:

- Firebase Functions region: us-central1
- Regulation guide: source-cited seeded guide for covered jurisdictions and a labeled `local-review` verification state elsewhere
- Design concept: deterministic fallback if Gemini is unavailable
- Property history: fallback verification records until a municipal provider is connected
- Quote request: consent-required authenticated anonymous Firestore outreach write; server-recorded submissions and saved offline retries are not marked delivered
- Feedback: authenticated anonymous Firestore write, rate-limited per user

## Reviewer walkthrough

1. Open the app to the **Value** tab and start a property study using the address control. The first viewport shows monthly rent, net annual income, cost range, payback, builder matches, and quote packet readiness.
2. Open **Studio** (ideas tab) and move or rotate the ADU footprint inside the buildable zone.
3. Tap **Generate concept** to produce a design concept. If Gemini is unavailable the deterministic fallback still returns a usable result.
4. Open **Estimate** and confirm gross rent, expenses, net annual income, cost range, value range, payback, and sensitivity assumptions update together.
5. Open **Builders** (contractors tab) and view matched builders with license/insurance signals.
6. Choose **Consent and submit packet** for a matched builder to exercise the authenticated callable. The current backend records the consented outreach as delivery pending; a local retry is labeled saved. Neither state is commercially eligible.
7. Open **Permits** (guide tab) to review risk level, blockers, and source citations.
8. Tap the floating feedback control to send a short feedback message. The submission is rate-limited.

## Guided onboarding

New users see the guided ADU stepper wizard before reaching the Value tab. The wizard collects address, lot facts, and goals, then writes a local project study. Reviewers can skip the wizard from the header control if they prefer to land on Value directly.

## Important limitations

- The current release is a planning aid and does not claim official permit approval, official assessor records, contractor availability guarantees, or financial returns.
- Site photos remain on-device. The backend receives only whether a site photo exists.
- Exact addresses are sent only when the user initiates a cloud-backed action (regulation refresh, property history search, quote request).
- An address outside sourced coverage shows local verification guidance and no declared builder match rather than inheriting Los Angeles data.
- No homeowner payment collection is implemented in this release. Commercial eligibility is reserved for a future verified builder-delivery event, not the current outreach write.

## Related materials

- Privacy policy: `docs/legal/privacy-policy.md`
- Support: `docs/legal/support.md`
