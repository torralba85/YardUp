"use client";

import Link from "next/link";
import { LotAnswerCard } from "@/components/adu/LotAnswerCard";
import { aduCtaEvent, type AduCtaPlacement } from "@/lib/adu/types";
import { trackEvent } from "@/lib/analytics/gtag";
import { playStoreCityUrl } from "@/lib/app-store-links";
import { PRIMARY_CTA_LABEL } from "@/lib/site-nav";

/**
 * Address-entry call to action for ADU jurisdiction and cost pages.
 *
 * Firebase-free client island: runs an inline lot lookup directly on the page
 * (geocode -> parcel -> feasibility + modeled fit) and hands the resolved parcel
 * into `/studio` via session storage when the visitor clicks "Open in 3D".
 * Never puts addresses in URLs or GA4, and never gates the first 3 lookups
 * behind email capture or signup.
 *
 * Only `placement === "mid"` emits an `<h2>` so the document outline never
 * duplicates headings (`top` and `end` use styled paragraphs).
 */
export function AduStudioCta({
  city,
  slug,
  placement,
  heading = "These are the rules. Here is what they mean for your lot.",
}: {
  city: string;
  slug: string;
  placement: AduCtaPlacement;
  /** Overrides the rules-page heading, e.g. on a cost page. */
  heading?: string;
}) {
  const isCompactTop = placement === "top";
  const surface =
    slug.includes("cost") || slug === "adu-cost-calculator" ? "cost" : "guide";

  return (
    <section
      aria-label={`Check your ${city} lot in the Studio`}
      className={
        isCompactTop
          ? "rounded-none border border-lot-line bg-lot-surface px-5 py-5 text-lot-ink sm:px-6"
          : "rounded-none bg-lot-ink px-6 py-8 text-lot-chalk sm:px-10"
      }
    >
      {placement === "mid" ? (
        <h2 className="font-display text-2xl font-medium tracking-tight">
          {heading}
        </h2>
      ) : (
        <p
          className={
            isCompactTop
              ? "font-display text-lg font-medium tracking-tight text-lot-ink"
              : "font-display text-2xl font-medium tracking-tight text-lot-chalk"
          }
        >
          {isCompactTop ? `Check your ${city} address in 3D` : heading}
        </p>
      )}
      <p
        className={
          isCompactTop
            ? "mt-1.5 max-w-prose text-sm leading-relaxed text-lot-stone"
            : "mt-2 max-w-prose text-sm leading-relaxed text-lot-stone-on-dark"
        }
      >
        Free: lot fit, 3D concept, and rent range — no account needed for up
        to 3 addresses. Optional $29 Certificate of Feasibility: build cost,
        net income and payback, financing scenarios, fee and permit checks to confirm locally,
        an AI Project Brief, and a checklist for comparing builder quotes.{" "}
        <Link
          href="/#report"
          className={
            isCompactTop
              ? "font-semibold text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
              : "font-semibold text-lot-chalk underline decoration-lot-stone-on-dark underline-offset-2 hover:decoration-lot-chalk hover:decoration-2 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk"
          }
        >
          See a sample
        </Link>
        .
      </p>
      <LotAnswerCard
        surface={surface}
        tone={isCompactTop ? "light" : "dark"}
        inputId={`adu-studio-address-${placement}`}
        inputLabel={`Your ${city} street address`}
        placeholder={city === "California" ? "Street address, city, CA" : `Street address, ${city}`}
        submitLabel={PRIMARY_CTA_LABEL}
        onLookupStart={() => trackEvent(aduCtaEvent(placement), { city_slug: slug })}
        className="mt-4"
      />
      {placement === "end" ? (
        <p className="mt-4 text-sm leading-relaxed text-lot-stone-on-dark">
          Prefer the app?{" "}
          <a
            href={playStoreCityUrl(slug)}
            className="underline underline-offset-2 hover:text-lot-chalk"
          >
            Get LotFoundry on Google Play
          </a>
          .
        </p>
      ) : null}
    </section>
  );
}
