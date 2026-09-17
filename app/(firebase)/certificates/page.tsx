import type { Metadata } from "next";
import { CertificatesClient } from "@/components/account/CertificatesClient";

export const metadata: Metadata = {
  title: "Certificates of Feasibility | LotFoundry",
  description: "View, download, and open unlocked Certificates of Feasibility for your properties.",
  alternates: { canonical: "/certificates" },
};

/** Member certificates route (`/certificates`). */
export default function CertificatesPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-lf-sand text-lf-espresso">
      <CertificatesClient />
    </main>
  );
}
