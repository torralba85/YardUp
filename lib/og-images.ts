import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site-identity";

/**
 * Share images. A page that sets its own `openGraph` replaces the root
 * layout's instead of merging with it, so it has to list an image again or its
 * links share as a bare text card.
 *
 * One card for the homepage, the demo landings and the support pages: a
 * 1200x630 PNG (the 1.91:1 frame link previews crop to) that already carries
 * the landing's parcel illustration. The raw 1536x1024 WebP it replaced was
 * cropped by previews and is unsupported by some link scrapers.
 */
export const SITE_OG_IMAGE = {
  url: "/lotfoundry-og.png",
  width: 1200,
  height: 630,
  alt: "LotFoundry — ADU planning for homeowners",
};

/**
 * An `openGraph` block for a page with its own title and URL. Carries the site
 * share image, `type` and site name that replacing the layout's block would
 * otherwise drop.
 */
export function pageOpenGraph(og: { title: string; description: string; url: string }): NonNullable<Metadata["openGraph"]> {
  return { ...og, images: [SITE_OG_IMAGE], type: "website", siteName: SITE_NAME };
}
