"use client";

import Link from "next/link";
import { LotAnswerCard } from "@/components/adu/LotAnswerCard";
import { aduCtaEvent } from "@/lib/adu/types";
import { trackEvent } from "@/lib/analytics/gtag";
import { playStoreCityUrl } from "@/lib/app-store-links";
import { PRIMARY_CTA_LABEL } from "@/lib/site-nav";

/** Resolve one guest address in the guide rail and carry the result into Studio. */
export function AduStudioCta({ city, slug }: { city: string; slug: string }) {
  return (
    <section aria-label={`Check your ${city} lot in the Studio`} className="border border-lot-line bg-lot-surface p-4">
      <p className="text-sm leading-relaxed text-lot-ink">
        Explore lot fit, a 3D concept and estimated rent for up to 3 addresses without an account.
      </p>
      <LotAnswerCard
        surface={slug.includes("cost") ? "cost" : "guide"}
        tone="light"
        inputId="guide-lot-address"
        inputLabel={`Your ${city} street address`}
        placeholder={city === "California" ? "Street address, city, CA" : `Street address, ${city}`}
        submitLabel={PRIMARY_CTA_LABEL}
        onLookupStart={() => trackEvent(aduCtaEvent("top"), { city_slug: slug })}
        className="mt-4"
      />
      <p className="mt-4 text-sm leading-relaxed text-lot-stone">
        The optional Certificate adds build cost, net income and payback estimates.{" "}
        <Link href="/sample-certificate/san-diego" prefetch={false} className="underline underline-offset-2">See a sample</Link>
      </p>
      <a href={playStoreCityUrl(slug)} className="mt-1 inline-flex min-h-11 items-center text-sm underline underline-offset-2">
        Get LotFoundry on Google Play
      </a>
    </section>
  );
}
