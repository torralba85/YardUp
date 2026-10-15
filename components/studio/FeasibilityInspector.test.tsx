import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import FeasibilityInspector from "./FeasibilityInspector";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets, type ADUConfig } from "@/lib/feasibility";

function StatefulDesign({ initialConfig = defaultAduConfig }: { initialConfig?: ADUConfig }) {
  const [config, setConfig] = useState(initialConfig);
  return <FeasibilityInspector designOnly parcelId={parcelPresets[0].id}
    config={config} assumptions={defaultFinancialAssumptions}
    result={calculateFeasibility(parcelPresets[0], config, defaultFinancialAssumptions)}
    onParcelChange={vi.fn()} onConfigChange={setConfig} onAssumptionsChange={vi.fn()}
    onReset={vi.fn()} onGenerateReport={vi.fn()} />;
}

function dimensionControls(name: "Width" | "Length") {
  return {
    field: screen.getByLabelText(`${name} (ft)`) as HTMLInputElement,
    slider: screen.getByRole("slider", { name }) as HTMLInputElement,
  };
}

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
  expect(screen.getByRole("radiogroup", { name: "Exterior finish" })).toBeVisible();
  await user.click(screen.getByRole("radio", { name: "400 sf" }));
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

it("keeps sliders and fields on one 2,000 sf bound when both sliders hit their ends", async () => {
  const user = userEvent.setup();
  render(<StatefulDesign />);
  await user.click(screen.getByText("Fine-tune dimensions", { exact: true }));
  // End on Width, then End on Length (the reviewed 600 sf reproduction).
  for (const name of ["Width", "Length"] as const) {
    const { slider } = dimensionControls(name);
    fireEvent.change(slider, { target: { value: slider.max } });
  }
  const width = dimensionControls("Width");
  const length = dimensionControls("Length");
  expect(Number(width.field.value) * Number(length.field.value)).toBeLessThanOrEqual(2000);
  for (const { field, slider } of [width, length]) {
    expect(field).toBeValid();
    expect(slider.max).toBe(field.max);
    expect(slider.min).toBe(field.min);
    expect(slider.value).toBe(field.value);
  }
});

it("shows a half-foot design narrower than the usual minimum in both controls", async () => {
  const user = userEvent.setup();
  render(<StatefulDesign initialConfig={{ ...defaultAduConfig, width: 10.5, length: 30, footprint: 315 }} />);
  await user.click(screen.getByText("Fine-tune dimensions", { exact: true }));
  const { field, slider } = dimensionControls("Width");
  expect(field).toBeValid();
  expect(field.value).toBe("10.5");
  expect(slider.value).toBe("10.5");
});
