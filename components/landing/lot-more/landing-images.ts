import type { StaticImageData } from "next/image";
import backyardLife from "@/public/landing/a-lot-more/backyard-life.webp";
import backyardLifeAvif from "@/public/landing/a-lot-more/backyard-life.avif";
import backyardLifeMobile from "@/public/landing/a-lot-more/backyard-life-mobile.webp";
import backyardLifeMobileAvif from "@/public/landing/a-lot-more/backyard-life-mobile.avif";
import parcelAfter from "@/public/landing/a-lot-more/parcel-after.webp";
import parcelAfterAvif from "@/public/landing/a-lot-more/parcel-after.avif";
import parcelAfterMobile from "@/public/landing/a-lot-more/parcel-after-mobile.webp";
import parcelAfterMobileAvif from "@/public/landing/a-lot-more/parcel-after-mobile.avif";
import parcelBefore from "@/public/landing/a-lot-more/parcel-before.webp";
import parcelBeforeAvif from "@/public/landing/a-lot-more/parcel-before.avif";
import parcelBeforeMobile from "@/public/landing/a-lot-more/parcel-before-mobile.webp";
import parcelBeforeMobileAvif from "@/public/landing/a-lot-more/parcel-before-mobile.avif";
import studioDemoDesktop from "@/public/landing/studio-demo-desktop.webp";
import studioDemoMobile from "@/public/landing/studio-demo-mobile.webp";

/**
 * Homepage art, imported rather than linked by `/landing/...` path so Next
 * serves each file from `/_next/static/media/` under a content hash with the
 * one-year immutable cache. A replaced file gets a new URL, so a returning
 * visitor never keeps a stale copy, and the 1-day `public/` cache no longer
 * makes them download it again.
 *
 * Each photo has a smaller AVIF encode for `<picture>`, with WebP as fallback. The
 * `public/` copies stay for the share card, the Studio and the scripts.
 */

/** A `srcset` of the 768w mobile and 1536w desktop variants. */
function responsive(mobile: StaticImageData, desktop: StaticImageData): string {
  return `${mobile.src} 768w, ${desktop.src} 1536w`;
}

export const HERO_PHOTO = {
  src: backyardLife.src,
  srcSet: responsive(backyardLifeMobile, backyardLife),
  avifSrcSet: responsive(backyardLifeMobileAvif, backyardLifeAvif),
};

export const PARCEL_AFTER = {
  src: parcelAfter.src,
  srcSet: responsive(parcelAfterMobile, parcelAfter),
  avifSrcSet: responsive(parcelAfterMobileAvif, parcelAfterAvif),
};

export const PARCEL_BEFORE = {
  src: parcelBefore.src,
  srcSet: responsive(parcelBeforeMobile, parcelBefore),
  avifSrcSet: responsive(parcelBeforeMobileAvif, parcelBeforeAvif),
};

export const STUDIO_DEMO = {
  desktop: studioDemoDesktop.src,
  mobile: studioDemoMobile.src,
};
