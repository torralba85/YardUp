import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferences } from "@/components/analytics/CookiePreferences";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { pageOpenGraph } from "@/lib/og-images";

const title = "Privacy Policy: Your Data & Your Rights | LotFoundry";
const description =
  "Learn what LotFoundry collects, how property, account, payment, analytics, and AI data are used, and how to exercise your privacy rights.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: pageOpenGraph({ title, description, url: "/privacy" }),
};

const linkClass = "font-medium text-lot-orange-ink underline";

function SupportEmail() {
  return (
    <a href="mailto:support@lotfoundry.net" className={linkClass}>
      support@lotfoundry.net
    </a>
  );
}

/**
 * Privacy Policy — canonical `/privacy` disclosure matching deployed
 * infrastructure (Firebase, Regrid, ATTOM, Census, OpenStreetMap, Esri, USGS 3DEP, CAL FIRE, USA Structures, OpenAI, TypeSafe, Resend, Stripe, GA4, Cloudflare).
 * The version in the kicker must match `CURRENT_LEGAL_CONSENT` in `lib/legal-consent.ts`.
 */
export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      kicker="Effective November 10, 2026 · Version 2026-11-10"
    >
      <LegalSection title="Who We Are &amp; Scope">
        <p>
          This Privacy Policy explains how VeriShare LLC, a California limited liability company
          doing business as LotFoundry (“LotFoundry”, “we”, “us”, or “our”), 1150 E St, Unit 202,
          San Diego, CA 92101, collects, uses, shares, and protects personal
          information through lotfoundry.net, the 3D Feasibility Studio, and our mobile apps
          (including the LotFoundry Android app on Google Play and any iOS app). Sections 1 through 7
          are also our notice at collection under the California Consumer Privacy Act, as amended by
          the California Privacy Rights Act (“CCPA”).
        </p>
      </LegalSection>

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
            phone numbers, service regions, trade specializations, and lead credit balances.
          </li>
          <li>
            <strong>Emailed Studio Links:</strong> When you request a 3D lot link, we save your email,
            property address, design, estimate snapshot, and optional permit-update preference to
            prepare and deliver that email. Links remain available until deleted; anyone with your
            link can view the layout and property address. Marketing updates require a separate,
            optional opt-in. Deleting an account with a verified email address also deletes saved
            lot links for that email, or you can contact support@lotfoundry.net at any time to
            withdraw that opt-in or delete the saved link and associated lead. The email is delivered
            by Resend (see Section 3).
          </li>
          <li>
            <strong>Marketplace &amp; Referral Requests:</strong> When you ask to connect with
            builders (or with a referral partner, if offered), the name, email, optional phone and
            message, exact property address, and project snapshot you choose to send, plus a record
            of your request and its status.
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
            <strong>Support &amp; Feedback:</strong> Messages you send us by email or through the
            feedback form.
          </li>
          <li>
            <strong>Technical Telemetry &amp; Security Logs:</strong> IP address (truncated for analytics),
            user agent, device characteristics, request timestamps, app attestation results (Firebase
            App Check with reCAPTCHA Enterprise) used to block abuse, and tamper-evident legal consent
            receipts (recording accepted terms and privacy policy versions).
          </li>
        </ul>
        <p>
          We do not collect sensitive personal information to infer characteristics about you.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>
          We process personal information to: (a) provide the 3D Feasibility Studio and calculate zoning
          and financial estimates; (b) authenticate your identity and safeguard your account; (c)
          generate and deliver Certificates of Feasibility and AI Project Briefs; (d) carry out
          builder and referral connections you direct; (e) process payments, refunds, and chargebacks
          and prevent fraud; (f) respond to support inquiries; and (g) comply with legal and
          regulatory obligations.
        </p>
        <p>
          <strong>We do not sell personal information or share it for cross-context behavioral
          advertising, as the CCPA defines those terms.</strong> Homeowner contact information is
          disclosed to a builder or referral partner only at the homeowner&rsquo;s affirmative,
          intentional direction (see Section 5).
        </p>
      </LegalSection>

      <LegalSection title="3. Third-Party Subprocessors &amp; Infrastructure">
        <p>
          To operate the Service, we share data with trusted third-party service providers bound by
          contractual confidentiality and data protection standards:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Cloud Infrastructure &amp; Security:</strong> Hosted on{" "}
            <em>Google Cloud Platform / Firebase</em> (Firebase Hosting, Cloud Functions, Firebase
            Authentication, Cloud Firestore, and Firebase App Check with Google reCAPTCHA Enterprise).
          </li>
          <li>
            <strong>Geocoding &amp; Spatial Data:</strong> Property searches and 3D context views use{" "}
            <em>Google Maps Platform</em>, <em>OpenStreetMap</em> (Nominatim geocoding and OSM map/building
            tiles), <em>Esri World Imagery</em> (ArcGIS Online satellite tiles), <em>Regrid</em>{" "}
            (Loveland Technologies parcel boundaries), the <em>US Census Bureau Geocoder</em>,{" "}
            <em>USGS 3DEP</em> (National Map terrain elevation), <em>USA Structures</em> (federal
            building footprints), and state and municipal GIS open data portals (including{" "}
            <em>CAL FIRE</em> fire hazard severity zone layers).
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
            both: (1) optional user-uploaded photos (paired with non-identifying lot and ADU style
            parameters) to generate architectural style-match imagery, and (2) parcel metrics, zoning
            constraints, and feasibility parameters to synthesize the narrative AI Project Brief and
            risk breakdown included with Certificates. Under OpenAI&rsquo;s API terms, inputs are not
            used to train its models by default.
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
          transmission. The prepared image and non-identifying lot context (city, zoning district,
          lot dimensions, and target ADU configuration, without your street address or parcel
          coordinates) are sent directly via encrypted API to OpenAI to produce a concept
          visualization. LotFoundry does not store your original uploaded photo on our database
          servers; if you save a scenario to your account, the resulting AI concept rendering is
          stored with that saved scenario until you delete the scenario or your account.
        </p>
        <p>
          When generating a Certificate of Feasibility, project feasibility parameters (lot size,
          calculated setbacks, jurisdiction, and target ADU dimensions) are transmitted to OpenAI to
          generate the Project Brief. Generating AI briefs or photos is never required to browse the
          studio.
        </p>
        <p>
          We do not develop, train, or fine-tune AI models, and we do not use your photos or personal
          information to train AI models. Generated images are delivered without removing any
          provenance data or watermark the AI provider adds.
        </p>
      </LegalSection>

      <LegalSection title="5. Marketplace &amp; Referral Sharing: Consumer-Directed Disclosure">
        <p>
          Homeowner contact details (name, email, phone, and property address) are held in confidence
          and are never displayed publicly. Builders see only an anonymized, redacted preview (general
          neighborhood, lot size, and project scope) until a homeowner affirmatively submits a
          connection request.
        </p>
        <p>
          When a homeowner checks the consent box naming the recipients and submits a connection
          request, and a builder pays to unlock the lead, the homeowner&rsquo;s contact information is
          disclosed solely at the homeowner&rsquo;s intentional direction. Under the CCPA, a business
          does not sell or share personal information when a consumer directs it to intentionally
          disclose that information or to interact with one or more third parties (California Civil
          Code § 1798.140(ad)(2)(A) and (ah)(2)(A); see also § 1798.140(s), defining
          “intentionally interacts”). Builders act as independent businesses responsible for their
          own handling of the information once they unlock a lead.
        </p>
        <p>
          <strong>Referral partners.</strong> If we offer an option to send your project to a
          third-party referral partner, the consent box will name that partner and what is sent, and
          nothing is sent unless you check it and submit. The partner may pay us a referral fee,
          which does not change what you pay, and it handles your information under its own privacy
          policy. We keep a record of your consent and a referral number so the partner can report
          the referral&rsquo;s status back to us for fee reconciliation.
        </p>
        <p>
          <strong>GreatBuildz.</strong> Our current referral partner is GreatBuildz Inc., a
          contractor-matching service in ten California counties. If you choose GreatBuildz and
          check its consent box, we email your name, email, optional phone and message, property
          address, lot and zoning facts, backyard home design summary, and $25,000 build-cost range to
          GreatBuildz&rsquo;s team, with a copy to you. We never send your exact cost or rent figures,
          photos, Certificate, saved scenarios, account identifiers, or payment details. GreatBuildz
          handles what it receives under its{" "}
          <a
            href="https://www.greatbuildz.com/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            privacy policy
          </a>
          , and its advisors and the contractors or architects it matches you with may contact you by
          phone, email, or text. GreatBuildz reports each referral&rsquo;s status to us by its
          referral number (introduced, engaged, contracted, or closed), and may pay us a referral fee
          on a signed contract. We keep that record, with your consent receipt, in a server-only
          ledger that no other user can read.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Retention &amp; Account Deletion">
        <p>
          We retain personal information for as long as your account remains active. You may export
          your data or delete your account at any time within your{" "}
          <Link href="/settings" className={linkClass}>
            Account Settings
          </Link>{" "}
          or via our public{" "}
          <Link href="/delete-account" className={linkClass}>
            Delete Account
          </Link>{" "}
          portal (accessible without installing our mobile application).
        </p>
        <p>
          Upon deletion, your active profile, saved scenario studies, emailed 3D lot links associated
          with your verified account email, and contact records are permanently removed from active
          product databases. We retain transactional, accounting, tax, dispute, and fraud records for
          up to seven (7) years as required by applicable commercial and financial regulations, in
          de-identified or pseudonymized format.
        </p>
        <p>
          <strong>Information already shared at your direction.</strong> Deleting your LotFoundry
          account does not delete information a builder already unlocked or a referral partner
          already received. Contact that builder or partner directly to ask them to delete it, or
          email <SupportEmail /> and we will forward your request to any referral partner that
          received your project. When you delete your account, we remove the contact details and
          project facts from our referral record and keep the referral number, partner, county,
          project size, status, and consent receipt needed to reconcile referral fees.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies &amp; Local Storage">
        <p>
          We use strictly necessary session cookies and Firebase Authentication state to maintain your
          login session, and browser local and session storage for Studio preferences, handoffs, and
          your cookie choice. We do not use behavioral retargeting. Optional Google Ads conversion
          measurement uses advertising cookies only after you opt in, as described below.
        </p>
        <p>
          <strong>Google Analytics 4 and Google Ads conversion measurement (Consent Gated):</strong>{" "}
          We load these Google tags only if you click Accept. They then set first-party measurement
          cookies (including <code>_ga</code> and <code>_ga_*</code> for Analytics, and{" "}
          <code>_gcl_au</code>, <code>_gcl_aw</code>, and <code>_gcl_dc</code> for Google Ads) to
          measure site usage, ad-driven visits, and purchases. Google Consent Mode grants analytics
          and ad storage but keeps ad personalization denied, so personalized advertising and
          remarketing stay off. Google Ads receives a purchase value, currency, and transaction
          identifier when a consented visitor completes a purchase. We do not send your address,
          email, phone number, or feasibility results to Google. If you decline or take no action, no
          Google measurement scripts load or set cookies. If you later withdraw consent, we disable
          the tags and delete these cookies.
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

      <LegalSection title="8. Children &amp; Minors">
        <p>
          The Service is designed and intended for adults aged 18 and older, and it is rated for
          adults in mobile app stores. We do not knowingly collect personal information from anyone
          under 18, we do not sell or share personal information of consumers under 16, and we do not
          target marketing to minors. We respect age signals provided by app stores and platforms.
        </p>
        <p>
          If we learn that we collected personal information from a child under 13, or from anyone
          under 18, we will delete it. A parent or guardian who believes a minor has given us personal
          information can contact <SupportEmail />.
        </p>
      </LegalSection>

      <LegalSection title="9. Your Privacy Rights">
        <p>
          Depending on where you live (including California, Virginia, Colorado, Connecticut, Texas,
          Utah, and Oregon), you may have the following rights. We honor them for all users:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>The right to know and access the personal information we hold about you.</li>
          <li>The right to request deletion of your personal information.</li>
          <li>The right to correct inaccurate personal information.</li>
          <li>The right to receive a portable copy of your data (available in Settings).</li>
          <li>
            The right to opt out of the sale or sharing of personal information, targeted
            advertising, or automated profiling. We do not do these, and you can withdraw consent to
            Google measurement cookies at any time in Section 7.
          </li>
          <li>The right not to be discriminated against for exercising your privacy rights.</li>
        </ul>
        <p>
          California residents may also ask, under California Civil Code § 1798.83, whether we have
          disclosed personal information to third parties for their own direct marketing purposes.
        </p>
        <p>
          <strong>Submitting requests &amp; appeals.</strong> Use the export and delete tools in
          Settings, or email <SupportEmail />. You may use an authorized agent. We will verify your
          identity and respond within forty-five (45) days. If we deny your request, you can appeal by
          emailing <SupportEmail /> with the subject line <em>“Privacy Appeal”</em>.
        </p>
      </LegalSection>

      <LegalSection title="10. Policy Updates">
        <p>
          We may update this Privacy Policy to reflect changes in our legal obligations or systems.
          We will post revised versions with a new effective date and version. For material changes,
          we will notify you on the Service or by email and ask signed-in users to accept the update.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact Information">
        <p>
          For privacy questions, data requests, or general support, contact <SupportEmail />, call
          (419) 669-6663, or write to VeriShare LLC, dba LotFoundry, 1150 E St, Unit 202, San Diego,
          CA 92101.
        </p>
        <p className="lf-caption text-lot-stone mt-2">
          VeriShare LLC, dba LotFoundry · Legal &amp; Privacy Compliance
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
