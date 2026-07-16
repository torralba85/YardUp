"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  FileText,
  LifeBuoy,
  LogOut,
  MessageSquarePlus,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { DeleteAccountButton } from "@/components/studio/DeleteAccountButton";

/** Props for {@link AccountMenu}. */
export interface AccountMenuProps {
  /** Signed-in identity line (name or email). */
  displayName: string;
  /** Role line under the name (e.g. "Lot Owner", "Builder"). */
  roleLabel: string;
  /** Called when the user picks "Sign out". */
  onSignOut: () => void;
  /** Popover opening direction; bottom-of-sidebar placements open `"up"`. */
  direction?: "up" | "down";
  /** Tone of the surface the trigger sits on; the popover is always mahogany. */
  surface?: "dark" | "light";
  /** Avatar-only trigger for space-constrained headers. */
  compact?: boolean;
}

const MENU_LINKS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Get help", icon: LifeBuoy },
  { href: "/feedback", label: "Send feedback", icon: MessageSquarePlus },
  { href: "/terms", label: "Terms & Conditions", icon: FileText },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
] as const;

const MENU_ITEM_CLASS =
  "flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-lf-sand transition hover:bg-lf-espresso/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany";

/**
 * The shared signed-in account menu for owner desktop/mobile and builder
 * surfaces: identity, Settings, Get help, Send feedback, Terms & Conditions,
 * Privacy, Sign out, and Delete account. One component so no shell is a
 * sign-out-only dead end. The popover is a mahogany panel on every surface;
 * only the trigger adapts to its background.
 */
export function AccountMenu({
  displayName,
  roleLabel,
  onSignOut,
  direction = "down",
  surface = "dark",
  compact = false,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const dark = surface === "dark";

  return (
    <div className="relative">
      {compact ? (
        <button
          ref={triggerRef}
          type="button"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-lf-clay text-sm font-bold text-lf-sand transition hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${
            dark ? "focus-visible:ring-offset-lf-mahogany" : "focus-visible:ring-offset-lf-card"
          }`}
        >
          {initials.slice(0, 1)}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex min-h-11 w-full items-center gap-2 rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${
            dark
              ? "border-lf-taupe/25 bg-lf-sand/[0.03] hover:bg-lf-sand/[0.06] focus-visible:ring-offset-lf-mahogany"
              : "border-lf-hairline bg-lf-card hover:bg-lf-sand-2 focus-visible:ring-offset-lf-card"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-lf-sand ${
              dark ? "bg-lf-espresso" : "bg-lf-clay"
            }`}
          >
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-sm font-medium ${dark ? "text-lf-sand-2" : "text-lf-espresso"}`}
            >
              {displayName}
            </span>
            <span className={`block text-xs ${dark ? "text-lf-taupe" : "text-lf-muted"}`}>
              {roleLabel}
            </span>
          </span>
          <ChevronDown
            size={14}
            aria-hidden
            className={`shrink-0 transition-transform duration-200 ${dark ? "text-lf-taupe" : "text-lf-muted"} ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-(--z-index-nav)"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Account"
            className={`absolute right-0 z-(--z-index-sheet) w-64 max-w-[calc(100vw-2rem)] space-y-1 rounded-lg border border-lf-taupe/25 bg-lf-mahogany p-3 text-left shadow-xl ${
              direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
            }`}
          >
            <div className="px-2 pb-1">
              <div className="truncate text-sm font-medium text-lf-sand-2">{displayName}</div>
              <div className="text-xs text-lf-taupe">{roleLabel}</div>
            </div>
            {MENU_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={MENU_ITEM_CLASS}
              >
                <Icon size={14} aria-hidden /> {label}
              </Link>
            ))}
            <div className="border-t border-lf-taupe/20 pt-1" role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className={MENU_ITEM_CLASS}
              >
                <LogOut size={14} aria-hidden /> Sign out
              </button>
              <DeleteAccountButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
