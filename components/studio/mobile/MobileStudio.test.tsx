import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import MobileStudio, { COACH_SEEN_KEY } from "./MobileStudio";

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: "",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    });
  }
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

function renderStudio() {
  return render(
    <MobileStudio
      header={<div>m-header</div>}
      scene={<div>m-scene</div>}
      peek={<div>m-peek</div>}
      controls={<div>m-controls</div>}
      sections={<div>m-sections</div>}
    />,
  );
}

describe("MobileStudio", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all slots", () => {
    renderStudio();
    for (const text of ["m-header", "m-scene", "m-peek", "m-controls", "m-sections"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("shows coach marks on first run and persists dismissal", () => {
    vi.useFakeTimers();
    try {
      renderStudio();

      const note = screen.getByRole("note");
      expect(note).toHaveTextContent(/drag your adu/i);

      fireEvent.click(screen.getByRole("button", { name: /got it/i }));
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
      expect(window.localStorage.getItem(COACH_SEEN_KEY)).toBe("1");

      // Flush Radix UI FocusScope's deferred dispatchEvent before RTL cleanup
      // tears down the DOM, otherwise jsdom throws an uncaught TypeError.
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides coach marks when already seen", () => {
    window.localStorage.setItem(COACH_SEEN_KEY, "1");
    renderStudio();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("renders the spine progress and reports step selection", () => {
    const onStepSelect = vi.fn();
    render(
      <MobileStudio
        header={<div>m-header</div>}
        scene={<div>m-scene</div>}
        peek={<div>m-peek</div>}
        controls={<div>m-controls</div>}
        sections={<div>m-sections</div>}
        activeStepLabel="Feasibility & Rules"
        steps={[
          { id: "lot", label: "Your Lot", state: "current" },
          { id: "feasibility", label: "Feasibility & Rules", state: "upcoming" },
        ]}
        onStepSelect={onStepSelect}
      />,
    );

    const progress = screen.getByRole("navigation", { name: "Studio progress", hidden: true });
    expect(progress).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Feasibility & Rules/, hidden: true }));
    expect(onStepSelect).toHaveBeenCalledWith("feasibility");
    expect(screen.getByTestId("studio-sheet")).toHaveAttribute(
      "aria-label",
      "Feasibility & Rules step",
    );
    expect(screen.getByText("m-controls").parentElement).toHaveFocus();
  });

  it("omits the spine progress when no steps are provided", () => {
    renderStudio();
    expect(screen.queryByRole("navigation", { name: "Studio progress" })).not.toBeInTheDocument();
  });

  it("reveals and focuses the sheet when the active step changes programmatically", () => {
    window.localStorage.setItem(COACH_SEEN_KEY, "1");
    const props = {
      header: <div>m-header</div>,
      scene: <div>m-scene</div>,
      peek: <div>m-peek</div>,
      controls: <div>m-controls</div>,
      sections: <div>m-sections</div>,
    };
    const { rerender } = render(<MobileStudio {...props} activeStepId="feasibility" />);
    expect(screen.getByText("m-controls").parentElement).not.toHaveFocus();

    // An in-sheet CTA (e.g. "View certificate") changes the step without going
    // through the spine — the sheet must still reveal and focus the content.
    rerender(<MobileStudio {...props} activeStepId="certificate" />);
    expect(screen.getByText("m-controls").parentElement).toHaveFocus();
  });
});
