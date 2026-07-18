"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
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
  { href: "/help", label: "Get help", icon: HelpCircle },
  { href: "/feedback", label: "Send feedback", icon: MessageSquare },
  { href: "/terms", label: "Terms & Conditions", icon: FileText },
  { href: "/privacy", label: "Privacy", icon: Shield },
] as const;

/**
 * Shared owner/builder account menu: Settings, Help, Feedback, legal, Sign out,
 * and Delete account. 44px interactive targets throughout.
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
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  useEffect(() => {
    if (staticPanel || !open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, staticPanel]);

  const isDark = tone === "dark";
  const panel = (
    <div
      id={menuId}
      role="menu"
      aria-label="Account"
      className={cn(
        "w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-lg border p-3 shadow-xl",
        isDark
          ? "border-lf-taupe/25 bg-lf-mahogany text-lf-sand"
          : "border-lf-hairline bg-lf-card text-lf-espresso",
        !staticPanel && "absolute right-0 top-12 z-(--z-index-sheet)",
      )}
    >
      <div className="px-2 pb-2">
        <div
          className={cn(
            "truncate text-sm font-medium",
            isDark ? "text-lf-sand-2" : "text-lf-espresso",
          )}
        >
          {displayName}
        </div>
        <div className={cn("text-xs", isDark ? "text-lf-taupe" : "text-lf-muted")}>
          {roleLabel}
        </div>
      </div>
      {MENU_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          role="menuitem"
          className={cn(
            "flex min-h-11 w-full items-center gap-2 rounded-full px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2",
            isDark
              ? "text-lf-sand hover:bg-lf-espresso/60 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-lf-mahogany"
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
          "flex min-h-11 w-full items-center gap-2 rounded-full px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2",
          isDark
            ? "text-lf-sand hover:bg-lf-espresso/60 focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-lf-mahogany"
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
            "flex items-center gap-2 px-2 pb-1 text-[11px] uppercase tracking-[0.14em]",
            isDark ? "text-lf-taupe" : "text-lf-muted",
          )}
        >
          <Trash2 size={12} aria-hidden />
          Danger zone
        </div>
        <DeleteAccountButton tone={tone} />
      </div>
    </div>
  );

  if (staticPanel) {
    return panel;
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2",
          isDark
            ? "bg-lf-clay text-lf-sand focus-visible:ring-lf-clay-on-dark focus-visible:ring-offset-lf-mahogany"
            : "bg-lf-clay text-lf-sand focus-visible:ring-lf-clay-ink focus-visible:ring-offset-lf-card",
        )}
      >
        {initials}
      </button>
      {open ? panel : null}
    </div>
  );
}
