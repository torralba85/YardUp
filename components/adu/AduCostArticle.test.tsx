import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sanDiegoCost } from "@/content/adu/ca/san-diego-cost";
import { chulaVista } from "@/content/adu/ca/chula-vista";
import { sanDiego } from "@/content/adu/ca/san-diego";
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
    expect(screen.getByText(/simple payback is about\s+12\.6\s+years/)).toBeInTheDocument();
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
    expect(answers.join(" ")).toContain("$2,459 for one bedroom");
    expect(answers.join(" ")).toContain("about 10.1 years for 400 sq ft to 19.5 years for 1,200 sq ft");
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

  it("points a covered county guide at the countywide cost page", () => {
    render(<AduArticle content={chulaVista} />);
    expect(screen.getByText(/Countywide build cost, rent and payback estimates/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ADU Cost in San Diego (2026)" })).toHaveAttribute(
      "href",
      "/adu/ca/san-diego/cost",
    );
  });
});
