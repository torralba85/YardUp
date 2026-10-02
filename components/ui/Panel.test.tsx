import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel, PanelHeader } from "./Panel";

describe("Panel", () => {
  it("renders its children", () => {
    render(<Panel>content</Panel>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("defaults to the card surface", () => {
    const { container } = render(<Panel>x</Panel>);
    expect(container.firstChild).toHaveClass("bg-lot-chalk", "border-lot-line");
  });

  it("supports the sand surface", () => {
    const { container } = render(<Panel surface="sand">x</Panel>);
    expect(container.firstChild).toHaveClass("bg-lot-surface");
  });

  it("renders as the requested landmark element", () => {
    render(
      <Panel as="aside" aria-label="Property constraints">
        x
      </Panel>,
    );
    expect(screen.getByRole("complementary", { name: "Property constraints" })).toBeInTheDocument();
  });
});

describe("PanelHeader", () => {
  it("renders the title as a level-2 heading by default", () => {
    render(<PanelHeader title="What this lot allows" />);
    expect(screen.getByRole("heading", { level: 2, name: "What this lot allows" })).toBeInTheDocument();
  });

  it("lets the heading level be set for a correct document outline", () => {
    render(<PanelHeader as="h3" title="Rent estimate" />);
    expect(screen.getByRole("heading", { level: 3, name: "Rent estimate" })).toBeInTheDocument();
  });

  it("renders the mono eyebrow when provided", () => {
    render(<PanelHeader eyebrow="Your property" title="413 Elmwood" />);
    expect(screen.getByText("Your property")).toBeInTheDocument();
  });

  it("renders the sub line", () => {
    render(<PanelHeader title="Estimate" sub="Current snapshot" />);
    expect(screen.getByText("Current snapshot")).toBeInTheDocument();
  });

  it("renders header actions", () => {
    render(<PanelHeader title="Estimate" actions={<button type="button">Edit</button>} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("applies an id to the heading so a panel can be aria-labelledby it", () => {
    render(<PanelHeader id="constraints-heading" title="Constraints" />);
    expect(screen.getByRole("heading", { name: "Constraints" })).toHaveAttribute("id", "constraints-heading");
  });
});
