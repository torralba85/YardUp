"use client";

import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer } from "vaul";

/** Props for {@link FineTuneDrawer}. */
export interface FineTuneDrawerProps {
  /** Whether the drawer is open. */
  open: boolean;
  /** Called when the drawer is dismissed (swipe, scrim tap, or close button). */
  onClose: () => void;
  /** The advanced controls — typically the full FeasibilityInspector. */
  children: ReactNode;
}

/**
 * Optional progressive-disclosure drawer for the mobile journey's advanced
 * controls (dimensions, roof, finish, assumptions). Launched from Shape or
 * Check; never part of the default path.
 */
export default function FineTuneDrawer({ open, onClose, children }: FineTuneDrawerProps) {
  const returnFocus=useRef<HTMLElement|null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Closing must release the modal and focus even if an exit animation stalls. */}
      {open && <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-(--z-index-sheet) bg-lot-scrim" />
        <Drawer.Content
          data-testid="fine-tune-drawer"
          onCloseAutoFocus={event=>{event.preventDefault();returnFocus.current?.focus();}}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            closeRef.current?.focus();
          }}
          aria-label="Fine-tune your ADU"
          className="fixed bottom-0 left-0 right-0 z-(--z-index-sheet) flex h-[92dvh] flex-col border-t border-lot-line bg-lot-chalk shadow-card outline-none"
        >
          <Drawer.Title className="sr-only">Fine-tune your ADU</Drawer.Title>
          <Drawer.Description className="sr-only">
            Adjust exact dimensions, roof, finish, and financial assumptions.
          </Drawer.Description>
          <div className="relative shrink-0 pt-2">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-lot-line" />
            <button
              type="button"
              ref={closeRef}
              aria-label="Close fine-tune panel"
              onClick={onClose}
              className="absolute right-3 top-1 flex h-11 w-11 items-center justify-center rounded-control text-lot-stone motion-safe:transition hover:text-lot-ink"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>}
    </Drawer.Root>
  );
}
