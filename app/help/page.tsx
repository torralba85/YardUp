import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

/** Page metadata for the help route. */
export const metadata: Metadata = {
  title: "Help | LotFoundry",
  description: "Getting started, accounts, payments, builder leads, and support.",
};

const LINK_CLASS =
  "font-medium text-lf-clay underline decoration-lf-clay/40 underline-offset-4 hover:text-lf-mahogany";

/** Static help center page (`/help`). */
export default function HelpPage() {
  return (
    <LegalPageShell title="Help Center" kicker="Support for LotFoundry">
      <LegalSection title="Getting started">
        <p>
          Open the{" "}
          <Link href="/studio" className={LINK_CLASS}>
            studio
          </Link>{" "}
          and search your address, or pick a sample lot (Seattle, Portland, or
          Austin) to explore without one. The studio walks five steps: Your Lot,
          Feasibility &amp; Rules, Design, Certificate, and Builders. Adjust the ADU
          size, roof, and finish in the inspector and the income, cost, and payback
          figures update instantly.
        </p>
      </LegalSection>

      <LegalSection title="Your account and settings">
        <p>
          Create an account to save concepts across devices. Manage your name, email,
          password, and data from{" "}
          <Link href="/settings" className={LINK_CLASS}>
            Settings
          </Link>{" "}
          (open the account menu in the studio header). Google-managed sign-ins
          change their email and password with Google.
        </p>
      </LegalSection>

      <LegalSection title="Saved concepts and reports">
        <p>
          Save a concept from the studio and reload it any time from the sidebar.
          Reports can be printed, downloaded, or shared by link; a purchased
          Certificate of Feasibility records the concept in a shareable document.
          Everything remains an estimate — not a permit or approval.
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Certificates and builder lead unlocks are one-time purchases processed by
          Stripe on the web (mobile app editions use the app store&rsquo;s billing).
          Receipts arrive by email from the payment provider. If a purchase
          doesn&rsquo;t appear after checkout, refresh once, then contact support
          with your receipt.
        </p>
      </LegalSection>

      <LegalSection title="Builder leads">
        <p>
          Homeowners: submitting a connection request shares a redacted preview with
          matched builders; your contact details are revealed only to builders who
          unlock your request. Builders: unlocked leads are for responding to that
          homeowner only, and lead credits are consumed per unlock. Report a
          materially inaccurate lead to support for a possible replacement credit.
        </p>
      </LegalSection>

      <LegalSection title="AI features and photos">
        <p>
          Parcel insights, project briefs, and ADU concepts are AI-generated
          illustrations, not designs or approvals. If you upload a photo for style
          matching, it is downscaled and its location metadata is stripped in your
          browser before processing, and LotFoundry does not keep the original after
          the concept is generated.
        </p>
      </LegalSection>

      <LegalSection title="Deleting your account">
        <p>
          Delete your account from{" "}
          <Link href="/settings" className={LINK_CLASS}>
            Settings
          </Link>{" "}
          or the public{" "}
          <Link href="/delete-account" className={LINK_CLASS}>
            delete account
          </Link>{" "}
          page — no app reinstall needed. The{" "}
          <Link href="/privacy" className={LINK_CLASS}>
            Privacy Policy
          </Link>{" "}
          describes exactly what is removed and what non-personal records are
          retained.
        </p>
      </LegalSection>

      <LegalSection title="Still stuck?">
        <p>
          Send us a note through the{" "}
          <Link href="/feedback" className={LINK_CLASS}>
            feedback form
          </Link>{" "}
          or email{" "}
          <a href="mailto:support@lotfoundry.com" className={LINK_CLASS}>
            support@lotfoundry.com
          </a>
          . Include the address or lead involved and we can dig in faster.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
