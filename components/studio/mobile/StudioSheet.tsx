"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Drawer } from "vaul";

export const PEEK_SNAP = "148px";
export const HALF_SNAP = 0.5;
export const FULL_SNAP = 0.96;

export type SheetSnap = number | string;

export interface StudioSheetProps {
  snap: SheetSnap | null;
  onSnapChange: (snap: SheetSnap | null) => void;
  /** Always-visible strip: headline metrics + config chips. */
  peek: ReactNode;
  /** Visible from half snap: ADU configuration controls. */
  controls: ReactNode;
  /** Scrollable at full snap: summary, permits, inspiration, export. */
  sections: ReactNode;
}

export default function StudioSheet({ snap, onSnapChange, peek, controls, sections }: StudioSheetProps) {
  const isFull = snap === FULL_SNAP;
  const isPeek = snap === PEEK_SNAP || snap === null;

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
          aria-label="Feasibility controls"
          className="fixed bottom-0 left-0 right-0 z-40 flex h-[96dvh] flex-col rounded-t-2xl border-t border-lf-hairline bg-lf-card shadow-[0_-8px_28px_rgba(38,19,7,0.3)] outline-none"
        >
          <Drawer.Title className="sr-only">Feasibility controls</Drawer.Title>
          <Drawer.Description className="sr-only">
            Adjust ADU configuration controls, review feasibility metrics, and open detailed studio
            sections.
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
            className={`min-h-0 flex-1 px-4 ${isFull ? "overflow-y-auto" : "overflow-hidden"}`}
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex flex-col gap-6">
              {controls}
              {sections}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
