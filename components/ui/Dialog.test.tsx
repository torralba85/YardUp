import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

function Harness({ blocking = false, busy = false }: { blocking?: boolean; busy?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button">Background</button>
      {open && (
        <Dialog
          title="Unlock this lead"
          kicker="Unlock slip"
          description="One-time purchase."
          onClose={blocking ? undefined : () => setOpen(false)}
          busy={busy}
          footer={<button type="button">Pay</button>}
        >
          <button type="button">Inside</button>
        </Dialog>
      )}
    </>
  );
}

describe("Dialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("is a named, described modal dialog portalled to body with the mounted-sheet look", async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Unlock this lead" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("One-time purchase.");
    expect(container).not.toContainElement(dialog);
    expect(dialog).toHaveClass("border-[1.5px]", "border-lot-ink", "bg-lot-chalk", "lf-dialog-panel");
    expect(dialog.parentElement).toHaveClass("bg-lot-scrim", "lf-dialog-scrim", "z-(--z-index-modal)");
    expect(screen.getByRole("heading", { level: 2, name: "Unlock this lead" })).toBeInTheDocument();
  });

  it("moves focus to the close button, makes the page inert, locks scroll, and undoes it all on close", async () => {
    const { container } = render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await userEvent.click(opener);

    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveFocus();
    expect(close).toHaveAttribute("aria-keyshortcuts", "Escape");
    expect(container).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
    expect(opener).toHaveFocus();
  });

  it("keeps Tab inside and closes on the scrim but not on a press inside the sheet", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");

    await userEvent.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is blocking without onClose: no close button, Escape and the scrim do nothing, focus starts on the sheet", async () => {
    render(<Harness blocking />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(dialog).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ignores every dismissal while busy", async () => {
    render(<Harness busy />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("settles out for 150ms before closing when motion is allowed, and ignores a second dismissal meanwhile", () => {
    // The jsdom default (`matches: false`) is the reduced-motion path the other
    // tests exercise; this is what a browser without that preference does.
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: no-preference)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }));
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <Dialog title="Unlock this lead" onClose={onClose}>
        body
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("data-closing");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog).toHaveAttribute("data-closing");
    expect(dialog.parentElement).toHaveAttribute("data-closing");
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement as HTMLElement);
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("commits the caller's unmount before the deferred close returns, so focus can go back to the page", () => {
    // `onClose` runs from a timer after the settle. A caller that unmounts the
    // dialog and then restores focus on the next frame needs the page to be
    // un-inerted by then, exactly as when `onClose` ran inside the key event.
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: no-preference)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }));
    vi.useFakeTimers();
    let inertWhenCloseReturned: boolean | null = null;
    function Host() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <main data-testid="page">page</main>
          {open && (
            <Dialog title="Save your property" onClose={() => setOpen(false)}>
              body
            </Dialog>
          )}
        </>
      );
    }
    render(<Host />);
    const page = screen.getByTestId("page").parentElement as HTMLElement;
    expect(page).toHaveAttribute("inert");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    // Read the DOM in the same task as the timer, before React's scheduler
    // could run a deferred render.
    window.setTimeout(() => {
      inertWhenCloseReturned = page.hasAttribute("inert");
    }, 150);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(inertWhenCloseReturned).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("only the topmost of two stacked dialogs answers Escape", async () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(
      <>
        <Dialog title="Outer" onClose={outerClose}>
          outer
        </Dialog>
        <Dialog title="Inner" onClose={innerClose}>
          inner
        </Dialog>
      </>,
    );
    await userEvent.keyboard("{Escape}");
    expect(innerClose).toHaveBeenCalledOnce();
    expect(outerClose).not.toHaveBeenCalled();
  });

  it("leaves focus to the caller with initialFocus none and lays out for print when printable", () => {
    render(
      <Dialog title="Certificate of Feasibility" onClose={() => {}} initialFocus="none" printable id="export" size="xl" fill>
        body
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Certificate of Feasibility" });
    expect(dialog).toHaveAttribute("id", "export");
    expect(dialog).not.toHaveFocus();
    expect(dialog).toHaveClass("sm:max-w-5xl", "print:h-auto", "print:shadow-none");
    expect(dialog.parentElement).toHaveClass("print:static", "print:bg-transparent");
  });
});
