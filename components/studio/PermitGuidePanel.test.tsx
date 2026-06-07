import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PermitGuidePanel from "./PermitGuidePanel";
import * as regulationsData from "@/lib/regulations-data";

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

  it("renders unsafe citation as non-clickable span", () => {
    const originalGuides = regulationsData.regulationGuides;
    const mockGuide = {
      ...originalGuides["denver"],
      citations: [
        { label: "Safe Link", url: "https://example.com" },
        { label: "Unsafe Link", url: "javascript:alert(1)" },
      ],
    };

    vi.spyOn(regulationsData, "inferJurisdiction").mockReturnValue("denver");

    const originalDenver = originalGuides["denver"];
    originalGuides["denver"] = mockGuide;

    try {
      render(<PermitGuidePanel address="123 Oak St, Denver, CO" />);

      const safeLink = screen.getByText("Safe Link");
      expect(safeLink.tagName).toBe("A");
      expect(safeLink).toHaveAttribute("href", "https://example.com/");

      const unsafeLink = screen.getByText("Unsafe Link");
      expect(unsafeLink.tagName).toBe("SPAN");
      expect(unsafeLink).not.toHaveAttribute("href");
      expect(unsafeLink).toHaveAttribute("aria-disabled", "true");
    } finally {
      // Restore original
      originalGuides["denver"] = originalDenver;
      vi.restoreAllMocks();
    }
  });
});
