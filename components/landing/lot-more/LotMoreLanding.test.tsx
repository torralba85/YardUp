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
  default: (loader: () => unknown) => loader.toString().includes("LandingMemberNav")
    ? () => <nav aria-label="Member navigation" />
    :
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
    window.localStorage.clear();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  // The member navigation carries the Firebase client SDK. Mounting it for a
  // signed-out visitor would put that download back on `/`, which is the cost
  // the route group split exists to avoid.
  it("keeps the auth island off the header until a browser has signed in", () => {
    const guest = render(<LotMoreLanding scenarios={scenarios} />);
    expect(screen.queryByRole("navigation", { name: "Member navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    guest.unmount();

    window.localStorage.setItem("lf:member-session", "1");
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(screen.getByRole("navigation", { name: "Member navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("exposes builder registration in desktop, footer, and mobile navigation", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    expect(screen.getAllByRole("link", { name: "Register as a builder" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    for (const link of screen.getAllByRole("link", { name: "Register as a builder" })) {
      expect(link).toHaveAttribute("href", "/signup?role=builder");
    }
    expect(screen.getAllByRole("link", { name: "Register as a builder" })).toHaveLength(3);
  });

  it("waits for confirmed authentication before storing and routing the trimmed address", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
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
    render(<LotMoreLanding scenarios={scenarios} />);
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

  it("navigates segmented controls using keyboard arrow keys", () => {
    render(<LotMoreLanding scenarios={scenarios} />);
    const sceneGroup = screen.getByRole("group", {
      name: "Property illustration view",
    });
    const sceneButtons = sceneGroup.querySelectorAll("button");
    expect(sceneButtons[2]).toHaveAttribute("aria-pressed", "true");

    // ArrowRight cycles forward to 0 (wrap around)
    fireEvent.keyDown(sceneGroup, { key: "ArrowRight" });
    expect(sceneButtons[0]).toHaveAttribute("aria-pressed", "true");

    // ArrowLeft cycles backward to 2
    fireEvent.keyDown(sceneGroup, { key: "ArrowLeft" });
    expect(sceneButtons[2]).toHaveAttribute("aria-pressed", "true");

    // Report tabs keyboard navigation
    const reportTabsGroup = screen.getByRole("group", {
      name: "Sample report pages",
    });
    const reportButtons = reportTabsGroup.querySelectorAll("button");
    expect(reportButtons[0]).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(reportTabsGroup, { key: "ArrowRight" });
    expect(reportButtons[1]).toHaveAttribute("aria-pressed", "true");
  });
});
