import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdvisorIntake } from "@/lib/marketplace-types";
import { AdvisorIntakeSummary } from "./AdvisorIntakeSummary";

const intake: AdvisorIntake = {
  lotSqft: 7332,
  existingFootprintSqft: null,
  zoning: null,
  fireHazard: "high",
  slope: "Not measured",
  dimensions: "20 × 30 ft; 12 ft walls",
  roof: "shed",
  bedroomClass: "1br",
  buildBandLow: 300000,
  buildBandHigh: 400000,
};

function value(label: string) {
  const term = screen.getByText(label, { selector: "dt" });
  return within(term.parentElement as HTMLElement).getByRole("definition");
}

describe("AdvisorIntakeSummary", () => {
  it("words the stored values for people instead of showing raw classes", () => {
    render(<AdvisorIntakeSummary intake={intake} />);

    expect(value("Fire hazard zone")).toHaveTextContent("High");
    expect(value("Roof")).toHaveTextContent("Shed");
    expect(value("Bedrooms (modeled)")).toHaveTextContent("1 bedroom");
    expect(value("Reported zoning")).toHaveTextContent("Not found");
    expect(value("Existing building footprint")).toHaveTextContent("Not confirmed");
  });

  it("separates a parcel outside every mapped fire zone from one that could not be checked", () => {
    const { rerender } = render(<AdvisorIntakeSummary intake={{ ...intake, fireHazard: "none" }} />);
    expect(value("Fire hazard zone")).toHaveTextContent("Not in a mapped zone");

    rerender(<AdvisorIntakeSummary intake={{ ...intake, fireHazard: "unknown" }} />);
    expect(value("Fire hazard zone")).toHaveTextContent("Not confirmed");

    rerender(<AdvisorIntakeSummary intake={{ ...intake, fireHazard: "very-high" }} />);
    expect(value("Fire hazard zone")).toHaveTextContent("Very High");
  });

  it("keeps the builder-facing title by default and takes the homeowner's", () => {
    const { rerender } = render(<AdvisorIntakeSummary intake={intake} />);
    expect(screen.getByRole("region", { name: "Advisor intake summary" })).toBeInTheDocument();

    rerender(<AdvisorIntakeSummary intake={intake} title="Project details shared with builders" />);
    expect(screen.getByRole("heading", { name: "Project details shared with builders" })).toBeInTheDocument();
  });
});
