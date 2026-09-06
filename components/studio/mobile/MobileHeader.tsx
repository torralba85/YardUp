"use client";

import { useState } from "react";
import Link from "next/link";
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
      <Link
        href="/"
        aria-label="LotFoundry home"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B24]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/a-lot-more/mark.svg" alt="LotFoundry" className="h-7 w-7 rounded-none" />
      </Link>
      <span className="min-w-0 flex-1 truncate rounded-none bg-white/10 px-2.5 py-1 text-xs text-[#F5F5F0]">
        {address}
        {estimated && <span className="ml-1.5 lf-dataprint text-[#E0A33C]">est.</span>}
      </span>
      <button
        type="button"
        aria-label="Reset scenario"
        onClick={onReset}
        className="flex h-11 w-11 items-center justify-center rounded-[3px] text-lot-stone-on-dark motion-safe:transition hover:text-[#F5F5F0]"
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
          className="flex h-11 w-11 items-center justify-center rounded-[3px] text-lot-stone-on-dark motion-safe:transition hover:text-[#F5F5F0]"
        >
          <UserRound size={18} />
        </button>
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
