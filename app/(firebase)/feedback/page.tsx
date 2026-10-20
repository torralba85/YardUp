import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { FeedbackForm } from "./FeedbackForm";
import { pageOpenGraph } from "@/lib/og-images";

const title = "Send Feedback | LotFoundry";
const description =
  "Report LotFoundry bugs, incorrect parcel or zoning data, billing problems, or product ideas, and learn what details help us investigate.";

/** Page metadata for the feedback route. */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/feedback" },
  openGraph: pageOpenGraph({ title, description, url: "/feedback" }),
};

/** Public feedback page (`/feedback`). */
export default function FeedbackPage() {
  return (
    <LegalPageShell
      title="Send Feedback"
      kicker="Bugs, ideas, data issues, billing"
    >
      <div className="lf-body space-y-4 text-lot-stone">
        <p>
          Found a bug, spotted incorrect parcel or zoning data, ran into a billing problem, or have
          an idea that would make LotFoundry more useful? Send the details below. Clear reports help
          us separate product defects from source-data limitations and make the next fix more useful
          for everyone using the feasibility studio.
        </p>
        <p>
          For property-data issues, include the address, what value looks wrong, and what you expected
          to see. For studio bugs, tell us what you were trying to do and what happened instead. For
          billing or account problems, include the email tied to your account and the relevant purchase
          or lead, but never send passwords, payment-card numbers, API keys, or other secrets.
        </p>
        <p>
          General product questions may be answered faster through Help. Privacy requests should use
          the contact method listed in our Privacy Policy, and account deletion remains available from
          the public Delete Account page. Feedback submitted here is used to investigate the issue or
          evaluate the suggestion you send us.
        </p>
      </div>
      <FeedbackForm />
    </LegalPageShell>
  );
}
