import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BuilderMoneyBand from "./BuilderMoneyBand";
import type { BuilderMetrics } from "@/lib/builder-metrics";

const base: BuilderMetrics = {
  total: 3,
  newLeadCount: 2,
  interestedCount: 1,
  archivedCount: 0,
  unlockedCount: 1,
  pipelineValue: 550000,
  spend: 49,
};

describe("BuilderMoneyBand", () => {
  it("leads with new-lead count, pipeline value, and singular spend", () => {
    render(<BuilderMoneyBand metrics={base} />);

    expect(screen.getByText("New leads")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/pipeline value/i)).toBeInTheDocument();
    expect(screen.getByText("1 unlock")).toBeInTheDocument();
  });

  it("shows an em dash and plural unlocks for an empty pipeline", () => {
    render(
      <BuilderMoneyBand
        metrics={{ ...base, newLeadCount: 0, pipelineValue: 0, unlockedCount: 0, spend: 0 }}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("0 unlocks")).toBeInTheDocument();
  });
});
