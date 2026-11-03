import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { SOCIAL_URLS } from "@/lib/social-links";

/**
 * LotFoundry's public name, address and phone. The site footers and the
 * Organization JSON-LD both read these, so search engines see the same
 * business wherever it appears. The phone is the business line printed in
 * /privacy and /terms (Andrew, 2026-11-03), not a personal number.
 */
export const BUSINESS = {
  name: "LotFoundry",
  streetAddress: "1150 E St #202",
  locality: "San Diego",
  region: "CA",
  postalCode: "92101",
  country: "US",
  phone: "(419) 669-6663",
  telephone: "+1-419-669-6663",
} as const;

/** "1150 E St #202, San Diego, CA 92101" */
export const BUSINESS_ADDRESS_LINE = `${BUSINESS.streetAddress}, ${BUSINESS.locality}, ${BUSINESS.region} ${BUSINESS.postalCode}`;

export const BUSINESS_PHONE_HREF = `tel:${BUSINESS.telephone.replaceAll("-", "")}`;

/**
 * Shared with the SoftwareApplication publisher in `app/layout.tsx`, so search
 * engines read the two Organization nodes as one business.
 */
export const ORGANIZATION_ID = `${CANONICAL_ORIGIN}/#organization`;

/**
 * Organization JSON-LD for the homepage and /about. Every fact is printed in
 * the footer of both pages; `sameAs` lists only profiles that resolve.
 */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: BUSINESS.name,
  url: `${CANONICAL_ORIGIN}/`,
  logo: `${CANONICAL_ORIGIN}/icon-512-transparent.png`,
  telephone: BUSINESS.telephone,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.locality,
    addressRegion: BUSINESS.region,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.country,
  },
  sameAs: SOCIAL_URLS,
};
