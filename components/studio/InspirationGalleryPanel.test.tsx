import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InspirationGalleryPanel from "./InspirationGalleryPanel";
import { inspirationItems } from "@/lib/inspiration-data";

describe("InspirationGalleryPanel component", () => {
  it("renders inspiration cards list", () => {
    const onApply = vi.fn();
    render(<InspirationGalleryPanel onApply={onApply} />);
    expect(screen.getByText(/Courtyard Studio with Clerestory Light/i)).toBeInTheDocument();
    expect(screen.getByText(/Garage Conversion with Garden Entry/i)).toBeInTheDocument();
  });

  it("calls onApply when clicking the apply button", () => {
    const onApply = vi.fn();
    render(<InspirationGalleryPanel onApply={onApply} />);
    
    const applyButtons = screen.getAllByRole("button", { name: /Apply to Studio/i });
    fireEvent.click(applyButtons[0]);

    expect(onApply).toHaveBeenCalledWith(inspirationItems[0]);
  });
});
