import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepRail, type Step } from "./StepRail";

const steps: Step[] = [
  { id: "lot", label: "Your Lot", state: "done" },
  { id: "feasibility", label: "Rules & Fit", state: "current" },
  { id: "design", label: "Design", state: "upcoming" },
  { id: "certificate", label: "Certificate", state: "upcoming", revenue: true },
  { id: "builders", label: "Builders", state: "locked", revenue: true },
];

describe("StepRail", () => {
  it("is a navigation landmark listing every step", () => {
    render(<StepRail aria-label="Studio steps" steps={steps} onSelect={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Studio steps" })).toBeInTheDocument();
    for (const step of steps) {
      expect(screen.getByRole("button", { name: new RegExp(step.label) })).toBeInTheDocument();
    }
  });

  it("marks the current step with aria-current=step", () => {
    render(<StepRail aria-label="Studio steps" steps={steps} onSelect={() => {}} />);
    const current = screen.getByRole("button", { name: /Rules & Fit/ });
    expect(current).toHaveAttribute("aria-current", "step");
    expect(current).toHaveClass("focus-visible:ring-lot-chalk");
    expect(screen.getByText("Rules & Fit")).toHaveClass("text-lot-chalk");
  });

  it("selects an enabled step on click", () => {
    const onSelect = vi.fn();
    render(<StepRail aria-label="Studio steps" steps={steps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Design/ }));
    expect(onSelect).toHaveBeenCalledWith("design");
  });

  it("disables locked steps and never selects them", () => {
    const onSelect = vi.fn();
    render(<StepRail aria-label="Studio steps" steps={steps} onSelect={onSelect} />);
    const locked = screen.getByRole("button", { name: /Builders/ });
    expect(locked).toBeDisabled();
    fireEvent.click(locked);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the revenue steps with a $ signifier", () => {
    render(<StepRail aria-label="Studio steps" steps={steps} onSelect={() => {}} />);
    const revenueMarks = screen.getAllByText("$");
    expect(revenueMarks).toHaveLength(2);
    revenueMarks.forEach((mark) => expect(mark).toHaveClass("text-lot-chalk"));
  });

  it("moves focus to the next enabled step with ArrowDown", () => {
    render(<StepRail aria-label="Studio steps" steps={steps} onSelect={() => {}} />);
    const current = screen.getByRole("button", { name: /Rules & Fit/ });
    current.focus();
    fireEvent.keyDown(current, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Design/ }));
  });
});
