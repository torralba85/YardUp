"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "./useFocusTrap";

/** Panel widths from `sm` up. Below `sm` every dialog is a full-width bottom sheet. */
export type DialogSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<DialogSize, string> = {
  sm: "sm:max-w-md", // sign-in, consent
  md: "sm:max-w-xl", // purchase slips, short forms
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl", // certificates, boards, documents
};

/** Props for {@link Dialog}. */
export interface DialogProps {
  /** Called on Escape, a click on the scrim and the close button. Omit it for a blocking dialog. */
  onClose?: () => void;
  /** The dialog's accessible name, set as its `h2`. */
  title: React.ReactNode;
  /** Small uppercase line above the title. Plain text renders in stone. */
  kicker?: React.ReactNode;
  /** One line under the title; becomes the dialog's accessible description. */
  description?: React.ReactNode;
  /** A row of task actions under the title block (print, share). Hidden in print. */
  toolbar?: React.ReactNode;
  /** Pinned under the scrolling body, above the bottom edge. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  size?: DialogSize;
  /** Hold the full available height (an iframe, a long document) instead of fitting the content. */
  fill?: boolean;
  /**
   * Where focus lands on open. Default: the close button, or the dialog itself when
   * it is blocking. `"none"` leaves focus to the caller.
   */
  initialFocus?: React.RefObject<HTMLElement | null> | "none";
  /** Return focus to the opener on close (default). Pass false when the caller restores it. */
  restoreFocus?: boolean;
  /** While true, Escape, the scrim and the close button do nothing (a purchase is recording). */
  busy?: boolean;
  /** Lay the dialog out as a printable document under `@media print`. */
  printable?: boolean;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** Id of the panel (`#export` for the certificate's print rules). */
  id?: string;
  /** Fixed id for the title, when tests or links address it. */
  titleId?: string;
  titleRef?: React.Ref<HTMLHeadingElement>;
  /** The scrolling body, for callers that reset or measure its scroll. */
  bodyRef?: React.Ref<HTMLDivElement>;
  className?: string;
  bodyClassName?: string;
}

const subscribe = () => () => undefined;

// Shared across every open dialog: one scroll lock, and a stack so only the
// topmost dialog answers Escape.
let scrollLocks = 0;
let savedBody: { overflow: string; paddingRight: string } | null = null;
const openStack: HTMLElement[] = [];

function lockScroll() {
  scrollLocks += 1;
  if (scrollLocks > 1) return;
  const { body } = document;
  savedBody = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  // Keep the page from shifting sideways when its scrollbar disappears.
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (gutter > 0) body.style.paddingRight = `${gutter}px`;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0 || !savedBody) return;
  document.body.style.overflow = savedBody.overflow;
  document.body.style.paddingRight = savedBody.paddingRight;
  savedBody = null;
}

