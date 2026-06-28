"use client";

import { useState } from "react";
import { LogOut, RotateCcw, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { DeleteAccountButton } from "../DeleteAccountButton";

/** Props for {@link MobileHeader}. */
export interface MobileHeaderProps {
  /** Active parcel address shown in the header pill. */
  address: string;
  /** Whether the parcel is an estimate (shows an "est." marker). */
  estimated: boolean;
  /** Called to reset the project. */
  onReset: () => void;
}

/**
 * Compact mobile header: the LotFoundry mark, the active address pill, a reset
 * control, and the account/sign-in affordance (opens the auth modal).
 *
 * @param props - The {@link MobileHeaderProps}.
 */
export default function MobileHeader({ address, estimated, onReset }: MobileHeaderProps) {
  const { user, profile, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (profile?.displayName || profile?.email || "U").slice(0, 1).toUpperCase();
  const displayName = profile?.displayName || profile?.email || "Account";
  const roleLabel = profile?.role === "builder" ? "Builder" : "Lot Owner";

  return (
    <header
      className="flex items-center gap-2 border-b border-white/10 bg-lf-mahogany px-3 py-2 text-white"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
    >
      {/* Compact mark (not the full lockup): on phone widths the address pill
          needs the horizontal space — see DESIGN.md "Visual Identity & Logo". */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/lotfoundry-mark-dark.svg" alt="LotFoundry" className="h-7 w-7 shrink-0 rounded" />
      <span className="min-w-0 flex-1 truncate rounded-full bg-white/10 px-2.5 py-1 text-xs text-lf-sand">
        {address}
        {estimated && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-lf-amber-on-dark">est.</span>}
      </span>
      <button
        type="button"
        aria-label="Reset scenario"
        onClick={onReset}
        className="flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-white"
      >
        <RotateCcw size={17} />
      </button>
      {user ? (
        <div className="relative">
          <button
            type="button"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-lf-clay text-sm font-bold text-white"
          >
            {initial}
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 top-12 z-50 w-60 space-y-2 rounded-lg border border-white/10 bg-lf-mahogany p-3 text-left shadow-xl"
              >
                <div className="px-1">
                  <div className="truncate text-sm font-medium text-lf-sand-2">{displayName}</div>
                  <div className="text-xs text-lf-taupe">{roleLabel}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-sm text-lf-sand transition hover:bg-lf-espresso/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
                >
                  <LogOut size={14} /> Sign out
                </button>
                <DeleteAccountButton />
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Sign in"
          onClick={() => setAuthOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-white"
        >
          <UserRound size={18} />
        </button>
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
