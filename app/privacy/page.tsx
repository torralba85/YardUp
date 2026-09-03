import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferences } from "@/components/analytics/CookiePreferences";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | LotFoundry",
  description: "How LotFoundry collects, uses, and protects your information.",
};

/** Privacy policy — matches Firebase, Regrid, Google, OpenAI, Stripe, marketplace. */
export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" kicker="Last updated: September 3, 2026">
      <LegalSection title="1. Information We Collect">
        <p>
          We collect information you provide when you create an account (name, email, password
          or Sign in with Apple/Google), the role you select (homeowner or builder), parcel
          addresses and ADU configurations you save, builder company details and service areas,
          marketplace connection requests you submit, payment transaction metadata from Stripe
          or the app stores, and feedback you send. We also collect standard server logs (IP
          address, user agent, pages visited) to operate and secure the service.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>
          We use this information to provide LotFoundry, authenticate you, save feasibility
          studies, process purchases and lead unlocks, match consented leads to builders, send
          transactional messages, improve reliability, prevent fraud, and respond to support
          requests. We do not sell personal information for cross-context behavioral advertising. Builders pay LotFoundry to unlock contact and property details only after a homeowner affirmatively submits a connection request.
        </p>
      </LegalSection>

      <LegalSection title="3. Infrastructure &amp; Third-Party Services">
        <p>
          LotFoundry is hosted on <strong>Firebase Hosting</strong> with{" "}
          <strong>Cloud Functions</strong>, <strong>Firebase Authentication</strong>, and{" "}
          <strong>Cloud Firestore</strong>. Parcel and map features use{" "}
          <strong>Google Maps / Places / Geocoding</strong> and <strong>Regrid</strong> parcel
          data. Payments use <strong>Stripe</strong> on the open web and{" "}
          <strong>Apple App Store / Google Play Billing</strong> in store apps. Optional AI
          style-match concepts use <strong>OpenAI</strong> when you consent to send a photo.
          Usage measurement uses <strong>Google Analytics 4</strong>, and only after you accept
          analytics cookies (see section 7).
        </p>
      </LegalSection>

      <LegalSection title="4. AI Photo Processing">
        <p>
          When you use style-match, you explicitly agree to send a prepared photo (downscaled,
          re-encoded, with EXIF/GPS stripped on device) to OpenAI to generate a concept image.
          LotFoundry does not store the original photo on our servers. Generation is optional;
          declining does not block the rest of the studio.
        </p>
      </LegalSection>

      <LegalSection title="5. Marketplace Sharing">
        <p>
          Homeowner contact and lot details are shared with matched builders only after you
          submit a connect request. Builders see a redacted preview until they unlock a lead.
          Unlock and purchase ledgers may retain non-PII accounting records after account
          deletion.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention &amp; Deletion">
        <p>
          You may export or delete your account from{" "}
          <Link href="/settings" className="font-medium text-lf-clay-ink underline">
            Settings
          </Link>{" "}
          or the public{" "}
          <Link href="/delete-account" className="font-medium text-lf-clay-ink underline">
            Delete account
          </Link>{" "}
          page (usable without reinstalling a mobile app). Deletion removes account-associated contact information and user-generated content from active product records. We may retain purchase, credit, lead-unlock, fraud, tax, accounting, and dispute records for as long as reasonably necessary for those purposes. Retained records may contain transaction or internal account identifiers but not active profile contact details. We delete or de-identify them when they are no longer needed.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies &amp; Local Storage">
        <p>
          We use session cookies / Firebase Auth state to keep you signed in, and local/session
          storage for studio handoff and preferences. We do not use third-party advertising
          cookies.
        </p>
        <p>
          With your consent, we also use Google Analytics 4 to measure which pages and features
          are used. It sets first-party cookies (<code>_ga</code> and <code>_ga_*</code>) holding
          a random identifier, and reports page paths, referrer, approximate location derived
          from a truncated IP address, and device/browser type. Analytics is off until you
          accept: we load nothing from Google and set no analytics cookie unless you opt in, and
          advertising and personalization signals are disabled. We do not send Google your
          address, email, saved scenarios, or feasibility results.
        </p>
        <p>
          You can change your mind at any time. Turning analytics off stops collection and
          deletes the analytics cookies already in your browser.
        </p>
        <CookiePreferences />
      </LegalSection>

      <LegalSection title="8. Children">
        <p>
          LotFoundry is intended only for people age 18 or older. We do not knowingly allow children to create accounts or submit personal information.
        </p>
      </LegalSection>

      <LegalSection title="9. Privacy Choices &amp; State Rights">
        <p>
          Depending on where you live and whether applicable legal thresholds are met, you may
          request access to, correction of, deletion of, or a portable copy of your information;
          object to or opt out of certain disclosures; or appeal a denied request. Email{" "}
          <a href="mailto:privacy@lotfoundry.com" className="font-medium text-lf-clay-ink underline">
            privacy@lotfoundry.com
          </a>
          . We may verify your identity before completing a request and will not discriminate
          against you for exercising an applicable privacy right.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>
          We may update this policy by revising the “Last updated” date. Material changes may also
          be communicated by email when appropriate.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Privacy questions:{" "}
          <a
            href="mailto:privacy@lotfoundry.com"
            className="font-medium text-lf-clay-ink underline"
          >
            privacy@lotfoundry.com
          </a>
          . Support:{" "}
          <a
            href="mailto:support@lotfoundry.com"
            className="font-medium text-lf-clay-ink underline"
          >
            support@lotfoundry.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
