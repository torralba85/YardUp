# Studio free preview and certificate boundary

Andrew selected this boundary on October 18, 2026: the free Studio shows an interactive 3D concept and the monthly rent range. Paid metrics use the existing blurred-preview treatment, with placeholders instead of real figures in the markup.

- Rent spans the engine's conservative and optimistic scenarios for the current bedroom class. It is a scenario range, not a statistical confidence interval.
- Build cost, annual net income, payback, financing outcomes, readiness, and the detailed planning breakdown require the active property's purchased certificate grant. Signing in alone does not unlock them.
- The offer names what is included and preserves the existing price, one-time purchase terms, permanent property access, checkout, and recovery flow.
- Keep a concise estimate notice and rent source visible. Known model conflicts remain visible before purchase; an estimated model does not establish zoning compliance or permit approval.
- Desktop tabs, the mobile journey and fine-tune drawer, the certificate preview, and scene capacity details use the same boundary. Purchased studies retain their full analysis and exports.

This is a Studio presentation boundary. The deterministic engine still runs in the client; it is not a new server-side authorization boundary. Existing server checks continue to protect paid certificate access and AI interpretation. Public example certificates and educational city pages remain examples of the product.

Implementation: `components/studio/StudioPreview.tsx`, `components/FeasibilityStudio.tsx`, and `components/studio/CertificatePanel.tsx`. Regression coverage includes free/purchased component tests and `e2e/studio-paid-preview.spec.ts` for desktop and mobile.
