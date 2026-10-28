import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferences } from "@/components/analytics/CookiePreferences";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { pageOpenGraph } from "@/lib/og-images";

const title = "Privacy Policy | LotFoundry";
const description =
  "Learn what LotFoundry collects, how property, account, payment, analytics, and AI data are used, and how to exercise your privacy rights.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: pageOpenGraph({ title, description, url: "/privacy" }),
};

/**
 * Privacy Policy — canonical `/privacy` disclosure matching deployed
 * infrastructure (Firebase, Regrid, ATTOM, Census, USA Structures, OpenAI, TypeSafe, Resend, Stripe, GA4)
 * and the homeowner-directed GreatBuildz referral (Section 5).
 */
export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" kicker="Last updated: October 27, 2026">
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
            <strong>Emailed Studio Links:</strong> When you request a 3D lot link, we save your email,
            property address, design, estimate snapshot, and optional permit-update preference to
            prepare and deliver that email. Links remain available until deleted; anyone with your
            link can view the layout and property address. Marketing updates require a separate,
            optional opt-in. Contact support@lotfoundry.net to withdraw that opt-in or delete the
            saved link and associated lead. The email is delivered by Resend (see Section 3).
          </li>
          <li>
            <strong>Marketplace Connection Data:</strong> Direct contact requests submitted by
            homeowners to connect with matched builders.
          </li>
          <li>
            <strong>Partner Referral Records:</strong> When you ask us to send your project to a
            partner network such as GreatBuildz, we keep a record of what we sent (your name, email,
            optional phone and message, property address, and project summary), the consent wording
            you accepted and when, a referral number, whether delivery succeeded, and the referral&rsquo;s
            later status as reported by the partner.
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
          homeowner-directed lead unlocks for builders and homeowner-directed referrals to partner
          networks, and reconcile those referrals with the partner; (e) process payments and prevent fraud; (f)
          respond to support inquiries; and (g) comply with legal and regulatory obligations.
        </p>
        <p>
          <strong>We do not sell personal information for monetary or valuable consideration, nor do we
          share personal information for cross-context behavioral advertising.</strong> Homeowner
          contact information is disclosed to a builder only upon the homeowner’s affirmative,
          intentional direction. The same applies to partner referrals: we send your details to a
          partner network only when you choose it and submit the request.
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
            <strong>Property Address Verification (ATTOM):</strong> For signed-in address searches,
            we send the searched street address, city, state, and ZIP code to <em>ATTOM</em> to
            cross-check the property address and location. These requests do not include your
            name, email, or account details.
          </li>
          <li>
            <strong>Transactional Email (Resend):</strong> When you ask us to email a 3D lot link, we
            send <em>Resend</em> your email address and the message, which includes the property
            address, the link and the headline estimate, so it can deliver that one email from
            support@lotfoundry.net. We do not use Resend for marketing lists.
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
            <strong>Address &amp; Zoning Interpretation (TypeSafe):</strong> We use <em>TypeSafe</em>{" "}
            for narrow multiple-choice judgments, not generated text. When you search for an address,
            the text you typed and the candidate matches returned by our geocoding provider may be
            sent to TypeSafe to pick the address you meant. For signed-in parcel lookups that return
            zoning data, the zoning designation and description, with the parcel&rsquo;s city, county,
            and state (not its street address), may be sent to TypeSafe to check how we classify the
            zoning district. Neither request includes your name, email, or account details.
          </li>
          <li>
            <strong>Usage and Conversion Measurement:</strong> <em>Google Analytics 4</em> and{" "}
            <em>Google Ads</em> measure product usage and ad-driven purchases only with your
            affirmative consent (see Section 7).
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
        <p>
          <strong>Partner Referrals (GreatBuildz):</strong> For eligible properties in Los Angeles, Orange,
          Ventura, San Bernardino, Riverside, San Diego, Alameda, Contra Costa, Santa Clara and San
          Mateo counties, California, you may choose to have <em>GreatBuildz</em>, an independent
          homeowner matchmaking service, introduce contractors instead of LotFoundry&rsquo;s own builder
          marketplace. If you choose GreatBuildz and submit the request, we immediately send GreatBuildz
          your name, email, optional phone number and message, exact property address, lot size, and a
          summary of your backyard home design (size, dimensions, roof, finish, estimated build-cost
          band, and zoning screen), together with a LotFoundry referral number. We do not send your
          password, payment details, uploaded photos, saved scenarios, or analytics data.
        </p>
        <p>
          This is a disclosure you direct, made only with the separate consent you give on the request
          form. GreatBuildz receives your details as an independent business and handles them under its
          own privacy policy; it may contact you and share your project with contractors it introduces.
          LotFoundry may receive a referral fee from GreatBuildz for referrals. That fee does not change
          what you pay. GreatBuildz may tell us how a referral progresses (for example, whether
          contractors were introduced or a contract was signed) so we can reconcile referral fees; we
          use that status only for this purpose. To have GreatBuildz delete the information it
          received, contact GreatBuildz directly. We can help: email{" "}
          <a href="mailto:privacy@lotfoundry.net" className="font-medium text-lot-orange-ink underline">
            privacy@lotfoundry.net
          </a>{" "}
          with your referral number.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention &amp; Account Deletion">
        <p>
          We retain personal information for as long as your account remains active. You may delete your
          account at any time within your{" "}
          <Link href="/settings" className="font-medium text-lot-orange-ink underline">
            Account Settings
          </Link>{" "}
          or via our public{" "}
          <Link href="/delete-account" className="font-medium text-lot-orange-ink underline">
            Delete Account
          </Link>{" "}
          portal (accessible without installing our mobile application).
        </p>
        <p>
          Upon deletion, your active profile, saved scenario studies, and contact records are permanently
          removed from active product databases. We retain transactional, accounting, tax, dispute, and
          fraud records for up to seven (7) years as required by applicable commercial and financial
          regulations, in de-identified or pseudonymized format. For partner referrals, deletion removes
          your contact details and the link to your account from our referral record; we keep the
          referral number, partner, county, project size, and status to reconcile referral fees.
          Deleting your LotFoundry account does not delete the copy a partner already received.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies &amp; Local Storage">
        <p>
          We use strictly necessary session cookies and Firebase Authentication state to maintain your
          login session and persist local studio preferences. We do not use behavioral retargeting.
          Optional Google Ads conversion measurement may use advertising cookies after you opt in,
          as described below.
        </p>
        <p>
          <strong>Google Analytics 4 and Google Ads conversion measurement (Consent Gated):</strong>{" "}
          We load these Google tags only if you affirmatively opt in. They use first-party measurement
          cookies (including <code>_ga</code>, <code>_ga_*</code>, and <code>_gcl_*</code>) to measure
          site usage, ad-driven visits, and purchases. Google Ads measurement receives a purchase value,
          currency, and transaction identifier when a consented visitor completes a purchase. We do not
          send your address, email, or feasibility results to Google. Advertising personalization stays
          disabled. If you decline or take no action, no Google measurement scripts load or set cookies.
        </p>
        <p>
          <strong>Cloudflare Web Analytics (Not Consent Gated):</strong> Separately, we use Cloudflare
          Web Analytics to count page views and referrers. It is not covered by the control below
          because it never stores anything on your device: no cookies, no local storage, and no device
          fingerprinting. It cannot follow you to other sites, and it collects none of the interaction
          detail GA4 does. Consent gates exist to protect access to your device&rsquo;s storage, and
          this measurement never touches it.
        </p>
        <p>You can change your Google measurement consent at any time below:</p>
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
          <a href="mailto:privacy@lotfoundry.net" className="font-medium text-lot-orange-ink underline">
            privacy@lotfoundry.net
          </a>
          . We will verify your identity and respond within forty-five (45) days. If your request is
          denied, you have the right to appeal our decision by emailing{" "}
          <a href="mailto:privacy@lotfoundry.net" className="font-medium text-lot-orange-ink underline">
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
          <a href="mailto:privacy@lotfoundry.net" className="font-medium text-lot-orange-ink underline">
            privacy@lotfoundry.net
          </a>
          . For general support:{" "}
          <a href="mailto:support@lotfoundry.net" className="font-medium text-lot-orange-ink underline">
            support@lotfoundry.net
          </a>
          .
        </p>
        <p className="lf-caption text-lot-stone mt-2">
          LotFoundry LLC · Legal &amp; Privacy Compliance
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
