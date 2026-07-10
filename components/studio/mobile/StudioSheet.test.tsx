import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import StudioSheet, { FULL_SNAP, HALF_SNAP, PEEK_SNAP } from "./StudioSheet";

/** Minimal `window.visualViewport` stand-in: jsdom does not implement it. */
class FakeVisualViewport extends EventTarget {
  height = window.innerHeight;
  scale = 1;
}

function installVisualViewport(): FakeVisualViewport {
  const viewport = new FakeVisualViewport();
  Object.defineProperty(window, "visualViewport", {
    value: viewport,
    configurable: true,
    writable: true,
  });
  return viewport;
}

beforeAll(() => {
  // Vaul touches these browser APIs that jsdom lacks.
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
  // Vaul's drag handler calls setPointerCapture / releasePointerCapture on the
  // drag handle element; jsdom does not implement these on HTMLElement.
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
  // Vaul may also call scrollIntoView on snap-point elements.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

describe("StudioSheet", () => {
  afterEach(() => {
    Object.defineProperty(window, "visualViewport", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it("pads the scroll area by the keyboard inset when the visual viewport shrinks", () => {
    const viewport = installVisualViewport();
    render(
      <StudioSheet snap={FULL_SNAP} onSnapChange={() => {}} peek={<div />} controls={<div />} sections={<div />} />,
    );

    act(() => {
      viewport.height = window.innerHeight - 336;
      viewport.dispatchEvent(new Event("resize"));
    });

    expect(screen.getByTestId("sheet-scroll-area").style.paddingBottom).toContain("336px");
  });

  it("does not treat pinch-zoom as a keyboard inset", () => {
    const viewport = installVisualViewport();
    render(
      <StudioSheet snap={FULL_SNAP} onSnapChange={() => {}} peek={<div />} controls={<div />} sections={<div />} />,
    );

    act(() => {
      // Zoomed 2x: the visual viewport halves but spans the same layout area.
      viewport.height = window.innerHeight / 2;
      viewport.scale = 2;
      viewport.dispatchEvent(new Event("resize"));
    });

    // A naive `innerHeight - height` would read a phantom 384px "keyboard".
    const padding = screen.getByTestId("sheet-scroll-area").style.paddingBottom;
    expect(padding).toContain("0px");
    expect(padding).not.toContain("384px");
  });

  it("renders peek, controls and sections content", () => {
    render(
      <StudioSheet
        snap={PEEK_SNAP}
        onSnapChange={() => {}}
        peek={<div>peek-metrics</div>}
        controls={<div>config-controls</div>}
        sections={<div>deep-sections</div>}
      />,
    );

    expect(screen.getByText("peek-metrics")).toBeInTheDocument();
    expect(screen.getByText("config-controls")).toBeInTheDocument();
    expect(screen.getByText("deep-sections")).toBeInTheDocument();
  });

  it("describes the always-open drawer content for assistive technology", () => {
    render(
      <StudioSheet
        snap={PEEK_SNAP}
        onSnapChange={() => {}}
        peek={<div>peek-metrics</div>}
        controls={<div>config-controls</div>}
        sections={<div>deep-sections</div>}
      />,
    );

    const sheet = screen.getByTestId("studio-sheet");
    const descriptionId = sheet.getAttribute("aria-describedby");

    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId as string)).toHaveTextContent(
      /review the active studio step/i,
    );
  });

  it("snaps to full when a keyboard field inside the sheet gains focus", async () => {
    const user = userEvent.setup();
    const onSnapChange = vi.fn();
    render(
      <StudioSheet
        snap={HALF_SNAP}
        onSnapChange={onSnapChange}
        peek={<div />}
        controls={<input type="search" aria-label="Search property address" />}
        sections={<div />}
      />,
    );

    await user.click(screen.getByLabelText("Search property address"));
    expect(onSnapChange).toHaveBeenCalledWith(FULL_SNAP);
  });

  it("leaves the snap alone when a slider gains focus", async () => {
    const user = userEvent.setup();
    const onSnapChange = vi.fn();
    render(
      <StudioSheet
        snap={HALF_SNAP}
        onSnapChange={onSnapChange}
        peek={<div />}
        controls={<input type="range" aria-label="ADU width" />}
        sections={<div />}
      />,
    );

    await user.click(screen.getByLabelText("ADU width"));
    expect(onSnapChange).not.toHaveBeenCalled();
  });

  it("keeps the snap unchanged when a field is focused at full height", async () => {
    const user = userEvent.setup();
    const onSnapChange = vi.fn();
    render(
      <StudioSheet
        snap={FULL_SNAP}
        onSnapChange={onSnapChange}
        peek={<div />}
        controls={<input type="search" aria-label="Search property address" />}
        sections={<div />}
      />,
    );

    await user.click(screen.getByLabelText("Search property address"));
    expect(onSnapChange).not.toHaveBeenCalled();
  });

  it("expand button advances peek → half → full, then collapses back to peek", async () => {
    const user = userEvent.setup();
    const onSnapChange = vi.fn();
    const { rerender } = render(
      <StudioSheet snap={PEEK_SNAP} onSnapChange={onSnapChange} peek={<div />} controls={<div />} sections={<div />} />,
    );

    await user.click(screen.getByRole("button", { name: /expand panel/i }));
    expect(onSnapChange).toHaveBeenLastCalledWith(HALF_SNAP);

    rerender(
      <StudioSheet snap={HALF_SNAP} onSnapChange={onSnapChange} peek={<div />} controls={<div />} sections={<div />} />,
    );
    await user.click(screen.getByRole("button", { name: /expand panel/i }));
    expect(onSnapChange).toHaveBeenLastCalledWith(FULL_SNAP);

    rerender(
      <StudioSheet snap={FULL_SNAP} onSnapChange={onSnapChange} peek={<div />} controls={<div />} sections={<div />} />,
    );
    await user.click(screen.getByRole("button", { name: /collapse panel/i }));
    expect(onSnapChange).toHaveBeenLastCalledWith(PEEK_SNAP);
  });
});
