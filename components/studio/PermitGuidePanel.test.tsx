import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PermitGuidePanel from "./PermitGuidePanel";

describe("PermitGuidePanel component", () => {
  it("renders correct title and checklist items", () => {
    render(<PermitGuidePanel address="123 Oak St, Denver, CO" />);
    expect(screen.getByText(/Denver ADU Starter Guide/i)).toBeInTheDocument();
    
    // Checklist step should render
    expect(screen.getByText(/Check if residential zone contains 'G' suffix/i)).toBeInTheDocument();
  });

  it("handles checkbox toggles locally", () => {
    render(<PermitGuidePanel address="123 Oak St, Denver, CO" />);
    const checkbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});
