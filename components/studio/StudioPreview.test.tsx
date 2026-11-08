import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "@/lib/feasibility";
import StudioPreview from "./StudioPreview";
import { calculateScenarioFeasibility } from "@/lib/scenario-restoration";
import EstimateSummaryPanel from "./EstimateSummaryPanel";
import { SceneStatus } from "./SceneStatus";
import { getScenePlacement } from "@/lib/site-fit";
import { defaultPose } from "@/lib/scenario-design";

const result = calculateFeasibility(getParcelById("coyote-brush"), defaultAduConfig, defaultFinancialAssumptions);

describe("free certificate preview", () => {
  it("shows rent range, build cost, annual net income, and payback unblurred while locking financed cash flow", () => {
    const onUnlock = vi.fn();
    const { container } = render(<EstimateSummaryPanel parcelName="San Diego demo" result={result}
      feasibilityStatus="review_needed" onGenerateReport={onUnlock} reportCtaLabel="Unlock certificate — $29" />);
    expect(screen.getByText("$2,335–$2,919")).toBeInTheDocument();
    expect(screen.getByText("$231K–$289K")).toBeInTheDocument();
    expect(screen.getByText("$19K /yr")).toBeInTheDocument();
    expect(screen.getByText("13.3 yrs")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Estimated construction range\. Excludes site grading, utility trenching, municipal impact fees, and architectural soft costs\./i,
      ),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('[data-locked-metric="true"]')).toHaveLength(1);
    expect(screen.queryByText(/review needed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not permit approval or guaranteed income/i)).toBeInTheDocument();
    // The sample report sits beside the purchase decision, not only in the page footer.
    expect(screen.getByRole("link", { name: /^See a sample certificate/ })).toHaveAttribute("href", "/sample-certificate/san-diego");
    fireEvent.click(screen.getByRole("button", { name: "Unlock certificate — $29" }));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("renders '—' for payback period when annual net income is non-positive or payback is non-finite", () => {
    const nonPositive = { ...result, annualNoi: 0, paybackYears: Number.POSITIVE_INFINITY };
    render(<StudioPreview result={nonPositive} onUnlock={vi.fn()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText(/Infinity/i)).not.toBeInTheDocument();
  });

  it("keeps an actual placement conflict visible before purchase", () => {
    const blocked = { ...result, placement: { status: "blocked", reasons: [{ message: "The ADU overlaps the modeled house." }] } } as typeof result;
    render(<EstimateSummaryPanel parcelName="Lot" result={blocked} feasibilityStatus="blocked" onGenerateReport={vi.fn()} />);
    expect(screen.getByText("The ADU overlaps the modeled house.")).toBeInTheDocument();
    expect(screen.queryByText("Likely Feasible")).not.toBeInTheDocument();
  });

  it("shows the full figures after purchase", () => {
    render(<EstimateSummaryPanel parcelName="Lot" result={result} feasibilityStatus="review_needed" onGenerateReport={vi.fn()} certificateUnlocked />);
    expect(screen.getByText("$18,914")).toBeInTheDocument();
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


describe("specific model conflicts before purchase", () => {
  it.each(["close", "boundary-contact"] as const)("retains the %s house warning", (houseStatus) => {
    const placement = { status: "review", houseStatus, reasons: [{ message: "House separation requires adjustment." }] } as unknown as NonNullable<typeof result.placement>;
    render(<StudioPreview result={{ ...result, placement }} onUnlock={vi.fn()} />);
    expect(screen.getByText("House separation requires adjustment.")).toBeInTheDocument();
  });

  it("retains modeled overage with estimated rules, without showing capacity arithmetic", () => {
    const over = { ...result, regulationsEstimated: true, footprintKnown: true, remainingCapacity: -333 };
    const { container } = render(<StudioPreview result={over} onUnlock={vi.fn()} />);
    expect(screen.getByText(/concept exceeds the modeled size allowance/)).toBeInTheDocument();
    expect(container.textContent).not.toContain("333");
  });

  it.each([false, true])("keeps scene overage visible with paid access %s", (analysisUnlocked) => {
    const parcel = getParcelById("oak-street");
    const placement = getScenePlacement(parcel, defaultAduConfig, defaultPose(parcel, defaultAduConfig));
    render(<SceneStatus analysisUnlocked={analysisUnlocked} placement={placement} remainingCapacity={-333} parcel={parcel} isProxy />);
    expect(screen.getByRole("alert")).toHaveTextContent("exceeds the modeled size allowance");
  });

  it("keeps roof-height screening visible in the free certificate", () => {
    const parcel = getParcelById("oak-street");
    const config = { ...defaultAduConfig, height: 16, roof: "gable" as const };
    const tall = calculateScenarioFeasibility(parcel, config, defaultFinancialAssumptions, defaultPose(parcel, config));
    expect(tall.heightReviewRequired).toBe(true);
    render(<StudioPreview result={tall} onUnlock={vi.fn()} />);
    expect(screen.getByText(/Modeled roof height needs confirmation/)).toBeInTheDocument();
  });
});
