import type { Metadata } from "next";
import { CertificatesClient } from "@/components/account/CertificatesClient";

export const metadata: Metadata = {
  title: "Certificates of Feasibility | LotFoundry",
  description: "View, download, and open unlocked Certificates of Feasibility for your properties.",
  alternates: { canonical: "/certificates" },
  // Signed-in dashboard. To a crawler it is a "Loading your certificates…"
  // shell — a thin page with no content anyone can search for, sitting on a
  // route whose real value is private. It is absent from the sitemap but was
  // still indexable, so state the exclusion rather than relying on that.
  robots: { index: false, follow: true },
};

/** Member certificates route (`/certificates`). */
export default function CertificatesPage() {
  return (
    <main id="main-content" className="min-h-dvh bg-lf-sand text-lf-espresso">
      <CertificatesClient />
    </main>
  );
}
