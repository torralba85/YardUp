import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BeforeAfterBoard from "./BeforeAfterBoard";

describe("BeforeAfterBoard", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    beforePhotoUrl: "https://example.com/before.jpg",
    afterConceptUrl: "https://example.com/after.jpg",
    styleName: "Craftsman",
    matchPercentage: 91,
    styleTraits: ["Cedar lap siding", "Gable roof", "White trim"],
    lotSizeInfo: "5,200 sf lot",
    isAttached: false,
    onToggleAttach: vi.fn(),
    onRecast: vi.fn(),
    onDelete: vi.fn(),
    serialNo: "SM-123456",
    dateStr: "2026-06-20 UTC",
  };

  it("renders nothing when isOpen is false", () => {
    const { container } = render(<BeforeAfterBoard {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with header, images, metadata, stamp and action buttons", () => {
    render(<BeforeAfterBoard {...defaultProps} />);

    // Title and eyebrow
    expect(screen.getByRole("heading", { name: /Your house → your ADU/i })).toBeInTheDocument();
    expect(screen.getByText(/NO\. SM-123456 · 2026-06-20 UTC/i)).toBeInTheDocument();

    // Panes headings
    expect(screen.getByText("Before — your photo")).toBeInTheDocument();
    expect(screen.getByText("After — ADU concept, matched style")).toBeInTheDocument();

    // Images checks
    const beforeImg = screen.getByAltText("Original house before photo");
    expect(beforeImg).toBeInTheDocument();
    expect(beforeImg).toHaveAttribute("src", "https://example.com/before.jpg");

    const afterImg = screen.getByAltText("Generated style-matched ADU concept");
    expect(afterImg).toBeInTheDocument();
    expect(afterImg).toHaveAttribute("src", "https://example.com/after.jpg");

    // Rotated Concept stamp
    expect(screen.getByText("Concept · not a permit")).toBeInTheDocument();

    // Metadata bar checks
    expect(screen.getByText("STYLE MATCH CRAFTSMAN · 91%")).toBeInTheDocument();
    expect(screen.getByText("CEDAR LAP SIDING")).toBeInTheDocument();
    expect(screen.getByText("GABLE ROOF")).toBeInTheDocument();
    expect(screen.getByText("WHITE TRIM")).toBeInTheDocument();
    expect(screen.getByText("5,200 SF LOT")).toBeInTheDocument();

    // Actions bar checks
    expect(screen.getByRole("button", { name: /Add to certificate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cast another/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete photo & renders/i })).toBeInTheDocument();
  });

  it("renders 'Applied' state when isAttached is true", () => {
    render(<BeforeAfterBoard {...defaultProps} isAttached={true} />);
    expect(screen.getByRole("button", { name: /Applied/i })).toBeInTheDocument();
  });

  it("moves focus to the close button when opened", () => {
    render(<BeforeAfterBoard {...defaultProps} />);

    expect(screen.getByLabelText("Close dialog")).toHaveFocus();
  });

  it("traps keyboard tab focus inside the dialog", () => {
    render(<BeforeAfterBoard {...defaultProps} />);

    const closeButton = screen.getByLabelText("Close dialog");
    const deleteButton = screen.getByRole("button", { name: /Delete photo & renders/i });

    closeButton.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(deleteButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });

  it("dispatches correct callbacks when actions are clicked", () => {
    const onToggleAttach = vi.fn();
    const onRecast = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <BeforeAfterBoard
        {...defaultProps}
        onToggleAttach={onToggleAttach}
        onRecast={onRecast}
        onDelete={onDelete}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Add to certificate/i }));
    expect(onToggleAttach).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Cast another/i }));
    expect(onRecast).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Delete photo & renders/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<BeforeAfterBoard {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when clicking the background scrim", () => {
    const onClose = vi.fn();
    render(<BeforeAfterBoard {...defaultProps} onClose={onClose} />);

    // Click the outer scrim dialog element
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClose when clicking inside the modal content box", () => {
    const onClose = vi.fn();
    render(<BeforeAfterBoard {...defaultProps} onClose={onClose} />);

    const modalBox = screen.getByText("Your house → your ADU");
    fireEvent.click(modalBox);
    expect(onClose).not.toHaveBeenCalled();
  });
});
