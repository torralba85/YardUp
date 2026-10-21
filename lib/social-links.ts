/**
 * Canonical social media profile URLs and handles for LotFoundry.
 *
 * Kept in one central place so metadata, structured data (JSON-LD),
 * AI assistant summaries (/llms.txt), and UI footers reference the
 * exact same sources without drift.
 */

export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/lotfoundry",
  instagram: "https://www.instagram.com/lot_foundry",
  youtube: "https://www.youtube.com/@lotfoundry",
  x: "https://x.com/lot_foundry",
} as const;

export const SOCIAL_URLS: readonly string[] = Object.values(SOCIAL_LINKS);

/**
 * Directory profiles that describe LotFoundry. Listed in structured data and
 * /llms.txt, not as footer icons.
 */
export const DIRECTORY_LINKS = {
  crunchbase: "https://www.crunchbase.com/organization/lotfoundry",
} as const;

export const DIRECTORY_URLS: readonly string[] = Object.values(DIRECTORY_LINKS);
