import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | LotFoundry",
  description: "How LotFoundry collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-lf-sand text-lf-espresso">
      <header className="border-b border-lf-hairline/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-lf-mahogany font-display font-semibold text-xs text-lf-sand">
              LF
            </div>
            <span className="font-display font-semibold text-lf-mahogany">LotFoundry</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-prose px-6 py-16">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-lf-espresso">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-lf-muted">Last updated: May 31, 2026</p>

        <div className="mt-10 space-y-8">
          <Section title="1. Information We Collect">
            We collect information you provide directly when you create an account (name, email address,
            password), the role you select (homeowner or builder), and the parcel addresses and ADU
            configurations you save in the studio. We also collect standard server logs (IP address,
            browser type, pages visited) to operate and improve the service.
          </Section>

          <Section title="2. How We Use Your Information">
            We use the information we collect to provide and improve LotFoundry, authenticate your
            account, save your feasibility studies, send transactional emails (password reset,
            account notices), and understand how the service is used. We do not sell your personal
            information to third parties.
          </Section>

          <Section title="3. Data Storage and Security">
            Your data is stored in Google Firebase (Firestore and Firebase Authentication), which
            provides encryption at rest and in transit. We apply reasonable technical and
            organizational measures to protect your information. No method of transmission over the
            internet is 100% secure; we cannot guarantee absolute security.
          </Section>

          <Section title="4. Third-Party Services">
            LotFoundry uses the following third-party services that may receive your data: Google
            Firebase (authentication and data storage), Google Maps / aerial imagery APIs (parcel
            display), and Vercel (hosting and edge delivery). Each of these services has its own
            privacy policy.
          </Section>

          <Section title="5. Cookies">
            We use session cookies to keep you signed in and local storage to persist your studio
            state across page refreshes. We do not use third-party advertising cookies.
          </Section>

          <Section title="6. Your Rights">
            You may request access to, correction of, or deletion of your personal data at any
            time by contacting us at the address below. You may also delete your account directly
            from your account settings.
          </Section>

          <Section title="7. Children&apos;s Privacy">
            LotFoundry is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe a child has provided us with
            personal information, please contact us so we can delete it.
          </Section>

          <Section title="8. Changes to This Policy">
            We may update this policy from time to time. We will notify you of material changes
            by updating the &ldquo;Last updated&rdquo; date above and, where appropriate, by email.
          </Section>

          <Section title="9. Contact">
            <>
              Questions about this policy? Email us at{" "}
              <a href="mailto:privacy@lotfoundry.com" className="text-lf-clay hover:text-lf-mahogany">
                privacy@lotfoundry.com
              </a>.
            </>
          </Section>
        </div>
      </main>

      <footer className="border-t border-lf-hairline/50">
        <div className="mx-auto max-w-4xl px-6 py-8 text-center text-sm text-lf-muted">
          <Link href="/" className="hover:text-lf-espresso">LotFoundry</Link>
          {" · "}
          <Link href="/terms" className="hover:text-lf-espresso">Terms</Link>
          {" · "}
          <Link href="/privacy" className="hover:text-lf-espresso">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-lf-espresso">{title}</h2>
      <div className="mt-3 leading-relaxed text-lf-muted">{children}</div>
    </div>
  );
}
