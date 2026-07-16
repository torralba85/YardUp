import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

/** Page metadata for the privacy policy route. */
export const metadata: Metadata = {
  title: "Privacy Policy | LotFoundry",
  description: "How LotFoundry collects, uses, and protects your information.",
};

const LINK_CLASS =
  "font-medium text-lf-clay underline decoration-lf-clay/40 underline-offset-4 hover:text-lf-mahogany";

/** Static privacy policy page (`/privacy`). */
export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" kicker="Last updated: July 15, 2026">
      <LegalSection title="1. Information We Collect">
        <p>
          We collect information you provide directly: your account details (name, email
          address, and — for password accounts — a password), the role you select
          (homeowner or builder), property addresses you search, the parcel and ADU
          scenarios you save, builder profile details (company name, contact email,
          phone, license number, service areas), and any messages you send through our
          feedback and support forms.
        </p>
        <p>
          If you use the AI style-match feature, you can upload a photo of your home.
          The photo is downscaled and its EXIF metadata (including GPS location) is
          removed in your browser before it is sent for processing.
        </p>
        <p>
          We also collect standard server logs (IP address, browser type, pages
          visited) to operate, secure, and improve the service.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>
          We use this information to provide LotFoundry: authenticate your account,
          look up parcel and zoning data for addresses you search, calculate
          feasibility estimates, save your scenarios, generate reports and
          certificates, route builder connection requests you submit, process
          payments, send transactional emails (password reset, account notices), and
          respond to support requests. We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection title="3. Service Providers">
        <p>LotFoundry runs on the following services, which may process your data:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Google Firebase</strong> — hosting (Firebase Hosting and Cloud
            Functions), authentication (Firebase Auth, including Google sign-in), and
            data storage (Cloud Firestore).
          </li>
          <li>
            <strong>Google Maps Platform</strong> — address autocomplete, geocoding,
            and aerial imagery for the parcels you search.
          </li>
          <li>
            <strong>Regrid</strong> — parcel boundary, lot, and zoning records for the
            addresses you look up.
          </li>
          <li>
            <strong>OpenAI</strong> — AI-generated parcel insights, project briefs, and
            ADU concept images. Text about your parcel and any photo you choose to
            upload are sent to OpenAI to generate results. LotFoundry does not store
            your original photo after processing.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing for certificates and builder
            lead unlocks. Your card details go directly to Stripe; LotFoundry never
            stores card numbers.
          </li>
        </ul>
        <p>Each provider has its own privacy policy.</p>
      </LegalSection>

      <LegalSection title="4. Builder Marketplace Sharing">
        <p>
          When you submit a request to connect with builders, you consent to sharing
          your project details with the builders the request matches: a redacted
          preview (city band and project shape, no street address or contact info) is
          visible to matched builders, and your contact information and property
          address are revealed only to a builder who unlocks your request. Builders
          are contractually required to use this information only to respond to your
          request.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Storage and Security">
        <p>
          Your data is stored in Google Firebase (Firestore and Firebase
          Authentication), which provides encryption at rest and in transit. Access to
          gated marketplace contact details is enforced by server-side security rules.
          We apply reasonable technical and organizational measures to protect your
          information; no method of transmission over the internet is 100% secure.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and Local Storage">
        <p>
          We use session cookies to keep you signed in and browser local storage to
          persist your studio state across page refreshes. We do not use third-party
          advertising cookies.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Retention and Deletion">
        <p>
          You can delete your account at any time from{" "}
          <Link href="/settings" className={LINK_CLASS}>
            Settings
          </Link>{" "}
          inside the app, or from the public{" "}
          <Link href="/delete-account" className={LINK_CLASS}>
            delete account
          </Link>{" "}
          page without reinstalling anything. Deletion removes your profile, saved
          scenarios, builder profile, and the contact details attached to your builder
          connection requests.
        </p>
        <p>
          We retain limited non-personal records after deletion: redacted lead records
          (no contact details or street address) that builders may have paid to
          unlock, and transaction records (IDs and amounts) required for accounting
          and fraud prevention.
        </p>
        <p>
          You can also download a copy of your data from Settings (&ldquo;Export my
          data&rdquo;) at any time.
        </p>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <p>
          You may request access to, correction of, export of, or deletion of your
          personal data at any time using the tools above or by contacting us at the
          address below. Depending on where you live, you may have additional rights
          under local law (such as the CCPA or GDPR).
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          LotFoundry is not directed at children under 13. We do not knowingly collect
          personal information from children under 13. If you believe a child has
          provided us with personal information, please contact us so we can delete
          it.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to This Policy">
        <p>
          We may update this policy from time to time. We will notify you of material
          changes by updating the &ldquo;Last updated&rdquo; date above and, where
          appropriate, by email.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about this policy? Email us at{" "}
          <a href="mailto:privacy@lotfoundry.com" className={LINK_CLASS}>
            privacy@lotfoundry.com
          </a>
          , or use the{" "}
          <Link href="/feedback" className={LINK_CLASS}>
            feedback form
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
