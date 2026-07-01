import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldLabel, Segmented, Slider } from "./Field";

describe("FieldLabel", () => {
  it("renders the label text and an optional value readout", () => {
    render(
      <FieldLabel htmlFor="x" value="$2,340/mo">
        Rent estimate
      </FieldLabel>,
    );
    expect(screen.getByText("Rent estimate")).toBeInTheDocument();
    expect(screen.getByText("$2,340/mo")).toBeInTheDocument();
  });

  it("associates with a control via htmlFor", () => {
    const { container } = render(<FieldLabel htmlFor="rent">Rent</FieldLabel>);
    expect(container.querySelector("label")).toHaveAttribute("for", "rent");
  });
});

describe("Segmented", () => {
  const options = [
    { value: "conservative", label: "Conservative" },
    { value: "market", label: "Market" },
    { value: "optimistic", label: "Optimistic" },
  ] as const;

  it("is an accessible radiogroup with one checked radio per value", () => {
    render(<Segmented aria-label="Rent basis" value="market" onChange={() => {}} options={[...options]} />);
    expect(screen.getByRole("radiogroup", { name: "Rent basis" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Market" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Conservative" })).toHaveAttribute("aria-checked", "false");
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<Segmented aria-label="Rent basis" value="market" onChange={onChange} options={[...options]} />);
    fireEvent.click(screen.getByRole("radio", { name: "Optimistic" }));
    expect(onChange).toHaveBeenCalledWith("optimistic");
  });

  it("moves selection with the arrow keys and wraps", () => {
    const onChange = vi.fn();
    render(<Segmented aria-label="Rent basis" value="market" onChange={onChange} options={[...options]} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Market" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("optimistic");
  });

  it("uses a roving tabindex (only the checked radio is tabbable)", () => {
    render(<Segmented aria-label="Rent basis" value="market" onChange={() => {}} options={[...options]} />);
    expect(screen.getByRole("radio", { name: "Market" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Conservative" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("Slider", () => {
  it("renders a labelled range input with a human value text", () => {
    render(<Slider id="footprint" label="Footprint" valueText="600 sf" min={200} max={1200} value={600} onChange={() => {}} />);
    const input = screen.getByRole("slider", { name: "Footprint" });
    expect(input).toHaveAttribute("type", "range");
    expect(input).toHaveAttribute("aria-valuetext", "600 sf");
  });

  it("fires onChange when moved", () => {
    const onChange = vi.fn();
    render(<Slider id="footprint" label="Footprint" valueText="600 sf" min={200} max={1200} value={600} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider", { name: "Footprint" }), { target: { value: "700" } });
    expect(onChange).toHaveBeenCalled();
  });
});
