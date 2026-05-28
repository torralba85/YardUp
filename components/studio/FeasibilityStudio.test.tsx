import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeasibilityStudio from "../FeasibilityStudio";

vi.mock("next/dynamic", () => ({
  default: () => {
    const MockParcelScene = () => (
      <div data-testid="parcel-scene">parcel scene placeholder</div>
    );
    MockParcelScene.displayName = "MockParcelScene";
    return MockParcelScene;
  },
}));

describe("FeasibilityStudio", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  it("renders the complete feasibility workflow", () => {
    render(<FeasibilityStudio />);
    expect(
      screen.getByRole("heading", { name: "Feasibility Studio", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Parcel Preset", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate Concept Report/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Build Cost Range")).toBeInTheDocument();
  });

  it("flags review needed when selecting a 1,000 sf concept on the compact preset", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />);

    await user.selectOptions(screen.getByLabelText("Parcel Preset"), "compact-lot");

    const sizeGroup = screen.getByRole("group", { name: /ADU footprint size/i });
    await user.click(within(sizeGroup).getByRole("button", { name: "1,000 sf" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Review needed/i);
  });

  it("updates the rental estimate when switching to Market", async () => {
    const user = userEvent.setup();
    render(<FeasibilityStudio />);

    const rentGroup = screen.getByRole("group", { name: /Rental estimate/i });
    await user.click(within(rentGroup).getByRole("button", { name: "Market" }));

    const monthlyRentSection = screen.getByText("Monthly Rent").parentElement;
    expect(monthlyRentSection).toHaveTextContent("$2,350");
  });

  it("exposes report print and download controls", () => {
    render(<FeasibilityStudio />);
    expect(screen.getByRole("button", { name: /Print \/ Save PDF/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download Summary/i })).toBeInTheDocument();
  });
});
