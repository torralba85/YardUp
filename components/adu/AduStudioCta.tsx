"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { stashAddressQuery } from "@/lib/address-handoff";
import { aduCtaEvent, type AduCtaPlacement } from "@/lib/adu/types";
import { trackEvent } from "@/lib/analytics/gtag";
import { playStoreCityUrl } from "@/lib/app-store-links";

/**
 * Address-entry call to action for ADU jurisdiction pages.
 *
 * A tiny Firebase-free client island: typing an address stashes it in
 * session storage (never the URL, per the project privacy rule) and routes
 * to the Studio, where a guest's first lookup is free. Rendered once
 * mid-page and once at the end of every jurisdiction article — never as a
 * sticky banner, and never gated behind email capture or signup.
 *
 * Submissions are instrumented per placement (`adu_cta_mid` vs
 * `adu_cta_end`) so mid-page and end-of-page conversion can be told apart.
 * The end placement additionally carries the Play Store link tagged with
 * the city slug — only after the visitor has seen their numbers, never
 * before.
 */
export function AduStudioCta({
  city,
  slug,
  placement,
}: {
  city: string;
  slug: string;
  placement: AduCtaPlacement;
}) {
  const router = useRouter();
  const [address, setAddress] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    trackEvent(aduCtaEvent(placement), { city_slug: slug });
    stashAddressQuery(address);
    router.push("/studio");
  }

  return (
    <section
      aria-label={`Check your ${city} lot in the Studio`}
      className="rounded-none bg-lf-espresso px-6 py-8 text-lf-sand sm:px-10"
    >
      <h2 className="font-display text-2xl font-bold tracking-tight">
        These are the rules. Here is what they mean for your lot.
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-lf-unit-on-dark">
        Enter your {city} address to see rent, build-cost, and payback
        estimates for your specific parcel. Free to explore — no account
        needed for your first address.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`adu-studio-address-${placement}`} className="sr-only">
          Your {city} street address
        </label>
        <input
          id={`adu-studio-address-${placement}`}
          type="text"
          autoComplete="street-address"
          placeholder="123 Main St, San Diego, CA"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="min-h-11 flex-1 rounded-[3px] border border-lf-hairline/30 bg-lf-dark-surface px-4 text-sm text-lf-sand placeholder:text-lf-unit-on-dark/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-sand"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-[3px] bg-lot-orange px-6 text-sm font-bold text-lf-espresso motion-safe:transition hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-sand focus-visible:ring-offset-2 focus-visible:ring-offset-lf-espresso"
        >
          Check my address
        </button>
      </form>
      {placement === "end" ? (
        <p className="mt-4 text-sm leading-relaxed text-lf-unit-on-dark">
          Prefer the app?{" "}
          <a
            href={playStoreCityUrl(slug)}
            className="underline underline-offset-2 hover:text-lf-sand"
          >
            Get LotFoundry on Google Play
          </a>
          .
        </p>
      ) : null}
    </section>
  );
}
