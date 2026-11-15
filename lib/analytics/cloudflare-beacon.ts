/**
 * Cloudflare Web Analytics beacon, loaded only on the production host.
 *
 * The beacon is cookieless and not consent gated (see `app/privacy/page.tsx`,
 * Section 7), but its token reports whatever host loads it. Rendered
 * unconditionally, every Playwright run against `http://localhost:3000`, in CI
 * and locally, and every `npm run dev` session counted as a lotfoundry.net
 * visit: in October and November 2026 about 96% of the dashboard's visits were
 * `localhost`, from the Desktop Chrome (Windows) and Pixel 5 (Android) device
 * profiles in `playwright.config.ts`.
 *
 * The loader runs inline, before hydration, and injects the beacon only when
 * the page is served from a production host and the session is not automated
 * or marked internal. It applies the same rule as `isAnalyticsSuppressed()` in
 * `./consent`, restated in ES5 because it runs before any bundle loads.
 */

import { INTERNAL_ANALYTICS_MARKER } from "./consent";

/** Public beacon identifier for lotfoundry.net (sent as `token` in `data-cf-beacon`). */
export const CLOUDFLARE_BEACON_ID = "8880d5dd54be4476a38b6372c04d060b";

/** Hosts whose visits belong in the Cloudflare Web Analytics site. */
export const CLOUDFLARE_BEACON_HOSTS: readonly string[] = ["lotfoundry.net", "www.lotfoundry.net"];

export const CLOUDFLARE_BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/**
 * Inline script that appends the beacon to `<body>` when measurement applies.
 *
 * It reads the bare globals `location`, `navigator`, `document`, and
 * `sessionStorage` (not `window.*`) so tests can run it against stand-ins.
 * Every failure path leaves the page without the beacon and never throws.
 */
export const CLOUDFLARE_BEACON_LOADER = `(function(){try{var hosts=${JSON.stringify(
  CLOUDFLARE_BEACON_HOSTS,
)};if(hosts.indexOf(location.hostname)<0)return;if(navigator.webdriver===true)return;try{if(sessionStorage.getItem(${JSON.stringify(
  INTERNAL_ANALYTICS_MARKER,
)})==="1")return;}catch(e){}var s=document.createElement("script");s.defer=true;s.src=${JSON.stringify(
  CLOUDFLARE_BEACON_SRC,
)};s.setAttribute("data-cf-beacon",${JSON.stringify(
  JSON.stringify({ token: CLOUDFLARE_BEACON_ID }),
)});document.body.appendChild(s);}catch(e){}})();`;