/** Makes everything outside `host` inert, so assistive tech and the pointer stay in the dialog. */
function isolate(host: HTMLElement) {
  const changed: Element[] = [];
  for (const sibling of Array.from(document.body.children)) {
    if (sibling === host || sibling.hasAttribute("inert") || sibling.tagName === "SCRIPT") continue;
    sibling.setAttribute("inert", "");
    changed.push(sibling);
  }
  return () => changed.forEach((element) => element.removeAttribute("inert"));
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

/**
 * The one modal dialog. A chalk sheet in a 1.5px carbon frame with an inner
 * hairline mat, set on the carbon scrim (75%) like a print mounted on a board:
 * centred with a hard paper offset from `sm` up, a bottom sheet on phones.
 * It portals to `body`, makes the rest of the page inert, traps Tab, locks
 * page scroll, closes on Escape and on the scrim, and returns focus to its
 * opener. Render it only while open.
 */
export function Dialog({
  onClose,
  title,
  kicker,
  description,
  toolbar,
  footer,
  children,
  size = "md",
  fill = false,
  initialFocus,
  restoreFocus = true,
  busy = false,
  printable = false,
  closeLabel = "Close",
  id,
  titleId,
  titleRef,
  bodyRef,
  className,
  bodyClassName,
}: DialogProps) {
  const isClient = React.useSyncExternalStore(subscribe, () => true, () => false);
  const hostRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const pressedOnScrim = React.useRef(false);
  const generatedId = React.useId();
  const headingId = titleId ?? `${generatedId}-title`;
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const dismissible = Boolean(onClose);
  const canDismiss = dismissible && !busy;

  useFocusTrap(panelRef, isClient);

  // Open-edge work runs once per mount: isolate the page, lock scroll, move
  // focus in, and undo all of it (returning focus) on unmount.
  React.useEffect(() => {
    const host = hostRef.current;
    const panel = panelRef.current;
    if (!host || !panel) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openStack.push(host);
    lockScroll();
    const release = isolate(host);
    if (initialFocus !== "none") {
      const target = initialFocus?.current ?? (dismissible ? closeRef.current : panel);
      target?.focus({ preventScroll: true });
    }
    return () => {
      openStack.splice(openStack.indexOf(host), 1);
      release();
      unlockScroll();
      if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-edge only; later prop changes must not re-isolate or steal focus
  }, [isClient]);

  React.useEffect(() => {
    if (!isClient || !canDismiss) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (openStack[openStack.length - 1] !== hostRef.current) return;
      event.preventDefault();
      onClose?.();
    }
    // window, not document: keydowns from inside the page bubble up to it, and so do
    // events dispatched on window itself.
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isClient, canDismiss, onClose]);

  if (!isClient) return null;

  return createPortal(
    <div
      ref={hostRef}
      className={cn(
        "lf-dialog-scrim fixed inset-0 z-(--z-index-modal) flex items-end justify-center bg-lot-scrim sm:items-center sm:p-6",
        printable && "print:static print:block print:bg-transparent print:p-0",
      )}
      // A press that starts on the scrim and ends there closes; a text
      // selection dragged out of the panel does not.
      onMouseDown={(event) => {
        pressedOnScrim.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOnScrim.current && event.target === event.currentTarget && canDismiss) onClose?.();
        pressedOnScrim.current = false;
      }}
    >
      <section
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          "lf-dialog-panel relative flex max-h-[92dvh] w-full flex-col border-[1.5px] border-lot-ink bg-lot-chalk text-lot-ink outline-none sm:max-h-[min(92dvh,56rem)] sm:shadow-paper",
          SIZE[size],
          fill && "h-[92dvh] sm:h-[min(92dvh,56rem)]",
          printable && "print:h-auto print:max-h-none print:max-w-none print:border-0 print:shadow-none",
          className,
        )}
      >
        {/* The mat: an inner hairline that frames the sheet like a mounted print. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-1.5 border border-lot-line print:hidden" />

        <header className="relative mx-1.5 mt-1.5 shrink-0 border-b border-lot-line px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {kicker != null && <p className="lf-kicker mb-2 text-lot-stone">{kicker}</p>}
              <h2
                id={headingId}
                ref={titleRef}
                tabIndex={-1}
                // Utilities, not lf-panel-heading: that class is unlayered CSS and would
                // override the sm:text-3xl step.
                className="text-balance font-display text-2xl font-medium leading-tight tracking-[-0.035em] text-lot-ink outline-none sm:text-3xl"
              >
                {title}
              </h2>
              {description != null && (
                <p id={descriptionId} className="lf-body-sm mt-2 text-lot-stone">
                  {description}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                ref={closeRef}
                type="button"
                onClick={() => onClose?.()}
                disabled={busy}
                aria-label={closeLabel}
                aria-keyshortcuts="Escape"
                className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-control border border-lot-line px-2.5 text-lot-stone motion-safe:transition-colors motion-safe:duration-(--duration-hover) hover:border-lot-ink hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk disabled:cursor-not-allowed disabled:opacity-40 print:hidden"
              >
                <span aria-hidden="true" className="lf-kicker-dense hidden sm:inline">
                  Esc
                </span>
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
          </div>
          {toolbar != null && <div className="mt-4 flex flex-wrap gap-2 print:hidden">{toolbar}</div>}
        </header>

        <div
          ref={(element) => assignRef(bodyRef, element)}
          className={cn(
            "relative mx-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6",
            footer == null && "mb-1.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            printable && "print:overflow-visible",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer != null && (
          <footer className="relative mx-1.5 mb-1.5 shrink-0 border-t border-lot-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-7">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}
