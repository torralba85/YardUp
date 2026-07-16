import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { FeedbackForm } from "./FeedbackForm";

/** Page metadata for the feedback route. */
export const metadata: Metadata = {
  title: "Send Feedback | LotFoundry",
  description: "Report a bug, flag a data issue, or tell us what to build next.",
};

/** Public feedback page (`/feedback`). */
export default function FeedbackPage() {
  return (
    <LegalPageShell
      title="Send Feedback"
      kicker="Bugs, ideas, data issues, billing"
    >
      <p className="lf-body text-lf-muted">
        Found a bug, spotted wrong parcel data, or have an idea? Tell us below.
        Billing problems get priority — include the address or lead involved if
        you can.
      </p>
      <FeedbackForm />
    </LegalPageShell>
  );
}
