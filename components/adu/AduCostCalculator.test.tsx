import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AduCostCalculator } from "./AduCostCalculator";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics/gtag", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

const stashAddressQueryMock = vi.fn();
vi.mock("@/lib/address-handoff", () => ({
  stashAddressQuery: (addr: string) => stashAddressQueryMock(addr),
}));

describe("AduCostCalculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Los Angeles 600 sq ft estimate by default", () => {
    render(<AduCostCalculator />);
    expect(screen.getByText("$231K–$289K")).toBeInTheDocument();
    expect(screen.getByText("$2,402")).toBeInTheDocument();
    expect(screen.getByText("12.9 years")).toBeInTheDocument();
  });

  it("can start on another county, e.g. on a county cost page", () => {
    render(<AduCostCalculator initialCounty="san-diego" />);
    expect(screen.getByLabelText("County")).toHaveValue("san-diego");
    expect(screen.getByText("$2,335")).toBeInTheDocument();
    expect(screen.getByText("13.3 years")).toBeInTheDocument();
  });

  it("recomputes when the county changes", () => {
    render(<AduCostCalculator />);
    fireEvent.change(screen.getByLabelText("County"), {
      target: { value: "santa-clara" },
    });
    expect(screen.getByText("$2,778")).toBeInTheDocument();
    expect(screen.getByText("11.2 years")).toBeInTheDocument();
  });

  it("recomputes when the size changes", () => {
    render(<AduCostCalculator />);
    fireEvent.change(screen.getByLabelText("Unit size"), {
      target: { value: "400" },
    });
    expect(screen.getByText("$157K–$197K")).toBeInTheDocument();
    expect(screen.getByText("$2,151")).toBeInTheDocument();
  });

  it("itemizes construction and soft costs without double counting, and labels site work and financing as unpriced", () => {
    render(<AduCostCalculator />);
    // Itemized breakdown heading
    expect(screen.getByText("Itemized budget breakdown")).toBeInTheDocument();

    // 600 sq ft cedar: hard cost = 600 * 340 + 9000 = $213,000
    expect(screen.getByText("$213,000")).toBeInTheDocument();
    expect(screen.getByText("Construction (hard costs)")).toBeInTheDocument();

    // 18% soft cost = 213,000 * 0.18 = $38,340
    expect(screen.getByText("$38,340")).toBeInTheDocument();
    expect(screen.getByText("Design & permits (soft costs)")).toBeInTheDocument();

    // Site work & financing labeled Unpriced
    const unpricedItems = screen.getAllByText("Unpriced");
    expect(unpricedItems.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Site work")).toBeInTheDocument();
    expect(screen.getByText("Financing & loan costs")).toBeInTheDocument();

    // Itemized total midpoint is $213,000 + $38,340 = $251,340 (matches model costMid)
    expect(screen.getByText("$251,340")).toBeInTheDocument();
  });

  it("lets an owner replace an allowance with a real quote and recalculates total and payback", () => {
    render(<AduCostCalculator />);

    // Reveal custom quote inputs
    fireEvent.click(screen.getByText("Replace allowance with a real quote"));
    expect(screen.getByLabelText("Construction quote ($)")).toBeInTheDocument();

    // Enter a custom construction quote of $200,000
    fireEvent.change(screen.getByLabelText("Construction quote ($)"), {
      target: { value: "200000" },
    });

    // Custom quote badge should appear
    expect(screen.getByText("Custom quotes applied")).toBeInTheDocument();
    // $200,000 construction + 18% soft cost ($36,000) = $236,000 midpoint
    expect(screen.getByText("$200,000")).toBeInTheDocument();
    expect(screen.getByText("$36,000")).toBeInTheDocument();
    expect(screen.getByText("$236,000")).toBeInTheDocument();

    // Reset button restores defaults
    fireEvent.click(screen.getByText("Reset to allowances"));
    expect(screen.getByText("$213,000")).toBeInTheDocument();
    expect(screen.getByText("$38,340")).toBeInTheDocument();
    expect(screen.queryByText("Custom quotes applied")).not.toBeInTheDocument();
  });

  it("submits the free address check beside the result, stashing query and tracking event", () => {
    render(<AduCostCalculator />);

    expect(screen.getByText("Free address check")).toBeInTheDocument();
    const addressInput = screen.getByLabelText("Your California street address");
    fireEvent.change(addressInput, { target: { value: "456 Ocean Blvd, San Diego, CA" } });

    fireEvent.click(screen.getByRole("button", { name: "Check my address free" }));

    expect(trackEventMock).toHaveBeenCalledWith("adu_cta_calculator", {
      city_slug: "los-angeles",
    });
    expect(stashAddressQueryMock).toHaveBeenCalledWith("456 Ocean Blvd, San Diego, CA");
    expect(pushMock).toHaveBeenCalledWith("/studio");
  });
});
