import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import IncomeRail from "./IncomeRail";

describe("IncomeRail", () => {
  beforeEach(() => {
    // Reduced motion => useCountUp snaps to final value synchronously.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  it("shows the monthly income figure and the verdict", () => {
    render(<IncomeRail monthlyRent={2100} verdict="Likely Feasible" />);
    const rail = screen.getByTestId("income-rail");
    expect(rail).toHaveTextContent("$2,100");
    expect(rail).toHaveTextContent("/mo");
    expect(rail).toHaveTextContent(/If built/i);
    expect(rail).toHaveTextContent("Likely Feasible");
  });
});
