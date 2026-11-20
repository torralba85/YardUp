export const dynamic = "force-static";

const BASE_URL = "https://lotfoundry.net";

/** Render robots.txt with AI Content-Signal preferences and both sitemaps. */
function buildRobotsTxt(): string {
  return [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "",
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    `Sitemap: ${BASE_URL}/sitemap-adu.xml`,
    "",
  ].join("\n");
}

export function GET(): Response {
  return new Response(buildRobotsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
