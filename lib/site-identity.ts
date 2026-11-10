import { CANONICAL_ORIGIN } from "@/lib/canonical-origin";
import { GOOGLE_PLAY_URL } from "@/lib/app-store-links";
import { DIRECTORY_URLS, SOCIAL_URLS } from "@/lib/social-links";

/** The name search results and link previews should show for the site. */
export const SITE_NAME = "LotFoundry";

const siteUrl = `${CANONICAL_ORIGIN.replace(/\/+$/, "")}/`;

/**
 * The company behind the site. The `@id` makes every mention one entity: the
 * layout's SoftwareApplication `publisher` and the homepage's WebSite node
 * point at this node rather than describing a second Organization.
 */
export const ORGANIZATION_JSON_LD = {
  "@type": "Organization",
  "@id": `${siteUrl}#organization`,
  name: SITE_NAME,
  alternateName: ["Lot Foundry"],
  // The name the Terms and Privacy Policy contract under: one word, no hyphen
  // (as on the IRS EIN notice), with the LLC designator California requires.
  legalName: "VeriShare LLC",
  // Stated on /about; keep the two in step.
  founder: { "@type": "Person", name: "Andrew Torralba", jobTitle: "CEO" },
  url: siteUrl,
  logo: `${CANONICAL_ORIGIN}/icon-512-transparent.png`,
  // `sameAs` is how Google resolves scattered profiles into one entity, so
  // it only ever lists URLs that actually resolve. A 404 here is a negative
  // signal, not a neutral one — add each social profile when it is claimed,
  // never ahead of it.
  sameAs: [GOOGLE_PLAY_URL, ...SOCIAL_URLS, ...DIRECTORY_URLS],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@lotfoundry.net",
    url: `${CANONICAL_ORIGIN}/feedback`,
  },
};

/**
 * Homepage JSON-LD. Google takes the site name in results from a WebSite node
 * and the logo from a top-level Organization, and reads both from the
 * homepage only, so neither belongs in the site-wide layout markup.
 */
export const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      url: siteUrl,
      name: SITE_NAME,
      alternateName: ORGANIZATION_JSON_LD.alternateName,
      publisher: { "@id": ORGANIZATION_JSON_LD["@id"] },
    },
    ORGANIZATION_JSON_LD,
  ],
};
