import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaliforniaAduCostGuide } from "./CaliforniaAduCostGuide";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function jsonLd(container: HTMLElement, type: string) {
  const scripts = Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map((node) => JSON.parse(node.textContent ?? "{}"));
  return scripts.find((entry) => entry["@type"] === type);
}

describe("CaliforniaAduCostGuide", () => {
  it("leads with the computed 600 sq ft estimate and a clear limitation", () => {
    render(<CaliforniaAduCostGuide />);

    expect(
      screen.getByText(/estimates \$231,000 to\s+\$289,000 in build cost/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not a California contractor quote or a verified statewide average/i),
    ).toBeInTheDocument();
  });

  it("renders the engine-backed size table and embedded calculator", () => {
    render(<CaliforniaAduCostGuide />);

    const table = screen.getByRole("table", {
      name: "Modeled California ADU build cost by unit size",
    });
    expect(within(table).getByText("$231K-$289K")).toBeInTheDocument();
    expect(within(table).getByText("$453K-$566K")).toBeInTheDocument();
    expect(screen.getByLabelText("County")).toHaveValue("los-angeles");
  });

  it("separates the national construction base from county rent data", () => {
    render(<CaliforniaAduCostGuide />);

    expect(
      screen.getByText(/does not apply an unverified regional price multiplier/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/county-level HUD Fair Market Rent anchors/i)).toBeInTheDocument();
  });

  it("cites primary sources and exposes matching FAQ markup", () => {
    const { container } = render(<CaliforniaAduCostGuide />);
    const sourceSection = screen
      .getByRole("heading", { name: "Sources and estimate basis" })
      .closest("section");

    expect(within(sourceSection as HTMLElement).getByRole("link", { name: /HCD Accessory Dwelling Unit Handbook/ })).toHaveAttribute(
      "href",
      "https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/adu-handbook-update.pdf",
    );
    expect(within(sourceSection as HTMLElement).getByRole("link", { name: /HUD FY2027/ })).toBeInTheDocument();
    expect(within(sourceSection as HTMLElement).getByRole("link", { name: /CSLB contractor-selection/ })).toBeInTheDocument();

    const faq = jsonLd(container, "FAQPage");
    expect(faq.mainEntity).toHaveLength(6);
    expect(faq.mainEntity.map((entry: { name: string }) => entry.name)).toContain(
      "How much does it cost to build an ADU in California?",
    );
    expect(jsonLd(container, "Article").dateModified).toBe("2026-10-07");
  });
});
