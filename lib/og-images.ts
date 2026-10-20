import type { Metadata } from "next";

/**
 * Share images. A page that sets its own `openGraph` replaces the root
 * layout's instead of merging with it, so it has to list an image again or its
 * links share as a bare text card.
 */
export const SITE_OG_IMAGE = {
  url: "/lotfoundry-og.png",
  width: 1200,
  height: 630,
  alt: "LotFoundry — ADU planning for homeowners",
};

/** The landing's illustrative parcel, shared by the homepage and the demo landings. */
export const LANDING_OG_IMAGE = {
  url: "/landing/a-lot-more/parcel-after.webp",
  width: 1536,
  height: 1024,
  alt: "An illustrative miniature property with an orange backyard home",
};

/**
 * An `openGraph` block for a page with its own title and URL. Carries the site
 * share image and `type` that replacing the layout's block would otherwise drop.
 */
export function pageOpenGraph(og: { title: string; description: string; url: string }): NonNullable<Metadata["openGraph"]> {
  return { ...og, images: [SITE_OG_IMAGE], type: "website" };
}
