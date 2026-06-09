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

  it("renders malformed citation values without links or crashes", () => {
    const originalGuides = regulationsData.regulationGuides;
    const mockGuide = {
      ...originalGuides["denver"],
      citations: [
        { label: "Number URL", url: 123 },
        { label: "Malformed URL", url: "https://exa mple.com" },
        { url: "https://example.com/no-label" },
        null,
      ],
    };

    vi.spyOn(regulationsData, "inferJurisdiction").mockReturnValue("denver");

    const originalDenver = originalGuides["denver"];
    originalGuides["denver"] = mockGuide as typeof originalDenver;

    try {
      render(<PermitGuidePanel address="123 Oak St, Denver, CO" />);

      const fallbackLink = screen.getByText("Resource 3");
      expect(fallbackLink.tagName).toBe("A");
      expect(fallbackLink).toHaveAttribute("href", "https://example.com/no-label");

      for (const label of ["Number URL", "Malformed URL", "Resource 4"]) {
        const citation = screen.getByText(label);
        expect(citation.tagName).toBe("SPAN");
        expect(citation).not.toHaveAttribute("href");
        expect(citation).toHaveAttribute("aria-disabled", "true");
      }
    } finally {
      originalGuides["denver"] = originalDenver;
      vi.restoreAllMocks();
    }
  });
});
