import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import CaliforniaAduEligibilityPage from "@/app/adu/ca/can-i-build-an-adu/page";
import { GET as getAduSitemap } from "@/app/sitemap-adu.xml/route";
import { AduArticle } from "@/components/adu/AduArticle";
import { AduCostArticle } from "@/components/adu/AduCostArticle";
import { AduMethodology } from "@/components/adu/AduMethodology";
import { CaliforniaAduCostGuide } from "@/components/adu/CaliforniaAduCostGuide";
import { CaliforniaAduRentGuide } from "@/components/adu/CaliforniaAduRentGuide";
import { CaliforniaJaduGuide } from "@/components/adu/CaliforniaJaduGuide";
import { SanDiegoAduPermitStudy } from "@/components/adu/SanDiegoAduPermitStudy";
import {
  ADU_CITIES,
  ADU_COST_PAGES,
  cityUrl,
  costPageUrl,
  eligibilityUrl,
  jaduUrl,
  methodologyUrl,
  permitStudyUrl,
  rentUrl,
  stateCostUrl,
} from "@/lib/adu/content";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function extractArticleJsonLd(container: HTMLElement): {
  datePublished?: string;
  dateModified?: string;
} {
  const nodes = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((node) =>
    JSON.parse(node.textContent ?? "{}"),
  );
  const article = nodes.find((entry) => entry["@type"] === "Article");
  if (!article) throw new Error("Missing Article JSON-LD");
  return article;
}

describe("ADU sitemap <lastmod> vs Article dateModified parity", () => {
  it("synchronizes every rendered Article dateModified with sitemap-adu.xml", async () => {
    const response = await getAduSitemap();
    const xml = await response.text();
    const lastmodByUrl = new Map<string, string>();
    const matches = Array.from(
      xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g),
    );
    for (const match of matches) {
      lastmodByUrl.set(match[1], match[2]);
    }

    const targets: Array<{ url: string; element: ReactElement }> = [
      ...ADU_CITIES.map((city) => ({
        url: cityUrl(city),
        element: <AduArticle content={city} />,
      })),
      ...ADU_COST_PAGES.map((cost) => ({
        url: costPageUrl(cost),
        element: <AduCostArticle cost={cost} />,
      })),
      { url: stateCostUrl(), element: <CaliforniaAduCostGuide /> },
      { url: jaduUrl(), element: <CaliforniaJaduGuide /> },
      { url: rentUrl(), element: <CaliforniaAduRentGuide /> },
      { url: methodologyUrl(), element: <AduMethodology /> },
      { url: permitStudyUrl(), element: <SanDiegoAduPermitStudy /> },
      { url: eligibilityUrl(), element: <CaliforniaAduEligibilityPage /> },
    ];

    for (const { url, element } of targets) {
      const sitemapDate = lastmodByUrl.get(url);
      expect(sitemapDate, `missing sitemap <lastmod> for ${url}`).toBeTruthy();

      const { container } = render(element);
      const article = extractArticleJsonLd(container);
      expect(article.dateModified, `${url} dateModified`).toBe(sitemapDate);
      expect(article.datePublished, `${url} datePublished`).toBeTruthy();
      expect(
        (article.dateModified ?? "") >= (article.datePublished ?? ""),
        `${url} dateModified before datePublished`,
      ).toBe(true);
    }
  });
});
