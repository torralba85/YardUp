import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferences } from "@/components/analytics/CookiePreferences";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | LotFoundry",
  description: "How LotFoundry collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy Policy — canonical `/privacy` disclosure matching deployed
 * infrastructure (Firebase, Regrid, Census, USA Structures, OpenAI, Stripe, GA4).
 */
export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" kicker="Last updated: September 17, 2026">
      <LegalSection title="1. Information We Collect">
        <p>
          We collect personal information you provide directly and data generated through your use
          of LotFoundry:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account Identifiers:</strong> Name, email address, encrypted credentials, or
            third-party authentication tokens (Sign in with Google / Apple), and role designation
            (homeowner or builder).
          </li>
          <li>
            <strong>Property &amp; Feasibility Inputs:</strong> Searched property addresses, geographical
            coordinates (latitude/longitude), custom parcel dimensions, setback adjustments, and ADU
            configurations you design or save.
          </li>
          <li>
            <strong>Builder Profile Information:</strong> Business name, contractor license details,
            phone numbers, service regions, and trade specializations.
          </li>
          <li>
            <strong>Marketplace Connection Data:</strong> Direct contact requests submitted by
            homeowners to connect with matched builders.
          </li>
          <li>
            <strong>User Photos &amp; Visual Content:</strong> Optional photographs of your parcel or
            existing structures uploaded for AI architectural style matching.
          </li>
          <li>
            <strong>Billing &amp; Transaction Records:</strong> Transaction IDs, purchase timestamps,
            certificate identifiers, and credit balances provided by Stripe, Google Play Billing, or
            Apple App Store (we never store raw payment card numbers on our servers).
          </li>
          <li>
            <strong>Technical Telemetry &amp; Security Logs:</strong> IP address (truncated for analytics),
            user agent, device characteristics, request timestamps, and tamper-evident legal consent
            receipts (recording accepted terms and privacy policy versions).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>
          We process personal information to: (a) provide the 3D Feasibility Studio and calculate zoning
          and financial estimates; (b) authenticate your identity and safeguard your account; (c)
          generate and deliver Certificates of Feasibility and AI Project Briefs; (d) facilitate
          homeowner-directed lead unlocks for builders; (e) process payments and prevent fraud; (f)
          respond to support inquiries; and (g) comply with legal and regulatory obligations.
        </p>
        <p>
          <strong>We do not sell personal information for monetary or valuable consideration, nor do we
          share personal information for cross-context behavioral advertising.</strong> Homeowner
          contact information is disclosed to a builder only upon the homeowner’s affirmative,
          intentional direction.
        </p>
      </LegalSection>

      <LegalSection title="3. Third-Party Subprocessors &amp; Infrastructure">
        <p>
          To operate the Service, we share data with trusted third-party service providers bound by
          contractual confidentiality and data protection standards:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Cloud Infrastructure:</strong> Hosted on <em>Google Cloud Platform / Firebase</em>{" "}
            (Firebase Hosting, Cloud Functions, Firebase Authentication, and Cloud Firestore).
          </li>
          <li>
            <strong>Geocoding &amp; Spatial Data:</strong> Property searches use <em>Google Maps Platform</em>,{" "}
            <em>Regrid</em> (Loveland Technologies parcel boundaries), the <em>US Census Bureau Geocoder</em>,{" "}
            <em>USA Structures</em> (federal building footprints), and municipal GIS open data portals.
          </li>
          <li>
            <strong>Payment Gateways:</strong> Digital web purchases use <em>Stripe</em>. Mobile
            purchases use <em>Google Play Billing</em> or <em>Apple In-App Purchase</em>.
          </li>
          <li>
            <strong>Artificial Intelligence (OpenAI):</strong> We use <em>OpenAI</em> API to process
            both: (1) optional user-uploaded photos to generate architectural style-match imagery, and
            (2) parcel metrics, zoning constraints, and feasibility parameters to synthesize the
            narrative AI Project Brief and risk breakdown included with Certificates. OpenAI’s commercial
            API terms guarantee that user inputs are not used to train AI models.
          </li>
          <li>
            <strong>Usage Analytics:</strong> <em>Google Analytics 4</em> is used to measure aggregate
            product usage, strictly subject to your affirmative consent (see Section 7).
          </li>
          <li>
            <strong>Aggregate Traffic Measurement:</strong> <em>Cloudflare Web Analytics</em> counts
            page views and referrers. It is cookieless, stores nothing on your device, does not
            fingerprint visitors, and performs no cross-site tracking (see Section 7).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. AI Processing &amp; Photo Handling">
        <p>
          When you use the AI Style-Match feature, your photo is processed locally in your browser to
          downscale the image and strip all embedded EXIF, GPS location, and camera metadata prior to
          transmission. The prepared image is sent directly via encrypted API to OpenAI to produce a
          concept visualization. LotFoundry does not store raw photos on our database servers.
        </p>
        <p>
          When generating a Certificate of Feasibility, project feasibility parameters (lot size,
          calculated setbacks, jurisdiction, and target ADU dimensions) are transmitted to OpenAI to
          generate the Project Brief. Generating AI briefs or photos is never required to browse the
          studio.
        </p>
      </LegalSection>

      <LegalSection title="5. Marketplace Sharing: Consumer-Directed Disclosure">
        <p>
          Homeowner contact details (name, email, phone, and property address) are held in confidence
          and are never displayed publicly. Builders see only an anonymized, redacted preview (general
          neighborhood, lot size, and project scope) until a homeowner affirmatively submits a
          connection request.
        </p>
        <p>
          When a homeowner submits a connection request and a builder unlocks the lead, the homeowner’s
          contact information is disclosed solely at the consumer’s express direction, constituting an
          exempt consumer-directed disclosure under applicable state privacy laws (including California
          Civil Code § 1798.140(ad)(1)). Builders act as independent data controllers upon unlocking a
          lead.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention &amp; Account Deletion">
        <p>
          We retain personal information for as long as your account remains active. You may delete your
          account at any time within your{" "}
          <Link href="/settings" className="font-medium text-lf-clay-ink underline">
            Account Settings
          </Link>{" "}
          or via our public{" "}
          <Link href="/delete-account" className="font-medium text-lf-clay-ink underline">
            Delete Account
          </Link>{" "}
          portal (accessible without installing our mobile application).
        </p>
        <p>
          Upon deletion, your active profile, saved scenario studies, and contact records are permanently
          removed from active product databases. We retain transactional, accounting, tax, dispute, and
          fraud records for up to seven (7) years as required by applicable commercial and financial
          regulations, in de-identified or pseudonymized format.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies &amp; Local Storage">
        <p>
          We use strictly necessary session cookies and Firebase Authentication state to maintain your
          login session and persist local studio preferences. We do not use third-party advertising
          cookies or behavioral retargeting trackers.
        </p>
        <p>
          <strong>Google Analytics 4 (Consent Gated):</strong> We use Google Analytics 4 only if you
          affirmatively opt in. GA4 sets first-party cookies (<code>_ga</code> and <code>_ga_*</code>)
          to collect pseudonymous interaction metrics, device models, and approximate geographic regions
          derived from truncated IP addresses. Advertising personalization features are permanently
          disabled. If you decline or take no action, Google Analytics remains completely disabled, no
          Google scripts are loaded, and no <code>_ga</code> cookies are set.
        </p>
        <p>
          <strong>Cloudflare Web Analytics (Not Consent Gated):</strong> Separately, we use Cloudflare
          Web Analytics to count page views and referrers. It is not covered by the control below
          because it never stores anything on your device: no cookies, no local storage, and no device
          fingerprinting. It cannot follow you to other sites, and it collects none of the interaction
          detail GA4 does. Consent gates exist to protect access to your device&rsquo;s storage, and
          this measurement never touches it.
        </p>
        <p>You can modify your Google Analytics consent settings at any time below:</p>
        <CookiePreferences />
      </LegalSection>

      <LegalSection title="8. Minor Protection &amp; Age-Assurance Governance">
        <p>
          The Service is strictly designed and intended for adults aged 18 and older. We do not
          knowingly collect, maintain, or profile personal information from minors under the age of 18,
          and the Service is rated 18+ in mobile application stores.
        </p>
        <p>
          In accordance with the <strong>Texas App Store Accountability Act (HB 18)</strong>,{" "}
          <strong>California AB 1043</strong>, and the <strong>Amended COPPA Rule (2026)</strong>, we
          respect platform age signals, prohibit targeted marketing to minors, and do not knowingly
          collect data from children under 13. If we discover that personal data from a child under 13
          has been inadvertently collected, it will be deleted immediately.
        </p>
      </LegalSection>

      <LegalSection title="9. State Privacy Rights &amp; Appeals">
        <p>
          Depending on your state of residence (including California, Virginia, Colorado, Connecticut,
          Texas, Utah, and Oregon), you may have the following statutory rights:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>The right to know and access personal information we hold about you.</li>
          <li>The right to request deletion of your personal information.</li>
          <li>The right to correct inaccurate personal data.</li>
          <li>The right to receive a portable copy of your data.</li>
          <li>The right to opt out of automated profiling or targeted advertising (which we do not conduct).</li>
          <li>The right to freedom from discrimination for exercising your privacy rights.</li>
        </ul>
        <p>
          <strong>Submitting Requests &amp; Appeals:</strong> To exercise any privacy right, email{" "}
          <a href="mailto:privacy@lotfoundry.net" className="font-medium text-lf-clay-ink underline">
            privacy@lotfoundry.net
          </a>
          . We will verify your identity and respond within forty-five (45) days. If your request is
          denied, you have the right to appeal our decision by emailing{" "}
          <a href="mailto:privacy@lotfoundry.net" className="font-medium text-lf-clay-ink underline">
            privacy@lotfoundry.net
          </a>{" "}
          with the subject line <em>“Privacy Appeal”</em>.
        </p>
      </LegalSection>

      <LegalSection title="10. Policy Updates">
        <p>
          We may update this Privacy Policy periodically to reflect changes in our legal obligations or
          system architecture. We will post revised versions with an updated “Last updated” date. For
          material changes, we will provide additional notice on our website or via email.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact Information">
        <p>
          For privacy inquiries or data requests, contact our Privacy Team at:{" "}
          <a href="mailto:privacy@lotfoundry.net" className="font-medium text-lf-clay-ink underline">
            privacy@lotfoundry.net
          </a>
          . For general support:{" "}
          <a href="mailto:support@lotfoundry.net" className="font-medium text-lf-clay-ink underline">
            support@lotfoundry.net
          </a>
          .
        </p>
        <p className="lf-caption text-lf-muted mt-2">
          LotFoundry LLC · Legal &amp; Privacy Compliance
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
