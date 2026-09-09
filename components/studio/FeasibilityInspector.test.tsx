import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import FeasibilityInspector from "./FeasibilityInspector";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";

vi.mock("./AddressSearch", () => ({ default: () => null }));
vi.mock("@/lib/parcel-context", () => ({
  useParcel: () => ({
    parcel: { ...parcelPresets[0], source: "county-gis", zoning: "Unknown", existingHouseSqft: 0 },
    parcelMode: "live", parcelLoading: false, parcelError: null,
    searchParcel: vi.fn(), searchByAddress: vi.fn(), resetToPreset: vi.fn(),
  }),
}));

it("labels unavailable building data and assumed coverage in property facts", () => {
  const parcel = { ...parcelPresets[0], source: "county-gis", zoning: "Unknown", existingHouseSqft: 0 };
  render(<FeasibilityInspector parcelId={parcelPresets[0].id}
    config={defaultAduConfig} assumptions={defaultFinancialAssumptions}
    result={calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions)}
    onParcelChange={vi.fn()} onConfigChange={vi.fn()} onAssumptionsChange={vi.fn()}
    onReset={vi.fn()} onGenerateReport={vi.fn()} />);
  expect(screen.getByText("Existing Footprint").parentElement).toHaveTextContent("Unknown");
  expect(screen.queryByText("0 sf")).not.toBeInTheDocument();
  expect(screen.getByText("Max Coverage").parentElement).toHaveTextContent("40% (assumed)");
});
