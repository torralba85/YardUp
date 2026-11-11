import { PARCEL_AFTER } from "@/components/landing/lot-more/landing-images";

/**
 * The homepage's illustrative parcel, shown once in each city guide so the
 * page carries a real, described image (image search reads `<img>`, not the
 * inline setback SVG). It is labelled a concept, never a plan for the city.
 * Below the fold, so it loads lazily and never competes with the H1 for LCP.
 */
export function AduConceptFigure({ city }: { city: string }) {
  return (
    <figure className="mt-12">
      <picture>
        <source
          type="image/avif"
          srcSet={PARCEL_AFTER.avifSrcSet}
          sizes="(max-width: 768px) 100vw, 768px"
        />
        <img
          src={PARCEL_AFTER.src}
          srcSet={PARCEL_AFTER.srcSet}
          sizes="(max-width: 768px) 100vw, 768px"
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
          alt="Illustration of a detached backyard home with a glass front and a deck, behind an existing single-family house"
          className="h-auto w-full border border-lot-line"
        />
      </picture>
      <figcaption className="lf-body mt-2 text-sm text-lot-stone">
        Illustrative concept, not a {city} plan. Where a detached backyard home
        fits on your lot depends on the setbacks above and your parcel&apos;s shape.
      </figcaption>
    </figure>
  );
}
