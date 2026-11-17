"use client";

import Link from "next/link";
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
 * to the Studio, where a guest's first lookup is free. Rendered at top,
 * mid-page, and end-of-page — never as a sticky banner, and never gated
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
  const router = useRouter();
  const [address, setAddress] = useState("");
  const isCompactTop = placement === "top";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    trackEvent(aduCtaEvent(placement), { city_slug: slug });
    stashAddressQuery(address);
    router.push("/studio");
  }

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
        Free: 3D fit, rent range, build cost and payback — no account needed for your first address.
        Optional $29 Certificate of Feasibility: financing,
        a fee audit and a 3-builder bid checklist.{" "}
        <Link
          href="/#report"
          className={
            isCompactTop
              ? "font-semibold text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink"
              : "font-semibold text-lot-chalk underline underline-offset-2 hover:text-lot-stone-on-dark"
          }
        >
          See a sample
        </Link>
        .
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
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
          className={
            isCompactTop
              ? "min-h-11 flex-1 rounded-control border border-lot-line bg-lot-chalk px-4 text-base text-lot-ink placeholder:text-lot-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink sm:text-sm"
              : "min-h-11 flex-1 rounded-control border border-lot-stone-on-dark bg-lot-surface-dark px-4 text-base text-lot-chalk placeholder:text-lot-stone-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk sm:text-sm"
          }
        />
        <button
          type="submit"
          className={
            isCompactTop
              ? "inline-flex min-h-11 items-center justify-center rounded-control bg-lot-orange px-6 text-sm font-bold text-lot-ink motion-safe:transition hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-surface"
              : "inline-flex min-h-11 items-center justify-center rounded-control bg-lot-orange px-6 text-sm font-bold text-lot-ink motion-safe:transition hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-lot-ink"
          }
        >
          Check my address
        </button>
      </form>
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
