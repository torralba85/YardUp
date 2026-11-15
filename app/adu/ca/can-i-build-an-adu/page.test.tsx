import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CaliforniaAduEligibilityPage, { metadata } from "./page";
import { ELIGIBILITY_GUIDE_AS_OF } from "@/lib/adu/dates";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("/adu/ca/can-i-build-an-adu page", () => {
  it("sets self-canonical metadata and concise SEO title/description", () => {
    expect(metadata.alternates?.canonical).toBe("https://lotfoundry.net/adu/ca/can-i-build-an-adu");
    expect(String(metadata.title).length).toBeLessThanOrEqual(60);
    expect(String(metadata.description).length).toBeGreaterThanOrEqual(70);
    expect(String(metadata.description).length).toBeLessThanOrEqual(155);
  });

  it("renders the direct answer, 5 parcel checks, FAQPage schema, and synchronized Article dateModified", () => {
    const { container } = render(<CaliforniaAduEligibilityPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Can I Build an ADU on My Property in California/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/backyard home \(ADU\)/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Five parcel checks/i })).toBeInTheDocument();

    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((node) =>
      JSON.parse(node.textContent ?? "{}"),
    );
    const article = schemas.find((s) => s["@type"] === "Article");
    const breadcrumb = schemas.find((s) => s["@type"] === "BreadcrumbList");
    const faq = schemas.find((s) => s["@type"] === "FAQPage");

    expect(article?.dateModified).toBe(ELIGIBILITY_GUIDE_AS_OF);
    expect(breadcrumb?.itemListElement).toHaveLength(3);
    expect(faq?.mainEntity).toHaveLength(5);
  });
});
