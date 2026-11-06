import type { Metadata } from "next";
import { WebBuilderOnly } from "@/components/builder/WebBuilderOnly";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { pageOpenGraph } from "@/lib/og-images";

const title = "Help Center: Studio, Account & Payments | LotFoundry";
const description =
  "How to use the LotFoundry studio: explore demo lots, save concepts, buy a Certificate of Feasibility, manage your account, and delete your data.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/help" },
  openGraph: pageOpenGraph({ title, description, url: "/help" }),
};

export default function HelpPage() {
  return (
    <LegalPageShell title="Help center" kicker="Support for owners and builders">
      <LegalSection title="Getting started">
        <p>
          From the{" "}
          <Link href="/" className="font-medium text-lot-orange-ink underline">
            landing page
          </Link>
          , enter your address to open the{" "}
          <Link href="/studio" className="font-medium text-lot-orange-ink underline">
            studio
          </Link>
          . You can explore demo lots without an account; sign in to save concepts and purchase a
          Certificate of Feasibility.
        </p>
      </LegalSection>
      <LegalSection title="Account & settings">
        <p>
          Manage your profile, security, data export, and deletion from{" "}
          <Link href="/settings" className="font-medium text-lot-orange-ink underline">
            Settings
          </Link>
          . The account menu on studio and builder surfaces links here too.
        </p>
      </LegalSection>
      <LegalSection title="Saved concepts">
        <p>
          Signed-in owners can save scenarios from the studio. They appear in the desktop sidebar
          and can be deleted anytime. Exports include saved concepts via Settings → Export my data.
        </p>
      </LegalSection>
      <LegalSection title="Payments">
        <p>
          On the web, certificates and builder lead credits use Stripe Checkout. In the iOS and
          Android apps, certificates use App Store and Google Play billing with server-side
          verification. Demo environments may unlock without payment.
        </p>
      </LegalSection>
      <WebBuilderOnly><LegalSection title="Builder leads">
        <p>
          Builders complete a profile on{" "}
          <Link href="/builder" className="font-medium text-lot-orange-ink underline">
            /builder
          </Link>
          , review redacted lead previews, and unlock contact details with credits. Homeowners
          share leads only after an explicit connect form.
        </p>
      </LegalSection></WebBuilderOnly>
      <LegalSection title="AI style-match photos">
        <p>
          Style-match sends a photo you choose to OpenAI to generate a concept image. LotFoundry
          does not store the original photo. Generation requires your consent checkbox on the Design
          step and is optional — the rest of the studio works without it.
        </p>
      </LegalSection>
      <LegalSection title="Delete your account">
        <p>
          You can delete in-app from Settings or the account menu, or use the public{" "}
          <Link href="/delete-account" className="font-medium text-lot-orange-ink underline">
            delete-account
          </Link>{" "}
          page (required for store users who have uninstalled the app).
        </p>
      </LegalSection>
      <LegalSection title="Contact support">
        <p>
          Email{" "}
          <a href="mailto:support@lotfoundry.net" className="font-medium text-lot-orange-ink underline">
            support@lotfoundry.net
          </a>{" "}
          or use{" "}
          <Link href="/feedback" className="font-medium text-lot-orange-ink underline">
            Feedback
          </Link>{" "}
          to open a ticket.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
