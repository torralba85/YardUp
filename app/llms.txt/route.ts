import { buildLlmsTxt } from "./build-text";

/**
 * `/llms.txt` — the plain-language site summary AI search assistants read.
 *
 * Served as a route rather than a static `public/` file so the jurisdiction
 * list is generated from `ADU_CITIES`, the same source behind
 * `/sitemap-adu.xml`. A hand-maintained copy would silently go stale the
 * first time a city ships.
 */
export function GET(): Response {
  return new Response(buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
