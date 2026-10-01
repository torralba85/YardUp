import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FieldLabel, Input, Select, Segmented, Slider, Textarea } from "./Field";

describe("shared field controls", () => {
  const sharedClasses = [
    "border-lot-stone",
    "focus-visible:ring-lot-orange-ink",
    "aria-[invalid=true]:border-status-blocked",
  ];

  it("Input forwards its ref and native props and uses the shared field recipe", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} id="email" name="email" type="email" autoComplete="email" required aria-label="Email" aria-invalid="true" />);
    const input = screen.getByRole("textbox", { name: "Email" });

    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass(...sharedClasses);
  });

  it("Select forwards its ref and native props and uses the shared field recipe", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} id="category" name="category" required aria-invalid="true" defaultValue="bug">
        <option value="bug">Bug</option>
      </Select>,
    );
    const select = screen.getByRole("combobox");

    expect(ref.current).toBe(select);
    expect(select).toHaveAttribute("id", "category");
    expect(select).toHaveAttribute("name", "category");
    expect(select).toBeRequired();
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveClass(...sharedClasses);
  });

  it("Textarea forwards its ref and native props and uses the shared field recipe", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} id="message" name="message" rows={5} required aria-label="Message" aria-invalid="true" placeholder="Your message" />);
    const textarea = screen.getByRole("textbox", { name: "Message" });

    expect(ref.current).toBe(textarea);
    expect(textarea).toHaveAttribute("id", "message");
    expect(textarea).toHaveAttribute("name", "message");
    expect(textarea).toHaveAttribute("rows", "5");
    expect(textarea).toHaveAttribute("placeholder", "Your message");
    expect(textarea).toBeRequired();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveClass(...sharedClasses, "py-2");
  });
});

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
