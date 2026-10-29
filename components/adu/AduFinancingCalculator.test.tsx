import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AduFinancingCalculator } from "./AduFinancingCalculator";

function result(label: string) {
  const term = screen.getByText(label);
  return within(term.parentElement!).getByRole("definition");
}

describe("AduFinancingCalculator", () => {
  it("subtracts the entire amortized payment from NOI without adding principal back", () => {
    render(<AduFinancingCalculator projectCost={200000} annualNoi={24000} />);
    expect(result("Monthly loan payment")).toHaveTextContent("$1,119");
    expect(result("Monthly cash after loan payment")).toHaveTextContent("$881");
    fireEvent.change(screen.getByLabelText("Annual interest rate (%)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Loan term (years)"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Loan amount ($)"), { target: { value: "200000" } });
    expect(result("Monthly loan payment")).toHaveTextContent("$1,673");
    expect(result("Monthly cash after loan payment")).toHaveTextContent("$327");
  });

  it("handles zero interest, no borrowing, and negative cash flow", () => {
    render(<AduFinancingCalculator projectCost={200000} annualNoi={6000} />);
    fireEvent.change(screen.getByLabelText("Loan amount ($)"), { target: { value: "120000" } });
    fireEvent.change(screen.getByLabelText("Annual interest rate (%)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Loan term (years)"), { target: { value: "10" } });
    expect(result("Monthly loan payment")).toHaveTextContent("$1,000");
    expect(result("Monthly cash after loan payment")).toHaveTextContent("-$500");
    fireEvent.change(screen.getByLabelText("Loan amount ($)"), { target: { value: "0" } });
    expect(result("Monthly loan payment")).toHaveTextContent("$0");
    expect(result("Monthly cash after loan payment")).toHaveTextContent("$500");
  });

  it.each([["Loan amount ($)", ""], ["Loan amount ($)", "-1"], ["Loan amount ($)", "200001"],
    ["Annual interest rate (%)", "-1"], ["Annual interest rate (%)", ""],
    ["Loan term (years)", "0"], ["Loan term (years)", "1.5"]])("withholds output for invalid %s = %s", (label, value) => {
    render(<AduFinancingCalculator projectCost={200000} annualNoi={24000} />);
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.queryByText("Monthly loan payment")).not.toBeInTheDocument();
    expect(screen.getByText(/Enter a loan from/)).toBeInTheDocument();
  });

  it("follows revised budgets until the visitor supplies a loan amount", () => {
    const { rerender } = render(<AduFinancingCalculator projectCost={200000} annualNoi={24000} />);
    rerender(<AduFinancingCalculator projectCost={250000} annualNoi={24000} />);
    expect(screen.getByLabelText("Loan amount ($)")).toHaveValue(200000);
    fireEvent.change(screen.getByLabelText("Loan amount ($)"), { target: { value: "150000" } });
    rerender(<AduFinancingCalculator projectCost={300000} annualNoi={24000} />);
    expect(screen.getByLabelText("Loan amount ($)")).toHaveValue(150000);
  });
});
