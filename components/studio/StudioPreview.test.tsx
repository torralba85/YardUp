import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "@/lib/feasibility";
import EstimateSummaryPanel from "./EstimateSummaryPanel";
import { SceneStatus } from "./SceneStatus";
import { getScenePlacement } from "@/lib/site-fit";
import { defaultPose } from "@/lib/scenario-design";

const result = calculateFeasibility(getParcelById("coyote-brush"), defaultAduConfig, defaultFinancialAssumptions);

describe("free certificate preview", () => {
  it("shows the rent range and blurred placeholders without putting paid figures in the markup", () => {
    const onUnlock = vi.fn();
    const { container } = render(<EstimateSummaryPanel parcelName="San Diego demo" result={result}
      feasibilityStatus="review_needed" onGenerateReport={onUnlock} reportCtaLabel="Unlock certificate — $29" />);
    expect(screen.getByText("$2,459–$3,074")).toBeInTheDocument();
    for (const value of ["19,918", "231,000", "289,000", "12.6", "32.5%"]) {
      expect(container.innerHTML).not.toContain(value);
    }
    expect(container.querySelectorAll('[data-locked-metric="true"]')).toHaveLength(4);
    expect(screen.queryByText(/review needed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not permit approval or guaranteed income/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unlock certificate — $29" }));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("keeps an actual placement conflict visible before purchase", () => {
    const blocked = { ...result, placement: { status: "blocked", reasons: [{ message: "The ADU overlaps the modeled house." }] } } as typeof result;
    render(<EstimateSummaryPanel parcelName="Lot" result={blocked} feasibilityStatus="blocked" onGenerateReport={vi.fn()} />);
    expect(screen.getByText("The ADU overlaps the modeled house.")).toBeInTheDocument();
    expect(screen.queryByText("Likely Feasible")).not.toBeInTheDocument();
  });

  it("shows the full figures after purchase", () => {
    render(<EstimateSummaryPanel parcelName="Lot" result={result} feasibilityStatus="review_needed" onGenerateReport={vi.fn()} certificateUnlocked />);
    expect(screen.getByText("$19,918")).toBeInTheDocument();
    expect(screen.getByText("$231K–$289K")).toBeInTheDocument();
    expect(screen.getByText("Payback")).toBeInTheDocument();
  });

  it("keeps capacity arithmetic out of the free scene while showing placement conflicts", () => {
    const parcel = getParcelById("oak-street");
    const placement = getScenePlacement(parcel, defaultAduConfig, { ...defaultPose(parcel, defaultAduConfig), x: 1000 });
    render(<SceneStatus analysisUnlocked={false} placement={placement} remainingCapacity={20} isProxy parcel={parcel} />);
    expect(screen.getByText("Setback conflict.")).toBeInTheDocument();
    expect(screen.queryByText("Modeled site fit details")).not.toBeInTheDocument();
    expect(screen.queryByText(/20 sf of modeled coverage/)).not.toBeInTheDocument();
  });
});
