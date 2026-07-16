"use client";

import { useState } from "react";
import { RotateCcw, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { AccountMenu } from "@/components/account/AccountMenu";

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
  const displayName = profile?.displayName || profile?.email || "Account";
  const roleLabel = profile?.role === "builder" ? "Builder" : "Lot Owner";

  return (
    <header
      className="flex items-center gap-2 border-b border-lf-taupe/25 bg-lf-mahogany px-3 py-2 text-lf-sand"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
    >
      {/* Compact mark (not the full lockup): on phone widths the address pill
          needs the horizontal space — see DESIGN.md "Visual Identity & Logo". */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/lotfoundry-mark-dark.svg" alt="LotFoundry" className="h-7 w-7 shrink-0 rounded" />
      <span className="min-w-0 flex-1 truncate rounded-full bg-lf-sand/10 px-2.5 py-1 text-xs text-lf-sand">
        {address}
        {estimated && <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-lf-amber-on-dark">est.</span>}
      </span>
      <button
        type="button"
        aria-label="Reset scenario"
        onClick={onReset}
        className="flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-lf-sand"
      >
        <RotateCcw size={17} />
      </button>
      {user ? (
        <AccountMenu
          displayName={displayName}
          roleLabel={roleLabel}
          onSignOut={() => void logout()}
          tone="dark"
        />
      ) : (
        <button
          type="button"
          aria-label="Sign in"
          onClick={() => setAuthOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-lf-taupe transition hover:text-lf-sand"
        >
          <UserRound size={18} />
        </button>
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
