"use client";

import { useState } from "react";
import { RotateCcw, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";

export interface MobileHeaderProps {
  address: string;
  estimated: boolean;
  onReset: () => void;
}

export default function MobileHeader({ address, estimated, onReset }: MobileHeaderProps) {
  const { user, profile, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const initial = (profile?.displayName || profile?.email || "U").slice(0, 1).toUpperCase();

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
        {estimated && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-lf-amber">est.</span>}
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
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => void logout()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-lf-clay text-sm font-bold text-white"
        >
          {initial}
        </button>
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
