"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  const didMountFocusRef = useRef(false);

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
      snapPoints={[PEEK_SNAP, HALF_SNAP, FULL_SNAP]}
      activeSnapPoint={snap}
      setActiveSnapPoint={onSnapChange}
    >
      <Drawer.Portal>
        <Drawer.Content
          data-testid="studio-sheet"
          aria-label={title}
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
            className={`min-h-0 flex-1 px-4 ${isFull ? "overflow-y-auto" : "overflow-hidden"}`}
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
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
