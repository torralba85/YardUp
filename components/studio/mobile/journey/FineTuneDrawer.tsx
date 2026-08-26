"use client";

import type { ReactNode } from "react";
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
  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-(--z-index-sheet) bg-lf-espresso/50" />
        <Drawer.Content
          data-testid="fine-tune-drawer"
          aria-label="Fine-tune your ADU"
          className="fixed bottom-0 left-0 right-0 z-(--z-index-sheet) flex h-[92dvh] flex-col rounded-t-2xl border-t border-lf-hairline bg-lf-card shadow-[0_-8px_28px_rgba(38,19,7,0.3)] outline-none"
        >
          <Drawer.Title className="sr-only">Fine-tune your ADU</Drawer.Title>
          <Drawer.Description className="sr-only">
            Adjust exact dimensions, roof, finish, and financial assumptions.
          </Drawer.Description>
          <div className="relative shrink-0 pt-2">
            <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-lf-taupe/40" />
            <button
              type="button"
              aria-label="Close fine-tune panel"
              onClick={onClose}
              className="absolute right-3 top-1 flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-lf-espresso"
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
      </Drawer.Portal>
    </Drawer.Root>
  );
}
