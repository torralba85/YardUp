"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside a modal dialog while `active`, including after
 * focus has landed outside it: a click on the backdrop, or the page behind the
 * dialog, which stays mounted and focusable. The container may itself hold focus
 * (`tabIndex={-1}`); Shift+Tab from there wraps to the last control. Initial
 * focus, Escape and focus return stay with the dialog.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    function trapFocus(event: KeyboardEvent) {
      const container = containerRef.current;
      if (event.key !== "Tab" || !container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (!current || !container.contains(current)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", trapFocus);
    return () => window.removeEventListener("keydown", trapFocus);
  }, [containerRef, active]);
}
