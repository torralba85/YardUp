import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { DeleteAccountPageClient } from "./DeleteAccountPageClient";

/** Page metadata for the public account-deletion route. */
export const metadata: Metadata = {
  title: "Delete Your Account | LotFoundry",
  description:
    "Delete your LotFoundry account and personal data from the web — no app install required.",
};

const LINK_CLASS =
  "font-medium text-lf-clay underline decoration-lf-clay/40 underline-offset-4 hover:text-lf-mahogany";

/**
 * Public account-deletion resource (`/delete-account`). Required by Google
 * Play's account-deletion policy: it must work from the web without
 * reinstalling the app, name the app, and explain what is deleted and what is
 * retained.
 */
export default function DeleteAccountPage() {
  return (
    <LegalPageShell title="Delete Your LotFoundry Account" kicker="Works entirely on the web">
      <LegalSection title="What gets deleted">
        <p>
          Deleting your LotFoundry account permanently removes your profile (name,
          email, role), your saved ADU scenarios, your builder profile if you have
          one, and the contact details attached to any builder connection requests
          you submitted. Your sign-in itself is deleted, so the account cannot be
          recovered afterward.
        </p>
      </LegalSection>

      <LegalSection title="What is retained">
        <p>
          We keep limited non-personal records: redacted lead records (city band and
          project shape only — no name, contact info, or street address) that a
          builder may have paid to unlock, and transaction records (IDs and amounts)
          required for accounting and fraud prevention. Details are in the{" "}
          <Link href="/privacy" className={LINK_CLASS}>
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          Want a copy of your data first? Download it from{" "}
          <Link href="/settings" className={LINK_CLASS}>
            Settings → Your data
          </Link>{" "}
          before deleting.
        </p>
      </LegalSection>

      <LegalSection title="Delete your account">
        <DeleteAccountPageClient />
      </LegalSection>
    </LegalPageShell>
  );
}
