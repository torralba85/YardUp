import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { UtilityEstimateCard } from "./UtilityEstimateCard";

it("states the default trench rate basis beside the estimate", () => {
  render(<UtilityEstimateCard distanceFt={10} />);
  expect(screen.getByText("$650-$1,200")).toBeInTheDocument();
  expect(screen.getByText("at $65-$120 / linear ft")).toBeInTheDocument();
});

it("states the rate basis the estimate was actually computed from", () => {
  render(<UtilityEstimateCard distanceFt={10} lowRate={80} highRate={150} />);
  expect(screen.getByText("$800-$1,500")).toBeInTheDocument();
  expect(screen.getByText("at $80-$150 / linear ft")).toBeInTheDocument();
});
