"use client";

import { BrandLockup, ParcelMark } from "@/components/ui/BrandLockup";
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
 * account block. On desktop the shell is one locked viewport and each pane
 * scrolls on its own, so short screens can still reach every control.
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
    // Desktop is one locked viewport. The route layout's planning-guide bar sets
    // `--studio-guide-bar`; reserving it here keeps the bar on screen without a
    // second, document-level scroll. Panes scroll inside `main`.
    <div className="flex min-h-dvh bg-lot-ink text-lot-ink lg:h-[calc(100dvh_-_var(--studio-guide-bar,0px)_-_var(--studio-consent-bar,0px))] lg:min-h-0 lg:overflow-hidden">
      <aside
        aria-label="Studio navigation"
        className="hidden w-[248px] shrink-0 flex-col border-r border-lot-line-dark bg-lot-ink text-lot-chalk lg:flex"
      >
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="flex flex-col gap-1 px-2 py-4">
            <Link
              href="/"
              aria-label="LotFoundry home"
              className="self-start rounded-control motion-safe:transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk"
            >
              <BrandLockup inverse className="h-8 w-auto" />
            </Link>
            <p className="pl-0.5 lf-kicker text-lot-stone-on-dark">
              ADU planning
            </p>
          </div>

          <div className="mt-6">
            <p className="px-2 pb-2 lf-kicker text-lot-stone-on-dark">
              Your path
            </p>
            <StepRail
              aria-label="Studio steps"
              steps={steps}
              onSelect={(id) => onStepSelect(id as StudioStep)}
            />
          </div>

          <div className="mt-auto space-y-4 pt-6">
            <div className="rounded-none border border-lot-line-dark bg-lot-surface-dark p-3">
              <div className="flex gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-none border border-lot-line-dark bg-lot-ink p-2 text-lot-chalk">
                  <ParcelMark className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-lot-chalk">{parcelAddress}</div>
                  <div className="mt-1 truncate text-xs text-lot-stone-on-dark">{parcelCity}</div>
                </div>
              </div>
              {onChangeAddress && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  fullWidth
                  leftIcon={<MapPin size={13} />}
                  onClick={onChangeAddress}
                  className="mt-3 border border-lot-line-dark text-xs font-medium text-lot-chalk hover:border-lot-stone hover:bg-lot-surface-dark-hover focus-visible:ring-lot-chalk focus-visible:ring-offset-lot-ink"
                >
                  Change address
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={onReset}
                className="mt-3 border border-lot-line-dark text-xs font-medium text-lot-chalk hover:border-lot-stone hover:bg-lot-surface-dark-hover focus-visible:ring-lot-chalk focus-visible:ring-offset-lot-ink"
              >
                Reset project
              </Button>
            </div>

            {savedScenarios.length > 0 && (
              <div className="rounded-none border border-lot-line-dark bg-lot-surface-dark">
                <button
                  type="button"
                  onClick={() => setScenariosOpen((o) => !o)}
                  aria-expanded={scenariosOpen}
                  className="flex w-full min-h-11 items-center justify-between px-3 py-2 motion-safe:transition-colors hover:bg-lot-surface-dark-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk focus-visible:ring-inset"
                >
                  <span className="lf-kicker text-lot-stone-on-dark">
                    Saved concepts
                    <span className="ml-1.5 rounded-none bg-lot-ink px-1.5 py-0.5 text-[11px] font-bold text-lot-chalk">
                      {savedScenarios.length}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={`text-lot-stone-on-dark motion-safe:transition-transform duration-(--duration-disclosure) ${scenariosOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {scenariosOpen && (
                  <div className="border-t border-lot-line-dark px-3 pb-3 pt-1">
                    <ul className="space-y-1">
                      {savedScenarios.slice(0, 5).map((scenario) => (
                        <li
                          key={scenario.id}
                          className="flex min-h-11 items-center gap-2 rounded-none px-1.5 py-1 text-xs hover:bg-lot-surface-dark-hover"
                        >
                          <button
                            type="button"
                            onClick={() => onLoadScenario?.(scenario.id)}
                            className="min-h-11 min-w-0 flex-1 truncate text-left text-lot-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-lot-ink"
                          >
                            {scenario.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteScenario?.(scenario.id)}
                            aria-label={`Delete saved concept ${scenario.name}`}
                            className="relative flex h-9 w-9 items-center justify-center rounded-control p-1 text-lot-stone-on-dark motion-safe:transition hover:bg-lot-ink hover:text-lot-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-lot-ink before:absolute before:-inset-1"
                          >
                            <Trash2 size={12} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {deleteNotice && (
                      <p role="status" className="mt-2 text-[11px] text-status-blocked-on-dark">
                        {deleteNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2 rounded-none border border-lot-line-dark bg-lot-surface-dark p-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lot-ink text-sm font-semibold text-lot-chalk">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-lot-chalk">{displayName}</div>
                  <div className="text-xs text-lot-stone-on-dark">{roleLabel}</div>
                </div>
                <AccountMenu
                  displayName={displayName}
                  roleLabel={roleLabel}
                  onSignOut={() => void logout()}
                  tone="dark"
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setIsAuthModalOpen(true)}
                className="border border-lot-stone-on-dark text-sm font-semibold text-lot-chalk hover:bg-lot-surface-dark focus-visible:ring-lot-chalk focus-visible:ring-offset-lot-ink"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* `relative` contains absolutely positioned descendants (sr-only labels
          among them); without a positioned ancestor they escaped the clip and
          stretched the page below the Studio. */}
      {/* Mobile fallback header */}
      <main id="main-content" tabIndex={-1} className="relative flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-lot-chalk text-lot-ink lg:min-h-0 lg:overflow-hidden">
        <header className="flex items-center justify-between border-b border-lot-line bg-lot-chalk px-4 py-3 lg:hidden">
          <Link
            href="/"
            aria-label="LotFoundry home"
            className="shrink-0 rounded-control motion-safe:transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
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
