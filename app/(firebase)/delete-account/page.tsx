import type { Metadata } from "next";
import { DeleteAccountPageClient } from "./DeleteAccountPageClient";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Delete account | LotFoundry",
  description:
    "Delete your LotFoundry account and personal data from the web — no app reinstall required.",
};

export default function DeleteAccountPage() {
  return (
    <LegalPageShell
      title="Delete your account"
      kicker="Google Play &amp; App Store data-deletion resource"
    >
      <DeleteAccountPageClient />
    </LegalPageShell>
  );
}
