import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | LotFoundry",
  description: "Terms governing your use of LotFoundry.",
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-lf-muted">Last updated: May 31, 2026</p>

        <div className="mt-10 space-y-8">
          <Section title="1. Acceptance of Terms">
            By accessing or using LotFoundry (&ldquo;the Service&rdquo;), you agree to be bound
            by these Terms of Service. If you do not agree, do not use the Service.
          </Section>

          <Section title="2. Description of Service">
            LotFoundry provides ADU (Accessory Dwelling Unit) feasibility analysis tools,
            including parcel visualization, zoning analysis, cost estimation, and rental income
            projection. All outputs are estimates only and are not a substitute for professional
            engineering, architectural, legal, or financial advice.
          </Section>

          <Section title="3. No Professional Advice">
            The estimates, projections, and information provided by LotFoundry are for
            informational purposes only. They do not constitute professional engineering,
            architectural, legal, zoning, financial, or any other professional advice. You
            should consult licensed professionals before making decisions based on information
            from the Service. LotFoundry explicitly disclaims any liability for decisions made
            based on Service output.
          </Section>

          <Section title="4. User Accounts">
            <>
              You must provide accurate information when creating an account. You are responsible
              for maintaining the confidentiality of your credentials and for all activity under
              your account. Notify us immediately at{" "}
              <a href="mailto:support@lotfoundry.com" className="text-lf-clay hover:text-lf-mahogany">
                support@lotfoundry.com
              </a>{" "}
              if you suspect unauthorized access.
            </>
          </Section>

          <Section title="5. Acceptable Use">
            You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to
            gain unauthorized access to any part of the Service; (c) reverse-engineer, scrape,
            or otherwise extract data from the Service in bulk; (d) use the Service to transmit
            harmful, offensive, or infringing content; or (e) resell or sublicense access to
            the Service without written permission.
          </Section>

          <Section title="6. Intellectual Property">
            All content, trademarks, and software comprising the Service are owned by or
            licensed to LotFoundry. Nothing in these Terms transfers any intellectual property
            rights to you. You retain ownership of any data you upload or create in the Service.
          </Section>

          <Section title="7. Data Accuracy">
            Parcel data, zoning information, and aerial imagery are sourced from third-party
            providers and public records. LotFoundry does not warrant the accuracy,
            completeness, or timeliness of this data. Always verify information with local
            authorities before acting on it.
          </Section>

          <Section title="8. Disclaimer of Warranties">
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
            warranty of any kind, express or implied, including merchantability, fitness for a
            particular purpose, or non-infringement. LotFoundry does not warrant that the
            Service will be uninterrupted or error-free.
          </Section>

          <Section title="9. Limitation of Liability">
            To the maximum extent permitted by applicable law, LotFoundry shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages arising
            from your use of the Service, even if advised of the possibility of such damages.
            Our total liability to you for any claim shall not exceed the amount you paid us
            in the twelve months preceding the claim, or $100, whichever is greater.
          </Section>

          <Section title="10. Changes to Terms">
            We may revise these Terms at any time. Continued use of the Service after changes
            are posted constitutes acceptance of the revised Terms. We will provide notice of
            material changes by email or prominent notice on the Service.
          </Section>

          <Section title="11. Governing Law">
            These Terms are governed by the laws of the State of California, without regard to
            conflict-of-law provisions. Disputes shall be resolved in the courts of Los Angeles
            County, California.
          </Section>

          <Section title="12. Contact">
            <>
              Questions about these Terms? Email us at{" "}
              <a href="mailto:legal@lotfoundry.com" className="text-lf-clay hover:text-lf-mahogany">
                legal@lotfoundry.com
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
