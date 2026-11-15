"use client";

import { ArrowUpRight } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { landingDemos, type LandingCity } from "@/lib/landing-demo";

export function SampleCertificateDialog({ city, onClose }: { city: LandingCity; onClose: () => void }) {
  const demo = landingDemos[city];
  const href = city === "san-diego" ? "/sample-certificate" : `/sample-certificate/${city}`;
  return (
    <Dialog
      title={`${demo.name} sample Certificate`}
      kicker="Public sample"
      description={`${demo.city} demo · market rent · use your browser’s Print → Save as PDF.`}
      onClose={onClose}
      closeLabel="Close sample"
      titleId="sample-title"
      size="xl"
      fill
      bodyClassName="flex flex-col gap-3"
    >
      <a
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-lot-orange-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open printable sample in a new tab
        <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </a>
      {/* Let a reader follow the sample's Studio link without enabling scripts or storage. */}
      <iframe
        title="Full sample Certificate of Feasibility"
        src={href}
        sandbox="allow-top-navigation-by-user-activation"
        className="min-h-0 w-full flex-1 border border-lot-line bg-lot-paper"
      />
    </Dialog>
  );
}
