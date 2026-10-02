import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusChip } from "./StatusChip";

describe("StatusChip", () => {
  it("renders a default label per status", () => {
    render(<StatusChip status="clear" />);
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("lets the label be overridden", () => {
    render(<StatusChip status="review" label="Needs review" />);
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("always pairs the label with an icon (never colour alone)", () => {
    const { container } = render(<StatusChip status="blocked" />);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("hides the icon from assistive tech (the label carries the meaning)", () => {
    const { container } = render(<StatusChip status="clear" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden");
  });

  it("uses the AA-safe amber ink for the review tone on light surfaces", () => {
    const { container } = render(<StatusChip status="review" />);
    expect(container.firstChild).toHaveClass("text-status-review");
  });

  it("uses forest for the clear tone", () => {
    const { container } = render(<StatusChip status="clear" />);
    expect(container.firstChild).toHaveClass("text-status-eligible");
  });

  it("is rectangular, not a pill (chips are read-only data)", () => {
    // Read-only badges are square; only interactive controls receive 3px.
    const { container } = render(<StatusChip status="info" />);
    expect(container.firstChild).toHaveClass("rounded-none");
    expect(container.firstChild).not.toHaveClass("rounded-full");
  });
});
