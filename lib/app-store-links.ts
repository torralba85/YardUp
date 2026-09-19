/**
 * Canonical store identifiers and listing URLs for the LotFoundry apps.
 *
 * Kept in one place because the same two facts are needed by unrelated
 * surfaces — the landing footer link, the PWA manifest's
 * `related_applications`, and the site-wide JSON-LD — and a listing URL that
 * disagrees between them is the kind of drift nobody notices until the link is
 * dead.
 */

/** Android package name, matching the Play Console listing and the TWA shell. */
export const ANDROID_PACKAGE_NAME = "com.lotfoundry.app";

/** Public Google Play listing for the Android app. */
export const GOOGLE_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;

/**
 * Play Store link for an ADU jurisdiction page, tagged with the Play
 * Install Referrer plus UTMs carrying the city slug — so Play Console
 * acquisition reports show which pages actually drive installs.
 *
 * Only ever placed AFTER the visitor has seen their numbers (the
 * end-of-page CTA), never before.
 */
export function playStoreCityUrl(citySlug: string): string {
  const referrer = [
    "utm_source%3Dlotfoundry.net",
    "%26utm_medium%3Dcity_page",
    "%26utm_campaign%3Dadu_guide",
    `%26utm_content%3D${encodeURIComponent(citySlug)}`,
  ].join("");
  return `${GOOGLE_PLAY_URL}&referrer=${referrer}`;
}
