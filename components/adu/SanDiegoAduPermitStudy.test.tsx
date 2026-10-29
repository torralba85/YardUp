import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SanDiegoAduPermitStudy } from "./SanDiegoAduPermitStudy";
import { SAN_DIEGO_PERMIT_STUDY as study } from "@/content/adu/ca/san-diego-permits";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const n = (value: number) => value.toLocaleString("en-US");

function jsonLd(container: HTMLElement, type: string) {
  const scripts = Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map((node) => JSON.parse(node.textContent ?? "{}"));
  return scripts.find((entry) => entry["@type"] === type);
}

describe("SanDiegoAduPermitStudy", () => {
  it("leads with the study totals and the leading planning area", () => {
    render(<SanDiegoAduPermitStudy />);

    const lead = screen.getByText(/issued .* building permits that add backyard homes/);
    expect(lead).toHaveTextContent(n(study.totals.approvals));
    expect(lead).toHaveTextContent(n(study.totals.units));
    expect(lead).toHaveTextContent(`${study.byArea[0].name} led every community planning area`);
    expect(screen.getByText(/it does not show that a\s+unit was finished/)).toBeInTheDocument();
  });

  it("renders one row per year, marking the partial year", () => {
    render(<SanDiegoAduPermitStudy />);

    const table = screen.getByRole("table", { name: "City of San Diego ADU and JADU building permits by year" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(study.byYear.length);
    expect(within(rows[rows.length - 1]).getByRole("rowheader")).toHaveTextContent(/\(through /);
  });

  it("shows the top 20 planning areas and points to the full CSV", () => {
    render(<SanDiegoAduPermitStudy />);

    const table = screen.getByRole("table", { name: "City of San Diego ADU and JADU permits by community planning area" });
    expect(within(table).getAllByRole("row")).toHaveLength(21);
    expect(
      screen.getByRole("link", { name: `Download all ${study.byArea.length} areas as CSV` }),
    ).toHaveAttribute("href", "/adu/ca/san-diego/permits/adu-permits-by-planning-area.csv");
  });

  it("states what was counted and what was left out", () => {
    render(<SanDiegoAduPermitStudy />);

    expect(
      screen.getByText(new RegExp(`${n(study.excluded.withdrawn)} permits the City later recorded as\\s+cancelled or expired`)),
    ).toBeInTheDocument();
    expect(screen.getByText(/no addresses, parcels or names/)).toBeInTheDocument();
  });

  it("publishes Dataset structured data covering the study window", () => {
    const { container } = render(<SanDiegoAduPermitStudy />);

    const dataset = jsonLd(container, "Dataset");
    expect(dataset.temporalCoverage).toBe(`${study.coverage.from}/${study.coverage.to}`);
    expect(dataset.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("rel", "license noopener");
    expect(dataset.distribution.contentUrl).toBe(
      "https://lotfoundry.net/adu/ca/san-diego/permits/adu-permits-by-planning-area.csv",
    );
  });
});
