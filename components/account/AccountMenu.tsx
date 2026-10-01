"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  FileText,
  HelpCircle,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Trash2,
} from "lucide-react";
import { DeleteAccountButton } from "@/components/studio/DeleteAccountButton";
import { cn } from "@/lib/utils";

export interface AccountMenuProps {
  displayName: string;
  roleLabel: string;
  onSignOut: () => void;
  /** Visual tone for dark mahogany surfaces (studio/mobile) vs light builder. */
  tone?: "dark" | "light";
  /** Optional class on the trigger button. */
  className?: string;
  /** When true, render as an always-open panel (settings page embed). */
  staticPanel?: boolean;
}

const MENU_LINKS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/help", label: "Get help", icon: HelpCircle },
  { href: "/feedback", label: "Send feedback", icon: MessageSquare },
  { href: "/terms", label: "Terms & Conditions", icon: FileText },
  { href: "/privacy", label: "Privacy", icon: Shield },
] as const;

const MENU_WIDTH = 280;
const VIEWPORT_PAD = 12;
const GAP = 8;

interface MenuCoords {
  top: number;
  left: number;
  maxHeight: number;
  transformOrigin: string;
}

/**
 * Shared owner/builder account menu: Settings, Help, Feedback, legal, Sign out,
 * and Delete account. 44px interactive targets throughout.
 *
 * Dropdowns render through a portal with fixed coordinates so sidebar
 * `overflow` never clips the panel, and placement flips above the trigger when
 * space below is tight (the studio account block lives at the bottom of the rail).
 */
export function AccountMenu({
  displayName,
  roleLabel,
  onSignOut,
  tone = "dark",
  className,
  staticPanel = false,
}: AccountMenuProps) {
  const [open, setOpen] = useState(staticPanel);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  // Measure trigger → fixed coords. Layout effect is intentional: position must
  // sync from DOM geometry (viewport collision), not from React state alone.
  useLayoutEffect(() => {
    if (staticPanel || !open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - rect.bottom - VIEWPORT_PAD;
      const spaceAbove = rect.top - VIEWPORT_PAD;
      // Prefer opening upward in the studio rail (trigger sits near the bottom).
      const openUp = spaceBelow < 320 && spaceAbove > spaceBelow;
      const available = Math.max(openUp ? spaceAbove : spaceBelow, 180) - GAP;
      const maxHeight = Math.min(available, viewportH - VIEWPORT_PAD * 2);

      let left = rect.right - MENU_WIDTH;
      left = Math.max(VIEWPORT_PAD, Math.min(left, viewportW - MENU_WIDTH - VIEWPORT_PAD));

      const top = openUp
        ? Math.max(VIEWPORT_PAD, rect.top - GAP - maxHeight)
        : Math.min(rect.bottom + GAP, viewportH - VIEWPORT_PAD - 120);

      setCoords({
        top,
        left,
        maxHeight,
        transformOrigin: openUp ? "bottom right" : "top right",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, staticPanel]);

  useEffect(() => {
    if (staticPanel || !open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, staticPanel]);

  const isDark = tone === "dark";

  const panelBody = (
    <>
      <div className="px-2 pb-2">
        <div
          className={cn(
            "truncate text-sm font-medium",
            isDark ? "text-lf-sand-2" : "text-lf-espresso",
          )}
        >
          {displayName}
        </div>
        <div className={cn("text-xs", isDark ? "text-lot-stone-on-dark" : "text-lf-muted")}>
          {roleLabel}
        </div>
      </div>
      {MENU_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          role="menuitem"
          className={cn(
            "flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-sm motion-safe:transition focus-visible:outline-none focus-visible:ring-2",
            isDark
              ? "text-lf-sand hover:bg-lf-espresso/60 focus-visible:ring-lot-chalk focus-visible:ring-offset-lf-mahogany"
              : "text-lf-espresso hover:bg-lf-sand-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-lf-card",
          )}
          onClick={() => !staticPanel && setOpen(false)}
        >
          <Icon size={15} aria-hidden />
          {label}
        </Link>
      ))}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          onSignOut();
        }}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-sm motion-safe:transition focus-visible:outline-none focus-visible:ring-2",
          isDark
            ? "text-lf-sand hover:bg-lf-espresso/60 focus-visible:ring-lot-chalk focus-visible:ring-offset-lf-mahogany"
            : "text-lf-espresso hover:bg-lf-sand-2 focus-visible:ring-lf-clay-ink focus-visible:ring-offset-lf-card",
        )}
      >
        <LogOut size={15} aria-hidden />
        Sign out
      </button>
      <div
        className={cn(
          "border-t pt-2",
          isDark ? "border-lf-taupe/20" : "border-lf-hairline",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-2 pb-1 text-[11px] uppercase tracking-[0.08em]",
            isDark ? "text-lot-stone-on-dark" : "text-lf-muted",
          )}
        >
          <Trash2 size={12} aria-hidden />
          Danger zone
        </div>
        <DeleteAccountButton tone={tone} />
      </div>
    </>
  );

  if (staticPanel) {
    return (
      <div
        id={menuId}
        role="menu"
        aria-label="Account"
        className={cn(
          "w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-none border p-3 shadow-none",
          isDark
            ? "border-lf-taupe/25 bg-lf-mahogany text-lf-sand"
            : "border-lf-hairline bg-lf-card text-lf-espresso",
        )}
      >
        {panelBody}
      </div>
    );
  }

  const floatingPanel =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label="Account"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: MENU_WIDTH,
              maxHeight: coords.maxHeight,
              transformOrigin: coords.transformOrigin,
              zIndex: "var(--z-index-sheet)",
            }}
            className={cn(
              "flex flex-col overflow-y-auto overscroll-contain rounded-none border p-3 shadow-card motion-safe:animate-[lf-fade-in_140ms_ease-out]",
              isDark
                ? "border-lf-taupe/30 bg-lf-mahogany text-lf-sand"
                : "border-lf-hairline bg-lf-card text-lf-espresso",
            )}
          >
            {panelBody}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-control text-sm font-bold motion-safe:transition focus-visible:outline-none focus-visible:ring-2",
          isDark
            ? "bg-lf-clay text-lf-primary-label focus-visible:ring-lot-chalk focus-visible:ring-offset-lf-mahogany"
            : "bg-lf-clay text-lf-primary-label focus-visible:ring-lf-clay-ink focus-visible:ring-offset-lf-card",
        )}
      >
        {initials}
      </button>
      {floatingPanel}
    </div>
  );
}
