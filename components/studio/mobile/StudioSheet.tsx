"use client";

import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Drawer } from "vaul";

/** Collapsed snap height: a fixed peek strip. */
export const PEEK_SNAP = "148px";
/** Half-open snap point (fraction of viewport height). */
export const HALF_SNAP = 0.5;
/** Fully-open snap point (fraction of viewport height). */
export const FULL_SNAP = 0.96;

/** A drawer snap point: a pixel string (e.g. `"148px"`) or a 0–1 fraction. */
export type SheetSnap = number | string;

/** Fields whose focus summons the on-screen keyboard (not sliders/toggles). */
const KEYBOARD_FIELD_SELECTOR = [
  "textarea",
  '[contenteditable="true"]',
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="color"]):not([type="file"])',
].join(", ");

/** Props for {@link StudioSheet}. */
export interface StudioSheetProps {
  /** The active snap point, or `null` for the default (peek). */
  snap: SheetSnap | null;
  /** Called when the active snap point changes. */
  onSnapChange: (snap: SheetSnap | null) => void;
  /** Always-visible strip: headline metrics + config chips. */
  peek: ReactNode;
  /** Visible from half snap: ADU configuration controls. */
  controls: ReactNode;
  /** Scrollable at full snap: summary, permits, inspiration, export. */
  sections: ReactNode;
  /** Title for the active step content. */
  title?: string;
  /** Bump to focus the active step content after a step-navigation action. */
  focusSignal?: number;
}

/**
 * The mobile studio's bottom drawer. Built on `vaul`, it snaps between a peek
 * strip, a half-open controls view, and a full-height scrollable sheet, and
 * exposes a button that cycles through those snap points.
 *
 * @param props - The {@link StudioSheetProps}.
 */
export default function StudioSheet({
  snap,
  onSnapChange,
  peek,
  controls,
  sections,
  title = "Feasibility controls",
  focusSignal = 0,
}: StudioSheetProps) {
  const isFull = snap === FULL_SNAP;
  const isPeek = snap === PEEK_SNAP || snap === null;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const didMountFocusRef = useRef(false);
  // Height of the on-screen keyboard, from the visual viewport. Used to pad the
  // scroll area so content above the keyboard stays reachable while typing.
  const [keyboardInset, setKeyboardInset] = useState(0);

  // The mobile keyboard is handled here, not by vaul (`repositionInputs` is
  // disabled below): when the keyboard opens, iOS also scrolls the layout
  // viewport to "reveal" the focused field inside this fixed sheet, dragging
  // the header and step bar off-screen. The studio is a fixed full-viewport
  // surface with nothing to scroll, so pin the page back in place.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    function onViewportChange() {
      if (!viewport) return;
      // Scale-corrected: pinch-zoom also shrinks `viewport.height` (it is in
      // visual CSS pixels), but `height * scale` recovers the layout-viewport
      // span, so only the keyboard produces a positive inset.
      const inset = Math.max(0, Math.round(window.innerHeight - viewport.height * viewport.scale));
      setKeyboardInset(inset);
      const active = document.activeElement;
      if (inset > 1 && active && sheetRef.current?.contains(active)) {
        window.scrollTo(0, 0);
      }
    }
    viewport.addEventListener("resize", onViewportChange);
    viewport.addEventListener("scroll", onViewportChange);
    return () => {
      viewport.removeEventListener("resize", onViewportChange);
      viewport.removeEventListener("scroll", onViewportChange);
    };
  }, []);

  function handleFocusCapture(event: FocusEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(KEYBOARD_FIELD_SELECTOR)) return;
    if (!isFull) onSnapChange(FULL_SNAP);
    // Lift the field to the top of the scroll area so the keyboard (bottom
    // ~40% of the screen) can't cover it. The rect math is relative between
    // the scroller and the field — both ride the sheet's transform — so it
    // needn't wait for the snap transition. The delay covers the re-render
    // that enables scrolling (`overflow-y-auto` at full) and lets the mobile
    // browser's own keyboard-driven scroll adjustments settle first.
    window.setTimeout(() => {
      const scroller = scrollRef.current;
      if (!scroller || !target.isConnected || !scroller.contains(target)) return;
      scroller.scrollTop +=
        target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12;
    }, 300);
  }

  useEffect(() => {
    if (!didMountFocusRef.current) {
      didMountFocusRef.current = true;
      return;
    }
    if (!isPeek) {
      // The scroll container persists across step changes, so a prior step's
      // scroll offset would leave the new content opened mid-way. Reset it
      // explicitly and keep focus() from issuing a competing scroll.
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      contentRef.current?.focus({ preventScroll: true });
    }
  }, [focusSignal, isPeek]);

  function cycleSnap() {
    if (isPeek) onSnapChange(HALF_SNAP);
    else if (snap === HALF_SNAP) onSnapChange(FULL_SNAP);
    else onSnapChange(PEEK_SNAP);
  }

  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={false}
      // vaul's keyboard handler rewrites the drawer's height/bottom styles
      // and, with snap points active, folds the snap offset into that math —
      // detaching the sheet into a floating mid-screen card while typing.
      // Keyboard handling is done locally instead (see handleFocusCapture).
      repositionInputs={false}
      snapPoints={[PEEK_SNAP, HALF_SNAP, FULL_SNAP]}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
    >
      <Drawer.Portal>
        <Drawer.Content
          ref={sheetRef}
          data-testid="studio-sheet"
          aria-label={title}
          onFocusCapture={handleFocusCapture}
          className="fixed bottom-0 left-0 right-0 z-(--z-index-sheet) flex h-[96dvh] flex-col rounded-t-2xl border-t border-lf-hairline bg-lf-card shadow-[0_-8px_28px_rgba(38,19,7,0.3)] outline-none"
        >
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">
            Review the active studio step, adjust available controls, and expand for supporting sections.
          </Drawer.Description>
          <div className="relative shrink-0 pt-2">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-lf-taupe/40" />
            <button
              type="button"
              aria-label={isFull ? "Collapse panel" : "Expand panel"}
              onClick={cycleSnap}
              className="absolute right-3 top-1 flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-lf-espresso"
            >
              {isFull ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>
          <div className="shrink-0 px-4 pb-2 pt-1">{peek}</div>
          <div
            ref={scrollRef}
            data-testid="sheet-scroll-area"
            className={`min-h-0 flex-1 px-4 ${isFull ? "overflow-y-auto" : "overflow-hidden"}`}
            style={{
              paddingBottom: `calc(2rem + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
            }}
          >
            <div
              ref={contentRef}
              tabIndex={-1}
              aria-label={title}
              className="flex flex-col gap-6 outline-none"
            >
              {controls}
              {sections}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
