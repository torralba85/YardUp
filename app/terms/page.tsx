import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms & Conditions | LotFoundry",
  description: "Terms governing your use of LotFoundry (Terms of Service).",
  alternates: { canonical: "/terms" },
};

/**
 * Terms & Conditions — canonical `/terms` agreement (same as Terms of Service).
 */
export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" kicker="Last updated: August 26, 2026">
      <LegalSection title="1. Acceptance">
        <p>
          By accessing LotFoundry (“the Service”), you agree to these Terms &amp; Conditions
          (also referred to as Terms of Service). If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>
          LotFoundry provides ADU feasibility tools: parcel visualization, zoning and cost
          estimates, rental income projections, AI concept imagery (optional), Certificates of
          Feasibility, and a builder lead marketplace. All financial and feasibility outputs are
          estimates only and are not engineering, architectural, legal, zoning, or financial advice.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <p>
          You must be at least 18 years old and legally able to enter a binding contract. If you
          use the Service for a company, you represent that you have authority to bind it.
        </p>
      </LegalSection>

      <LegalSection title="4. Accounts">
        <p>
          You must provide accurate information. You are responsible for credentials and activity
          under your account. Notify{" "}
          <a href="mailto:support@lotfoundry.net" className="font-medium text-lf-clay-ink underline">
            support@lotfoundry.net
          </a>{" "}
          of unauthorized access. You may delete your account via Settings or{" "}
          <Link href="/delete-account" className="font-medium text-lf-clay-ink underline">
            /delete-account
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Purchases &amp; Billing">
        <p>
          Web digital purchases use Stripe Checkout. iOS App Store and Android Play builds use
          platform billing for digital goods (certificates and lead credits). Fees are disclosed
          at checkout. Refunds and credits follow store policy and our support process; contact
          support for billing issues. Demo environments may grant unlocks without payment.
        </p>
      </LegalSection>

      <LegalSection title="6. Marketplace">
        <p>
          Homeowners control when to share a lead. Builders pay to unlock contact details. Lead
          quality is not guaranteed. Misuse, spam, or resale of personal data is prohibited.
        </p>
      </LegalSection>

      <LegalSection title="7. AI Concepts">
        <p>
          AI-generated ADU concepts are illustrative only. You must consent before a photo is sent
          to OpenAI. Do not upload photos of others without rights/permission.
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable Use">
        <p>
          You agree not to: use the Service unlawfully; attempt unauthorized access; reverse
          engineer or bulk-scrape; transmit harmful or infringing content; or resell access without
          written permission.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual Property">
        <p>
          Service software, brand, and content are owned by or licensed to LotFoundry. You retain ownership of data you upload. You grant LotFoundry a limited, non-exclusive license to host, process, reproduce, and transmit that data only as needed to operate, secure, and support the Service and the sharing you request. You represent that you have the rights and permissions needed for anything you upload.
        </p>
      </LegalSection>

      <LegalSection title="10. Data Accuracy">
        <p>
          Parcel, zoning, imagery, rent, and cost data come from third parties and models that may
          be incomplete or outdated. Always verify with local authorities and licensed
          professionals before building or investing.
        </p>
      </LegalSection>

      <LegalSection title="11. Disclaimers &amp; Liability">
        <p>
          THE SERVICE IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT
          PERMITTED BY LAW, LOTFOUNDRY IS NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
          DAMAGES, OR FOR DECISIONS MADE BASED ON ESTIMATES.
        </p>
      </LegalSection>

      <LegalSection title="12. Suspension &amp; Termination">
        <p>
          We may suspend or terminate access for fraud, unlawful conduct, payment abuse, threats
          to the Service, or material violation of these terms. You may stop using the Service and
          delete your account at any time. Provisions concerning payments, intellectual property,
          disclaimers, liability, and records that must lawfully be retained survive termination.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>
          We may update these terms by changing the “Last updated” date. Continued use after
          changes constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          <a href="mailto:support@lotfoundry.net" className="font-medium text-lf-clay-ink underline">
            support@lotfoundry.net
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
