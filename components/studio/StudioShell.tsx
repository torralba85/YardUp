"use client";

import { ChevronDown, LogOut, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { StepRail } from "@/components/ui/StepRail";
import { Button } from "@/components/ui/Button";
import type { DerivedStep, StudioStep } from "@/lib/studio-steps";
import { DeleteAccountButton } from "./DeleteAccountButton";

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
    <div className="flex min-h-dvh bg-lf-mahogany text-lf-espresso lg:h-dvh lg:overflow-hidden">
      <aside
        aria-label="Studio navigation"
        className="hidden w-[248px] shrink-0 flex-col border-r border-white/10 bg-lf-mahogany text-white lg:flex"
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="flex flex-col gap-1 px-2 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/lotfoundry-lockup-horizontal-inverse.svg"
              alt="LotFoundry"
              className="h-8 w-auto self-start"
            />
            <p className="pl-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-lf-taupe">
              a foundry for lots
            </p>
          </div>

          <div className="mt-6">
            <p className="px-2 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-lf-taupe">
              Your path
            </p>
            <StepRail
              aria-label="Studio steps"
              steps={steps}
              onSelect={(id) => onStepSelect(id as StudioStep)}
            />
          </div>

          <div className="mt-auto space-y-4 pt-6">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/lotfoundry-mark-dark.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-14 w-14 shrink-0 rounded border border-lf-taupe/15 bg-lf-espresso/40 p-1.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-lf-sand">{parcelAddress}</div>
                  <div className="mt-1 truncate text-xs text-lf-taupe">{parcelCity}</div>
                </div>
              </div>
              {onChangeAddress && (
                <button
                  type="button"
                  onClick={onChangeAddress}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-white/10 text-xs font-medium text-lf-sand transition hover:border-lf-taupe/40 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
                >
                  <MapPin size={13} />
                  Change address
                </button>
              )}
              <button
                type="button"
                onClick={onReset}
                className="mt-3 h-9 w-full rounded-full border border-white/10 text-xs font-medium text-lf-sand transition hover:border-lf-taupe/40 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
              >
                Reset Project
              </button>
            </div>

            {savedScenarios.length > 0 && (
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setScenariosOpen((o) => !o)}
                  aria-expanded={scenariosOpen}
                  className="flex w-full items-center justify-between px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-inset"
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-lf-taupe">
                    Saved Concepts
                    <span className="ml-1.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-lf-taupe">
                      {savedScenarios.length}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-lf-taupe/60 transition-transform duration-200 ${scenariosOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {scenariosOpen && (
                  <div className="border-t border-white/[0.07] px-3 pb-3 pt-1">
                    <ul className="space-y-1">
                      {savedScenarios.slice(0, 5).map((scenario) => (
                        <li
                          key={scenario.id}
                          className="flex items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-white/5"
                        >
                          <button
                            type="button"
                            onClick={() => onLoadScenario?.(scenario.id)}
                            className="min-w-0 flex-1 truncate text-left text-lf-sand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
                          >
                            {scenario.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteScenario?.(scenario.id)}
                            aria-label={`Delete saved concept ${scenario.name}`}
                            className="rounded-md p-1 text-lf-taupe transition hover:bg-lf-espresso/60 hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {deleteNotice && (
                      <p role="status" className="mt-2 text-[11px] text-lf-brick">
                        {deleteNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lf-espresso text-sm font-semibold text-lf-sand">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-lf-sand-2">{displayName}</div>
                    <div className="text-xs text-lf-taupe">{roleLabel}</div>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    aria-label="Sign out"
                    className="rounded-md p-1.5 text-lf-taupe transition hover:bg-lf-espresso/60 hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lf-clay focus-visible:ring-offset-lf-mahogany"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
                <DeleteAccountButton />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-lf-sand py-2.5 text-sm font-semibold text-lf-espresso transition hover:bg-white motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Mobile fallback header — the desktop branch can render briefly at narrow
          widths during resize before the media-query swap to MobileStudio. */}
      <main className="lf-grain flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-lf-sand lg:h-dvh lg:overflow-y-auto">
        <header className="flex items-center justify-between border-b border-lf-hairline bg-lf-card px-4 py-3 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-7 w-auto shrink-0" />
          <Button variant="secondary" size="sm" onClick={onReset}>
            Reset
          </Button>
        </header>
        {children}
      </main>
    </div>
  );
}
