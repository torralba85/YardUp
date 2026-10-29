import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CaliforniaJaduGuide } from "./CaliforniaJaduGuide";
import { JADU_FAQS, JADU_GLANCE, JADU_SOURCES } from "@/content/adu/ca/jadu";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function jsonLd(container: HTMLElement, type: string) {
  const scripts = Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map((node) => JSON.parse(node.textContent ?? "{}"));
  return scripts.find((entry) => entry["@type"] === type);
}

describe("CaliforniaJaduGuide", () => {
  it("answers what a JADU is in the first paragraph", () => {
    const { container } = render(<CaliforniaJaduGuide />);
    const lead = container.querySelector("p.text-lg");
    expect(lead).toHaveTextContent(/up to 500 square feet of interior\s+living space/);
    expect(lead).toHaveTextContent(/including an\s+attached garage/);
  });

  it("states the 2026 owner-occupancy and rental rules from Gov. Code §66333", () => {
    render(<CaliforniaJaduGuide />);
    const table = screen.getByRole("table", { name: "California junior ADU rules under state law" });
    const owner = within(table).getByRole("rowheader", { name: "Owner on site" }).closest("tr")!;
    expect(owner).toHaveTextContent("Required only if the JADU shares bathroom facilities with the home");
    expect(owner).toHaveTextContent("§66333(b), since January 1, 2026");
    const rentals = within(table).getByRole("rowheader", { name: "Renting it out" }).closest("tr")!;
    expect(rentals).toHaveTextContent("longer than 30 days; no short-term rentals");
    expect(within(table).getAllByRole("row")).toHaveLength(JADU_GLANCE.length);
  });

  it("cites a statute or the HCD handbook for every rule, and no invented price", () => {
    for (const row of JADU_GLANCE) {
      expect(row.note, row.label).toMatch(/§\d{5}/);
    }
    expect(JSON.stringify(JADU_GLANCE)).not.toMatch(/\$\d/);
    expect(JADU_SOURCES.every((source) => source.url.startsWith("https://"))).toBe(true);
  });

  it("compares a JADU with an ADU side by side", () => {
    render(<CaliforniaJaduGuide />);
    const table = screen.getByRole("table", { name: "Junior ADU compared with a standard ADU" });
    const size = within(table).getByRole("rowheader", { name: "Size" }).closest("tr")!;
    expect(size).toHaveTextContent("Up to 500 sq ft");
    expect(size).toHaveTextContent("800 sq ft");
  });

  it("marks up every question as an FAQ with breadcrumbs back to the hub", () => {
    const { container } = render(<CaliforniaJaduGuide />);
    expect(JADU_FAQS.length).toBeGreaterThanOrEqual(6);
    expect(jsonLd(container, "FAQPage").mainEntity).toHaveLength(JADU_FAQS.length);
    const crumbs = jsonLd(container, "BreadcrumbList").itemListElement;
    expect(crumbs[1].item).toBe("https://lotfoundry.net/adu/ca");
    expect(crumbs[2].item).toBe("https://lotfoundry.net/adu/ca/jadu");
    expect(screen.getByRole("link", { name: "Sacramento" })).toHaveAttribute("href", "/adu/ca/sacramento");
  });
});
