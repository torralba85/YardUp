import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AduCostCalculator } from "./AduCostCalculator";

describe("AduCostCalculator", () => {
  it("renders the Los Angeles 600 sq ft estimate by default", () => {
    render(<AduCostCalculator />);
    expect(screen.getByText("$231K–$289K")).toBeInTheDocument();
    expect(screen.getByText("$2,328")).toBeInTheDocument();
    expect(screen.getByText("13.3 years")).toBeInTheDocument();
  });

  it("recomputes when the county changes", () => {
    render(<AduCostCalculator />);
    fireEvent.change(screen.getByLabelText("County"), {
      target: { value: "santa-clara" },
    });
    expect(screen.getByText("$2,982")).toBeInTheDocument();
    expect(screen.getByText("10.4 years")).toBeInTheDocument();
  });

  it("recomputes when the size changes", () => {
    render(<AduCostCalculator />);
    fireEvent.change(screen.getByLabelText("Unit size"), {
      target: { value: "400" },
    });
    expect(screen.getByText("$157K–$197K")).toBeInTheDocument();
    expect(screen.getByText("$1,979")).toBeInTheDocument();
  });
});
