import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { landingScenarios } from "@/lib/landing-demo";
import { CostStack, layerAtProgress, separationAtProgress } from "./CostStack";

const market = landingScenarios("san-diego")[1];
const budget = market.costBreakdown!;

function renderStack() {
  return render(
    <CostStack budget={budget} />,
  );
}

describe("CostStack", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists the engine's construction budget as four layers that add up to its total", () => {
    renderStack();
    const group = screen.getByRole("radiogroup", { name: "Build cost layers" });
    const rows = within(group).getAllByRole("radio");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Roof.*Included$/),
      expect.stringMatching(/Openings.*\$9,000$/),
      expect.stringMatching(/Shell.*600 sq ft at \$340\/sq ft.*\$204,000$/),
      expect.stringMatching(/Soft costs.*18% allowance.*\$38,340$/),
    ]);
    const b = budget;
    expect(b.roofPremium + b.openings + b.baseConstruction + b.regionalAdjustment + b.softCosts).toBe(b.total);
    expect(screen.getByText("$251,340")).toBeInTheDocument();
  });

  it("labels the model illustrative and brings the chosen layer forward", () => {
    const { container } = renderStack();
    expect(screen.getByRole("img", { name: /Illustrative exploded view .* in 3D/ })).toBeInTheDocument();
    expect(screen.getByText(/Illustrative exploded view, not to scale/)).toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.layer).toBe("roof");

    fireEvent.click(screen.getByRole("radio", { name: /Soft costs/ }));
    expect(screen.getByRole("radio", { name: /Soft costs/ })).toHaveAttribute("aria-checked", "true");
    expect(root.dataset.layer).toBe("soft");
    expect(screen.getByText("04 · Soft costs")).toBeInTheDocument();
  });

  it("stays an unpinned, exploded drawing when motion is reduced", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    );
    const { container } = renderStack();
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.pinned).toBeUndefined();
    expect(root.style.getPropertyValue("--stack-sep")).toBe("");
  });

  it("explodes as the stage pins, walks the layers, and reassembles at the end", () => {
    expect(separationAtProgress(0)).toBe(0);
    expect(separationAtProgress(0.5)).toBe(1);
    expect(separationAtProgress(1)).toBe(0);
    expect([0.1, 0.4, 0.6, 0.9].map(layerAtProgress)).toEqual(["roof", "openings", "shell", "soft"]);
  });

  it("renders a poster, not a DOM drawing, until WebGL takes over", () => {
    renderStack();
    const figure = screen.getByRole("img", { name: /Illustrative exploded view/ });
    expect(figure.dataset.ready).toBe("false");
    expect(figure.querySelector("img")).toHaveAttribute("src", "/landing/cost-stack-3d.webp");
    expect(figure.querySelector("svg")).toBeNull();
    expect(figure.querySelectorAll("*").length).toBeLessThan(5);
  });
});
