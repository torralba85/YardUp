import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LotMoreLanding } from "./LotMoreLanding";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";

const { push, stash } = vi.hoisted(() => ({ push: vi.fn(), stash: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/address-handoff", () => ({ stashAddressQuery: stash }));
vi.mock("next/dynamic", () => ({
  default: () =>
    function TestAuthGate({
      onAuthenticated,
      onDismiss,
    }: {
      onAuthenticated: () => void;
      onDismiss: () => void;
    }) {
      return (
        <div role="dialog">
          <button onClick={onAuthenticated}>Complete sign in</button>
          <button onClick={onDismiss}>Dismiss sign in</button>
        </div>
      );
    },
}));

const scenarios = (["conservative", "market", "optimistic"] as const).map(
  (id) => {
    const result = calculateFeasibility(parcelPresets[0], defaultAduConfig, {
      ...defaultFinancialAssumptions,
      rentScenario: id,
    });
    return {
      id,
      costLow: result.costLow,
      costHigh: result.costHigh,
      rent: result.monthlyRent,
      noi: result.annualNoi,
      payback: result.paybackYears,
      expenseRatio: result.operatingExpenseRatio,
    };
  },
);

describe("landing address handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it("waits for confirmed authentication before storing and routing the trimmed address", () => {
    render(<LotMoreLanding scenarios={scenarios} certificatePrice="$29" />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[0],
      { target: { value: "  456 Pine St, Denver, CO  " } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Explore my lot" })[0],
    );
    expect(stash).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Complete sign in" }));
    expect(stash).toHaveBeenCalledExactlyOnceWith("456 Pine St, Denver, CO");
    expect(push).toHaveBeenCalledExactlyOnceWith("/studio");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Bringing your lot into focus",
    );
  });

  it("dismisses authentication without discarding the address or starting a lookup", () => {
    render(<LotMoreLanding scenarios={scenarios} certificatePrice="$29" />);
    fireEvent.change(
      screen.getAllByLabelText("Property address", { exact: true })[1],
      { target: { value: "456 Pine St, Denver, CO" } },
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Explore my lot" })[1],
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss sign in" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getAllByLabelText("Property address", { exact: true })[0],
    ).toHaveValue("456 Pine St, Denver, CO");
    expect(stash).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
