import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InspirationGalleryPanel from "./InspirationGalleryPanel";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import { inspirationItems, type InspirationItem } from "@/lib/inspiration-data";

const galleryProps = {
  parcel: parcelPresets[0],
  config: defaultAduConfig,
};

describe("InspirationGalleryPanel component", () => {
  it("renders inspiration cards list", () => {
    const onApply = vi.fn();
    render(<InspirationGalleryPanel {...galleryProps} onApply={onApply} />);
    expect(screen.getByRole("heading", { name: "Courtyard Studio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Garden Pavilion" })).toBeInTheDocument();
  });

  it("calls onApply when clicking the apply button", () => {
    const onApply = vi.fn();
    render(<InspirationGalleryPanel {...galleryProps} onApply={onApply} />);
    
    const applyButtons = screen.getAllByRole("button", { name: /Apply to Studio/i });
    fireEvent.click(applyButtons[0]);

    expect(onApply).toHaveBeenCalledWith(inspirationItems[0]);
  });

  it("prepends generated concepts and renders Style-Matched badge", () => {
    const onApply = vi.fn();
    const generatedConcepts: InspirationItem[] = [
      {
        id: "style-match-test",
        title: "Matched Craftsman Concept",
        style: "Craftsman",
        sqft: 600,
        width: 20,
        length: 30,
        roof: "gable",
        finish: "lap",
        tags: ["style-matched", "craftsman"],
        summary: "A custom ADU concept style-matched to your home.",
        budgetBand: "$250k - $400k",
        imagePath: "/inspiration/clean-gable.webp",
        isStyleMatched: true,
        photoUrl: "blob:http://localhost/photo",
        matchPercentage: 91,
        traits: ["Cedar lap siding", "Gable roof"],
        isAttached: false,
      },
    ];

    render(
      <InspirationGalleryPanel
        {...galleryProps}
        onApply={onApply}
        generatedConcepts={generatedConcepts}
      />
    );

    expect(screen.getByText("Matched Craftsman Concept")).toBeInTheDocument();
    expect(screen.getByText("Style-Matched · Illustrative concept")).toBeInTheDocument();
  });

  // The gallery only mounts at >=1024px (FeasibilityStudio's `isDesktop`), so a
  // `<source media="(max-width: N)">` below that can never match and the small
  // variant would be dead weight. Width descriptors are chosen per card instead.
  it("offers both catalogue variants through srcSet rather than a viewport media query", () => {
    const { container } = render(<InspirationGalleryPanel {...galleryProps} onApply={vi.fn()} />);

    expect(container.querySelector("picture source[media]")).toBeNull();

    const item = inspirationItems.find((i) => i.mobileImagePath);
    expect(item).toBeDefined();
    const img = screen.getByAltText(`${item!.title} illustrative architectural model`);
    expect(img.getAttribute("srcSet") ?? img.getAttribute("srcset")).toBe(
      `${item!.mobileImagePath} 600w, ${item!.imagePath} 960w`,
    );
    expect(img.getAttribute("sizes")).toContain("min-width: 1280px");
  });

  it("calls onViewComparison when Compare button is clicked", () => {
    const onApply = vi.fn();
    const onViewComparison = vi.fn();
    const generatedConcepts: InspirationItem[] = [
      {
        id: "style-match-test",
        title: "Matched Craftsman Concept",
        style: "Craftsman",
        sqft: 600,
        width: 20,
        length: 30,
        roof: "gable",
        finish: "lap",
        tags: ["style-matched", "craftsman"],
        summary: "A custom ADU concept style-matched to your home.",
        budgetBand: "$250k - $400k",
        imagePath: "/inspiration/clean-gable.webp",
        isStyleMatched: true,
        photoUrl: "blob:http://localhost/photo",
        matchPercentage: 91,
        traits: ["Cedar lap siding", "Gable roof"],
        isAttached: false,
      },
    ];

    render(
      <InspirationGalleryPanel
        {...galleryProps}
        onApply={onApply}
        generatedConcepts={generatedConcepts}
        onViewComparison={onViewComparison}
      />
    );

    const compareBtn = screen.getByRole("button", { name: /Compare/i });
    expect(compareBtn).toBeInTheDocument();
    fireEvent.click(compareBtn);

    expect(onViewComparison).toHaveBeenCalledWith(generatedConcepts[0]);
  });
});
