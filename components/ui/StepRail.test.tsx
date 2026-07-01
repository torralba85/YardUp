import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepProgress, StepRail, type Step } from "./StepRail";

const steps: Step[] = [
  { id: "lot", label: "Your Lot", state: "done" },
  { id: "feasibility", label: "Feasibility & Rules", state: "current" },
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
    expect(screen.getByRole("button", { name: /Feasibility & Rules/ })).toHaveAttribute("aria-current", "step");
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
    expect(screen.getAllByText("$")).toHaveLength(2);
  });

  it("moves focus to the next enabled step with ArrowDown", () => {
    render(<StepRail aria-label="Studio steps" steps={steps} onSelect={() => {}} />);
    const current = screen.getByRole("button", { name: /Feasibility & Rules/ });
    current.focus();
    fireEvent.keyDown(current, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Design/ }));
  });
});

describe("StepProgress", () => {
  it("is a navigation landmark with the current step marked", () => {
    render(<StepProgress aria-label="Studio progress" steps={steps} onSelect={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Studio progress" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Feasibility & Rules/ })).toHaveAttribute("aria-current", "step");
  });

  it("selects an enabled step on click", () => {
    const onSelect = vi.fn();
    render(<StepProgress aria-label="Studio progress" steps={steps} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Your Lot/ }));
    expect(onSelect).toHaveBeenCalledWith("lot");
  });
});
