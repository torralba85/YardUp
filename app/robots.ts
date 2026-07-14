import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * `robots.txt` route. Allows crawling of the public product and marketing
 * surfaces while keeping server API routes out of the index, and points
 * crawlers at the sitemap. Next.js serves this at `/robots.txt`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
