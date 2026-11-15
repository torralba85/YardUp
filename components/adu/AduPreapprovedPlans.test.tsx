import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { carlsbad } from "@/content/adu/ca/carlsbad";
import { chulaVista } from "@/content/adu/ca/chula-vista";
import { oceanside } from "@/content/adu/ca/oceanside";
import { sanDiego } from "@/content/adu/ca/san-diego";
import { ADU_CITIES } from "@/lib/adu/content";
import { guidePlanCatalog } from "@/lib/preapproved-plans";
import { AduArticle } from "./AduArticle";
import { AduPreapprovedPlans } from "./AduPreapprovedPlans";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("AduPreapprovedPlans", () => {
  it("lists Carlsbad's four curated plans with official links and no lot-approval claim", () => {
    render(<AduPreapprovedPlans content={carlsbad} />);
    const section = screen.getByRole("region", { name: "Official pre-approved ADU plans for Carlsbad" });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByRole("heading", { name: "Carlsbad Permit-Ready Studio" })).toBeInTheDocument();
    expect(within(items[0]).getByText("400 sq ft · Studio")).toBeInTheDocument();
    expect(within(items[0]).getByRole("link", { name: "Official listing" })).toHaveAttribute(
      "href",
      "https://www.carlsbadca.gov/departments/community-development/planning/adu-permit-ready-program",
    );
    // The three-bedroom is L-shaped: its outer bounds are never passed off as a rectangle.
    expect(within(items[3]).getByText(/Not rectangular; outer bounds/)).toBeInTheDocument();
    expect(within(section).getByText(/not an approval\s+for a particular lot/)).toBeInTheDocument();
    expect(within(section).getByText(/Official listing checked 2026-11-05/)).toBeInTheDocument();
  });

  it("renders nothing for a verified program without curated plans or an unverified one", () => {
    const { container: verifiedWithoutPlans } = render(<AduPreapprovedPlans content={chulaVista} />);
    expect(verifiedWithoutPlans).toBeEmptyDOMElement();
    const { container: unverified } = render(<AduPreapprovedPlans content={oceanside} />);
    expect(unverified).toBeEmptyDOMElement();
  });

  it("places the plans inside the full city article, ahead of the closing address CTA", () => {
    render(<AduArticle content={sanDiego} />);
    const section = screen.getByRole("region", { name: "Official pre-approved ADU plans for San Diego" });
    expect(within(section).getAllByRole("listitem").length).toBeGreaterThan(0);
    const ctas = screen.getAllByRole("region", { name: "Check your San Diego lot in the Studio" });
    const closingCta = ctas.at(-1);
    expect(closingCta).toBeDefined();
    expect(section.compareDocumentPosition(closingCta as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps guide copy consistent with the catalog: no guide calls its curated plans unavailable", () => {
    for (const city of ADU_CITIES) {
      if (!guidePlanCatalog(city.state, city.slug)) continue;
      const copy = JSON.stringify(city);
      expect(copy, `${city.slug} guide says its plans are unavailable`).not.toMatch(
        /(?:plans|program)[^."]{0,80}\b(?:temporarily unavailable|listed as unavailable|lists those plans as unavailable)/i,
      );
    }
  });
});
