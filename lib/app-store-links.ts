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
