import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sanDiegoCost } from "@/content/adu/ca/san-diego-cost";
import { chulaVista } from "@/content/adu/ca/chula-vista";
import { sanDiego } from "@/content/adu/ca/san-diego";
import { sacramento } from "@/content/adu/ca/sacramento";
import { sanJose } from "@/content/adu/ca/san-jose";
import { cityLastModified } from "@/lib/adu/dates";
import { AduArticle } from "./AduArticle";
import { AduCostArticle } from "./AduCostArticle";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function faqJsonLd(container: HTMLElement) {
  const scripts = Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map((node) => JSON.parse(node.textContent ?? "{}"));
  return scripts.find((entry) => entry["@type"] === "FAQPage");
}

describe("AduCostArticle", () => {
  it("leads with the engine's 600 sq ft San Diego estimate and its provenance", () => {
    render(<AduCostArticle cost={sanDiegoCost} />);
    expect(
      screen.getByText(/estimates \$231,000 to \$289,000\s+to build/),
    ).toBeInTheDocument();
    expect(screen.getByText(/simple payback is about\s+13\.3\s+years/)).toBeInTheDocument();
    // Beside the rent table and again under "What the estimate includes".
    expect(screen.getAllByText(/HUD FMR · San Diego County, CA/)).toHaveLength(2);
  });

  it("tables build cost per size with per-square-foot ranges", () => {
    render(<AduCostArticle cost={sanDiegoCost} />);
    const table = screen.getByRole("table", { name: /build cost in San Diego by unit size/ });
    expect(within(table).getByText("$157K–$197K")).toBeInTheDocument();
    expect(within(table).getByText("$453K–$566K")).toBeInTheDocument();
    expect(within(table).getByText("$385–$482")).toBeInTheDocument();
  });

  it("starts the embedded calculator on San Diego County", () => {
    render(<AduCostArticle cost={sanDiegoCost} />);
    expect(screen.getByLabelText("County")).toHaveValue("san-diego");
  });

  it("computes FAQ figures into the FAQPage markup instead of typing them", () => {
    const { container } = render(<AduCostArticle cost={sanDiegoCost} />);
    const faq = faqJsonLd(container);
    const answers = faq.mainEntity.map((entry: { acceptedAnswer: { text: string } }) => entry.acceptedAnswer.text);
    expect(faq.mainEntity).toHaveLength(8);
    expect(answers.join(" ")).toContain("$2,335 for one bedroom");
    expect(answers.join(" ")).toContain("about 9.6 years for 400 sq ft to 21.5 years for 1,200 sq ft");
  });

  it("links back to the San Diego rules guide and the county guides it covers", () => {
    render(<AduCostArticle cost={sanDiegoCost} />);
    const section = screen.getByRole("heading", { name: "Elsewhere in San Diego County" }).closest("section");
    expect(section).not.toBeNull();
    const links = within(section as HTMLElement).getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(links).toEqual([
      "/adu/ca/san-diego",
      "/adu/ca/chula-vista",
      "/adu/ca/oceanside",
      "/adu/ca/escondido",
      "/adu/ca/carlsbad",
      "/adu/ca/imperial-beach",
      "/adu/ca/la-mesa",
      "/adu/ca/san-marcos",
      "/adu/ca/san-diego-county",
      "/adu/ca/encinitas",
      "/adu/ca/el-cajon",
      "/adu/ca/vista",
    ]);
  });
});

describe("AduArticle after the San Diego cost split", () => {
  it("drops the rent and payback tables from the San Diego rules guide and links to the cost page", () => {
    render(<AduArticle content={sanDiego} />);
    expect(screen.queryByRole("heading", { name: /What it rents for/ })).toBeNull();
    expect(screen.queryByText(/What to ask for in a San Diego ADU quote/)).toBeNull();
    const fees = screen.getByRole("heading", { name: "Permit fees" }).closest("section");
    expect(within(fees as HTMLElement).getByRole("link", { name: "ADU Cost in San Diego (2026)" })).toHaveAttribute(
      "href",
      "/adu/ca/san-diego/cost",
    );
  });

  it("shows one described, lazy concept image that is labelled as illustrative", () => {
    render(<AduArticle content={chulaVista} />);
    const image = screen.getByRole("img", { name: /Illustration of a detached backyard home/ });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("width", "1536");
    expect(image).toHaveAttribute("height", "1024");
    expect(screen.getByText(/Illustrative concept, not a Chula Vista plan/)).toBeInTheDocument();
  });

  it("points a covered county guide at the countywide cost page", () => {
    render(<AduArticle content={chulaVista} />);
    expect(screen.getByText(/Countywide build cost, rent and payback estimates/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ADU Cost in San Diego (2026)" })).toHaveAttribute(
      "href",
      "/adu/ca/san-diego/cost",
    );
    expect(screen.getByRole("link", { name: "what an ADU costs across California" })).toHaveAttribute(
      "href",
      "/adu/ca/cost",
    );
  });
});

describe("AduArticle breadcrumb markup", () => {
  it("lists the hub once, so no two steps point at the same page", () => {
    const { container } = render(<AduArticle content={sanDiego} />);
    const breadcrumb = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    )
      .map((node) => JSON.parse(node.textContent ?? "{}"))
      .find((entry) => entry["@type"] === "BreadcrumbList");
    const items = breadcrumb.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map((entry) => entry.position)).toEqual([1, 2, 3]);
    expect(items.map((entry) => entry.name)).toEqual(["Home", "California ADU rules", "City of San Diego"]);
    expect(new Set(items.map((entry) => entry.item)).size).toBe(items.length);
  });
});

describe("AduArticle article markup and related guides", () => {
  function articleJsonLd(container: HTMLElement) {
    return Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map((node) => JSON.parse(node.textContent ?? "{}"))
      .find((entry) => entry["@type"] === "Article");
  }

  it("gives the Article its share image and synchronized lastmod date", () => {
    const { container } = render(<AduArticle content={sanDiego} />);
    const article = articleJsonLd(container);
    expect(article.image).toBe("https://lotfoundry.net/adu/ca/san-diego/opengraph-image");
    expect(article.datePublished).toBe(sanDiego.published);
    expect(article.dateModified).toBe(cityLastModified(sanDiego.slug, sanDiego.asOf));
  });

  it("never dates the last edit before publication", () => {
    // Sacramento's rules were checked the day before the guide went live.
    expect(sacramento.asOf < sacramento.published).toBe(true);
    const { container } = render(<AduArticle content={sacramento} />);
    const modified = articleJsonLd(container).dateModified as string;
    expect(modified >= sacramento.published).toBe(true);
    expect(modified).toBe(cityLastModified(sacramento.slug, sacramento.asOf));
  });

  it("links a metro's first guide to the other counties' guides", () => {
    render(<AduArticle content={sanJose} />);
    const nav = screen.getByRole("navigation", { name: "Neighboring jurisdictions" });
    expect(within(nav).getByRole("heading", { name: "ADU rules elsewhere in California" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "City of San Diego ADU rules" })).toHaveAttribute("href", "/adu/ca/san-diego");
    expect(within(nav).getByRole("link", { name: "ADU rules in Sacramento" })).toHaveAttribute("href", "/adu/ca/sacramento");
  });

  it("keeps nearby cities, not other counties, on guides that have neighbors", () => {
    render(<AduArticle content={chulaVista} />);
    const nav = screen.getByRole("navigation", { name: "Neighboring jurisdictions" });
    expect(within(nav).getByRole("heading", { name: "ADU rules in nearby cities" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "ADU rules in Sacramento" })).not.toBeInTheDocument();
  });
});
