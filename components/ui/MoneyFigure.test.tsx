import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoneyFigure } from "./MoneyFigure";

describe("MoneyFigure", () => {
  it("renders the value formatted as whole-dollar currency", () => {
    render(<MoneyFigure value={2340} unit="/mo" />);
    expect(screen.getByText("$2,340")).toBeInTheDocument();
  });

  it("renders the unit as separate text", () => {
    render(<MoneyFigure value={2340} unit="/mo" />);
    expect(screen.getByText("/mo")).toBeInTheDocument();
  });

  it("omits the unit element when unit is empty", () => {
    render(<MoneyFigure value={500} unit="" />);
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.queryByText("/mo")).not.toBeInTheDocument();
  });

  it("shows the final value immediately under jsdom even when animate is set", () => {
    // useCountUp snaps under reduced motion / jsdom, so animate must not
    // leave the figure showing a partial count.
    render(<MoneyFigure value={9999} animate />);
    expect(screen.getByText("$9,999")).toBeInTheDocument();
  });

  it("sets money in carbon on light surfaces, never green", () => {
    // A LOT MORE retired money-green; money reads through scale and weight in
    // carbon (docs/design/design-system.md 2.6). The old `forest` tone is gone.
    const { container } = render(<MoneyFigure value={100} />);
    expect(container.firstChild).toHaveClass("text-lf-espresso");
    expect((container.firstChild as HTMLElement).className).not.toMatch(/forest|eligible/);
  });

  it("applies the on-dark money tone", () => {
    const { container } = render(<MoneyFigure value={100} tone="onDark" />);
    expect(container.firstChild).toHaveClass("text-lf-money-on-dark");
  });

  it("uses the Cormorant display face with tabular figures", () => {
    const { container } = render(<MoneyFigure value={100} />);
    expect(container.firstChild).toHaveClass("font-display", "tabular-nums");
  });

  it("renders as the requested element", () => {
    const { container } = render(<MoneyFigure value={100} as="div" />);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });
});
