"use client";

import { BrandLockup } from "@/components/ui/BrandLockup";
import Link from "next/link";
import { ChevronDown, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { AccountMenu } from "@/components/account/AccountMenu";
import { StepRail } from "@/components/ui/StepRail";
import { Button } from "@/components/ui/Button";
import type { DerivedStep, StudioStep } from "@/lib/studio-steps";

/** Props for {@link StudioShell}. */
export interface StudioShellProps {
  /** The spine steps with their derived states. */
  steps: DerivedStep[];
  /** Called when a step is chosen. */
  onStepSelect: (id: StudioStep) => void;
  /** Active parcel street address. */
  parcelAddress: string;
  /** Active parcel city line. */
  parcelCity: string;
  /** Jump to the address search. */
  onChangeAddress?: () => void;
  /** Reset the project to defaults. */
  onReset: () => void;
  /** Saved scenarios for the sidebar list. */
  savedScenarios?: SavedScenario[];
  /** Load a saved scenario by id. */
  onLoadScenario?: (id: string) => void;
  /** Delete a saved scenario by id. */
  onDeleteScenario?: (id: string) => void;
  /** Transient status after a delete. */
  deleteNotice?: string | null;
  /** The active step's content. */
  children: React.ReactNode;
}

/**
 * Desktop studio chrome for the guided-spine IA: a mahogany sidebar carrying the
 * logo, the single {@link StepRail} navigation (replacing the old sidebar-nav +
 * tab-bar double navigation), the active-parcel card, saved concepts, and the
 * account block. The main region **scrolls** instead of clipping to one viewport,
 * which is the structural fix for the studio being "unviewable" on short screens.
 *
 * Desktop-only: the mobile studio has its own shell ({@link MobileStudio}); this
 * component is rendered only in the desktop branch.
 */
export default function StudioShell({
  steps,
  onStepSelect,
  parcelAddress,
  parcelCity,
  onChangeAddress,
  onReset,
  savedScenarios = [],
  onLoadScenario,
  onDeleteScenario,
  deleteNotice,
  children,
}: StudioShellProps) {
  const { user, profile, logout } = useAuth();
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const displayName = profile?.displayName || profile?.email?.split("@")[0] || "User";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  const roleLabel = profile?.role === "builder" ? "Builder" : "Lot Owner";

  return (
    <div className="flex min-h-dvh bg-[#161616] text-[#161616] lg:h-dvh lg:overflow-hidden">
      <aside
        aria-label="Studio navigation"
        className="hidden w-[248px] shrink-0 flex-col border-r border-[#44443F] bg-[#161616] text-[#F5F5F0] lg:flex"
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="flex flex-col gap-1 px-2 py-4">
            <Link
              href="/"
              aria-label="LotFoundry home"
              className="self-start rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F0]"
            >
              <BrandLockup inverse className="h-8 w-auto" />
            </Link>
            <p className="pl-0.5 lf-dataprint text-[#B7B7AE]">
              ADU planning
            </p>
          </div>

          <div className="mt-6">
            <p className="px-2 pb-2 lf-kicker-dense text-[#B7B7AE]">
              Your path
            </p>
            <StepRail
              aria-label="Studio steps"
              steps={steps}
              onSelect={(id) => onStepSelect(id as StudioStep)}
            />
          </div>

          <div className="mt-auto space-y-4 pt-6">
            <div className="rounded-none border border-[#44443F] bg-[#212121] p-3">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/a-lot-more/mark.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-14 w-14 shrink-0 rounded-none border border-[#44443F] bg-[#161616] p-1.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#F5F5F0]">{parcelAddress}</div>
                  <div className="mt-1 truncate text-xs text-[#B7B7AE]">{parcelCity}</div>
                </div>
              </div>
              {onChangeAddress && (
                <button
                  type="button"
                  onClick={onChangeAddress}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-[3px] border border-[#44443F] text-xs font-medium text-[#F5F5F0] motion-safe:transition hover:border-[#65655F] hover:bg-[#2A2A2A] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
                >
                  <MapPin size={13} />
                  Change address
                </button>
              )}
              <button
                type="button"
                onClick={onReset}
                className="mt-3 h-11 w-full rounded-[3px] border border-[#44443F] text-xs font-medium text-[#F5F5F0] motion-safe:transition hover:border-[#65655F] hover:bg-[#2A2A2A] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
              >
                Reset Project
              </button>
            </div>

            {savedScenarios.length > 0 && (
              <div className="rounded-none border border-[#44443F] bg-[#212121]">
                <button
                  type="button"
                  onClick={() => setScenariosOpen((o) => !o)}
                  aria-expanded={scenariosOpen}
                  className="flex w-full min-h-11 items-center justify-between px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F0] focus-visible:ring-inset"
                >
                  <span className="lf-kicker text-[#B7B7AE]">
                    Saved Concepts
                    <span className="ml-1.5 rounded-none bg-[#161616] px-1.5 py-0.5 text-[10px] font-bold text-[#F5F5F0]">
                      {savedScenarios.length}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-[#B7B7AE] motion-safe:transition-transform duration-200 ${scenariosOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {scenariosOpen && (
                  <div className="border-t border-[#44443F] px-3 pb-3 pt-1">
                    <ul className="space-y-1">
                      {savedScenarios.slice(0, 5).map((scenario) => (
                        <li
                          key={scenario.id}
                          className="flex min-h-11 items-center gap-2 rounded-none px-1.5 py-1 text-xs hover:bg-[#2A2A2A]"
                        >
                          <button
                            type="button"
                            onClick={() => onLoadScenario?.(scenario.id)}
                            className="min-w-0 flex-1 truncate text-left text-[#F5F5F0] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
                          >
                            {scenario.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteScenario?.(scenario.id)}
                            aria-label={`Delete saved concept ${scenario.name}`}
                            className="relative flex h-9 w-9 items-center justify-center rounded-[3px] p-1 text-[#B7B7AE] motion-safe:transition hover:bg-[#161616] hover:text-[#F5F5F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616] before:absolute before:-inset-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {deleteNotice && (
                      <p role="status" className="mt-2 text-[11px] text-[#F0705A]">
                        {deleteNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2 rounded-none border border-[#44443F] bg-[#212121] p-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#161616] text-sm font-semibold text-[#F5F5F0]">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[#F5F5F0]">{displayName}</div>
                  <div className="text-xs text-[#B7B7AE]">{roleLabel}</div>
                </div>
                <AccountMenu
                  displayName={displayName}
                  roleLabel={roleLabel}
                  onSignOut={() => void logout()}
                  tone="dark"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[3px] bg-[#FF5B24] text-sm font-semibold text-[#161616] motion-safe:transition hover:bg-[#EE4B17] motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F5F0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Mobile fallback header */}
      <main className="flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-[#F5F5F0] text-[#161616] lg:h-dvh lg:overflow-y-auto">
        <header className="flex items-center justify-between border-b border-[#DADAD3] bg-[#F5F5F0] px-4 py-3 lg:hidden">
          <Link
            href="/"
            aria-label="LotFoundry home"
            className="shrink-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161616]"
          >
            <BrandLockup className="h-7 w-auto" />
          </Link>
          <Button variant="secondary" size="md" onClick={onReset}>
            Reset
          </Button>
        </header>
        {children}
      </main>
    </div>
  );
}
