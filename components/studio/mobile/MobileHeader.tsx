"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { AccountMenu } from "@/components/account/AccountMenu";
import { ParcelMark } from "@/components/ui/BrandLockup";

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
  const roleLabel = profile?.role === "builder" ? "Builder" : "Lot owner";

  return (
    <header
      className="flex items-center gap-2 border-b border-lot-line-dark bg-lot-ink px-3 py-2 text-lot-chalk"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
    >
      {/* Compact mark (not the full lockup): on phone widths the address pill
          needs the horizontal space — see DESIGN.md "Visual Identity & Logo". */}
      <Link
        href="/"
        aria-label="LotFoundry home"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control motion-safe:transition-colors hover:bg-lot-surface-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-chalk"
      >
        <ParcelMark className="h-7 w-7 text-lot-chalk" />
      </Link>
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5 rounded-none border border-lot-line-dark bg-lot-surface-dark px-2.5 py-1.5 text-xs text-lot-chalk">
        <span className="min-w-0 truncate">{address}</span>
        {estimated && <span className="shrink-0 lf-kicker text-status-review-on-dark">est.</span>}
      </span>
      <button
        type="button"
        aria-label="Reset scenario"
        onClick={onReset}
        className="flex h-11 w-11 items-center justify-center rounded-control text-lot-stone-on-dark motion-safe:transition-colors hover:bg-lot-surface-dark hover:text-lot-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-chalk"
      >
        <RotateCcw size={17} aria-hidden="true" />
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
          className="flex h-11 w-11 items-center justify-center rounded-control text-lot-stone-on-dark motion-safe:transition-colors hover:bg-lot-surface-dark hover:text-lot-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-chalk"
        >
          <UserRound size={18} aria-hidden="true" />
        </button>
      )}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
