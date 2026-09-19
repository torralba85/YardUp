import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
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

it("opens desktop Design at usable controls without repeating the property journey", async () => {
  const user = userEvent.setup();
  const onConfigChange = vi.fn();
  render(<FeasibilityInspector designOnly parcelId={parcelPresets[0].id}
    config={defaultAduConfig} assumptions={defaultFinancialAssumptions}
    result={calculateFeasibility(parcelPresets[0], defaultAduConfig, defaultFinancialAssumptions)}
    onParcelChange={vi.fn()} onConfigChange={onConfigChange} onAssumptionsChange={vi.fn()}
    onReset={vi.fn()} onGenerateReport={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "Design your ADU" })).toBeVisible();
  expect(screen.queryByRole("button", { name: /Your Property/ })).not.toBeInTheDocument();
  expect(screen.queryByText("Money model")).not.toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Exterior finish" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "400 sf" }));
  expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ footprint: 400 }));
  expect(screen.getByLabelText("Width (ft)")).not.toBeVisible();
  await user.click(screen.getByText("Fine-tune dimensions", { exact: true }));
  expect(screen.getByLabelText("Width (ft)")).toBeVisible();
});

it("announces fine-tune slider values with their units", async () => {
  const user = userEvent.setup();
  render(<FeasibilityInspector designOnly parcelId={parcelPresets[0].id}
    config={defaultAduConfig} assumptions={defaultFinancialAssumptions}
    result={calculateFeasibility(parcelPresets[0], defaultAduConfig, defaultFinancialAssumptions)}
    onParcelChange={vi.fn()} onConfigChange={vi.fn()} onAssumptionsChange={vi.fn()}
    onReset={vi.fn()} onGenerateReport={vi.fn()} />);
  await user.click(screen.getByText("Fine-tune dimensions", { exact: true }));
  expect(screen.getByRole("slider", { name: "Width" })).toHaveAttribute("aria-valuetext", `${defaultAduConfig.width} ft`);
  expect(screen.getByRole("slider", { name: "Length" })).toHaveAttribute("aria-valuetext", `${defaultAduConfig.length} ft`);
});
