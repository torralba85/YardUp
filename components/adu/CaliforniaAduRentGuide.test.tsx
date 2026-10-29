import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaliforniaAduRentGuide } from "./CaliforniaAduRentGuide";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function jsonLd(container: HTMLElement, type: string) {
  const scripts = Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map((node) => JSON.parse(node.textContent ?? "{}"));
  return scripts.find((entry) => entry["@type"] === type);
}

describe("CaliforniaAduRentGuide", () => {
  it("leads with the computed one-bedroom range and the year-over-year direction", () => {
    const { container } = render(<CaliforniaAduRentGuide />);

    const lead = container.querySelector("p.text-lg");
    expect(lead).toHaveTextContent(
      /runs from \$1,705 a month in Riverside and San Bernardino counties to\s+\$3,003 in San Mateo County/,
    );
    expect(lead).toHaveTextContent(/fell in 8 of the\s+10 HUD rent areas from FY2026/);
    expect(screen.getByText(/not a quote for your backyard home/)).toBeInTheDocument();
  });

  it("renders every county, highest one-bedroom benchmark first", () => {
    render(<CaliforniaAduRentGuide />);

    const table = screen.getByRole("table", {
      name: "HUD FY2027 Fair Market Rents by California county and bedroom count",
    });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(12);
    expect(within(rows[0]).getByText("San Mateo")).toBeInTheDocument();
    expect(within(rows[0]).getByText("$3,003")).toBeInTheDocument();
    const sanDiego = within(table).getByRole("link", { name: "San Diego" });
    expect(sanDiego).toHaveAttribute("href", "/adu/ca/san-diego/cost");
    expect(within(sanDiego.closest("tr")!).getByText("-5.0%")).toBeInTheDocument();
  });

  it("shows the planning range the Studio derives from the HUD figure", () => {
    render(<CaliforniaAduRentGuide />);

    expect(screen.getByText(/that gives\s+\$2,335 to \$2,919\s+a month/)).toBeInTheDocument();
    const table = screen.getByRole("table", {
      name: "LotFoundry planning rent range for a 600 sq ft one-bedroom ADU by county",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(13);
  });

  it("publishes Dataset, Article, FAQ and breadcrumb structured data with the CSV", () => {
    const { container } = render(<CaliforniaAduRentGuide />);

    const dataset = jsonLd(container, "Dataset");
    expect(dataset.distribution.contentUrl).toBe(
      "https://lotfoundry.net/adu/ca/rent/adu-rent-by-county.csv",
    );
    expect(dataset.temporalCoverage).toBe("2026-10-01/2027-09-30");
    expect(dataset.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by/4.0/",
    );
    expect(screen.getByText(/Free to reuse under/).textContent).toMatch(
      /Free to reuse under\s+CC BY 4\.0\s+with a link to this page\./,
    );
    expect(jsonLd(container, "Article").dateModified).toBe("2026-10-28");
    expect(jsonLd(container, "FAQPage").mainEntity.length).toBeGreaterThan(3);
    expect(jsonLd(container, "BreadcrumbList").itemListElement[2].item).toBe(
      "https://lotfoundry.net/adu/ca/rent",
    );
    expect(screen.getAllByRole("link", { name: /CSV/ })[0]).toHaveAttribute(
      "href",
      "/adu/ca/rent/adu-rent-by-county.csv",
    );
  });

  it("cites HUD and labels planning ranges as LotFoundry estimates", () => {
    render(<CaliforniaAduRentGuide />);

    expect(
      screen.getByRole("link", { name: "HUD FY2027 Fair Market Rent Documentation System" }),
    ).toHaveAttribute("href", "https://www.huduser.gov/datasets/fmr/fmr2027");
    expect(screen.getByText(/Planning ranges are LotFoundry estimates, not figures published by HUD/)).toBeInTheDocument();
  });
});
