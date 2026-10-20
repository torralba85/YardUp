# Studio free preview and certificate boundary

Andrew selected this boundary on October 18, 2026: the free Studio shows an interactive 3D concept and the monthly rent range. Paid metrics use the existing blurred-preview treatment, with placeholders instead of real figures in the markup.

- Rent spans the engine's conservative and optimistic scenarios for the current bedroom class. It is a scenario range, not a statistical confidence interval.
- Build cost, annual net income, payback, financing outcomes, readiness, and the detailed planning breakdown require the active property's purchased certificate grant. Signing in alone does not unlock them.
- The offer names what is included and preserves the existing price, one-time purchase terms, permanent property access, checkout, and recovery flow.
- Keep a concise estimate notice and rent source visible. Known model conflicts remain visible before purchase; an estimated model does not establish zoning compliance or permit approval.
- Desktop tabs, the mobile journey and fine-tune drawer, the certificate preview, and scene capacity details use the same boundary. Purchased studies retain their full analysis and exports.

This is a Studio presentation boundary. The deterministic engine still runs in the client; it is not a new server-side authorization boundary. Existing server checks continue to protect paid certificate access and AI interpretation. Public example certificates and educational city pages remain examples of the product.

Implementation: `components/studio/StudioPreview.tsx`, `components/FeasibilityStudio.tsx`, and `components/studio/CertificatePanel.tsx`. Regression coverage includes free/purchased component tests and `e2e/studio-paid-preview.spec.ts` for desktop and mobile.

## Email capture placement - October 20, 2026

Andrew chose a collapsed secondary action below the Certificate offer. The flow is
3D exploration and rent preview, then the Certificate purchase decision, then
"Email this layout for later" for visitors who want to return. The email form no
longer appears in the desktop Rules & Fit rail or the mobile Earn reveal.

Use the existing chalk, carbon, stone and drafting-line tokens, Manrope body type,
and a 48px disclosure row. Keep signal orange for the primary Certificate action.
The form opens on request and preserves its input, optional unchecked marketing
choice, error handling and copy-link fallback. Demo, estimated, saved and purchased
properties keep their existing exclusions.

The free email contains the property address and saved-layout link, followed by a
short $29 Certificate offer and a link to its purchase step. Do not print build
cost, rent, cash flow or fee findings in this return email. The existing Studio
presentation boundary and paid access checks continue to apply when it is opened.

Coverage: `e2e/studio-email-link.spec.ts`, `e2e/studio-desktop-layout.spec.ts`,
`components/studio/FeasibilityStudio.test.tsx` and
`lib/server/studio-scenario-email.test.ts`.

Review captures use a synthetic property: [desktop offer and collapsed email row](./evidence/studio-email-placement/desktop.png)
and [expanded form on a 320px phone](./evidence/studio-email-placement/mobile-320.png).
