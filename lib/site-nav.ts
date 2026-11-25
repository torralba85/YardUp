/**
 * One information architecture for every page header: the marketing landing,
 * the editorial `PublicHeader`, the account/auth `SiteHeader` and the static
 * sample certificate all link the same places with the same words. The logo
 * links home; the Studio is reached through the primary call to action.
 */
export const SITE_NAV_LINKS = [
  { href: "/can-i-build-a-backyard-home", label: "Lot quiz" },
  { href: "/adu/ca", label: "ADU guides" },
  { href: "/adu-cost-calculator", label: "Calculator" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
] as const;

/** The one label for "enter an address in the Studio", used by every header and page CTA. */
export const PRIMARY_CTA_LABEL = "Check my lot";
