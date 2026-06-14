"use client";

import { BarChart3, Box, ChevronDown, FileText, LogOut, Sparkles, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { NavItem } from "./types";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";

export const navItems: NavItem[] = [
  { id: "studio", label: "Feasibility Studio", icon: Box },
  { id: "guide", label: "Permit Guide", icon: FileText },
  { id: "inspiration", label: "Inspiration Gallery", icon: Sparkles },
  { id: "summary", label: "Estimate Summary", icon: BarChart3 },
  { id: "export", label: "Export Preview", icon: Share2 },
];

export interface AppShellProps {
  activeNav: string;
  parcelAddress: string;
  parcelCity: string;
  onNavigate: (id: string) => void;
  onReset: () => void;
  savedScenarios?: SavedScenario[];
  onLoadScenario?: (id: string) => void;
  onDeleteScenario?: (id: string) => void;
  deleteNotice?: string | null;
  children: React.ReactNode;
}

export default function AppShell({
  activeNav,
  parcelAddress,
  parcelCity,
  onNavigate,
  onReset,
  savedScenarios = [],
  onLoadScenario,
  onDeleteScenario,
  deleteNotice,
  children,
}: AppShellProps) {
  const { user, profile, logout } = useAuth();
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const displayName = profile?.displayName || profile?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
  const roleLabel = profile?.role === "builder" ? "Builder" : "Lot Owner";

  return (
    <div className="flex min-h-dvh bg-lf-mahogany text-lf-espresso">
      <aside
        aria-label="Application navigation"
        className="hidden w-[238px] shrink-0 flex-col border-r border-white/10 bg-lf-mahogany text-white lg:flex"
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex flex-col gap-1 px-2 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal-inverse.svg" alt="LotFoundry" className="h-8 w-auto self-start" />
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-lf-taupe pl-0.5">
              a foundry for lots
            </p>
          </div>

          <nav aria-label="Primary" className="mt-8 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany ${
                    isActive
                      ? "bg-lf-espresso/45 text-white ring-1 ring-lf-taupe/20"
                      : "text-lf-taupe hover:bg-white/5 hover:text-lf-sand"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-lf-sand" : "text-lf-taupe"} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-md border border-white/[0.07] bg-white/[0.02] p-3">
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
                  <div className="truncate mt-1 text-xs text-lf-taupe">{parcelCity}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="mt-3 h-9 w-full rounded border border-white/10 text-xs font-medium text-lf-sand transition hover:border-lf-taupe/40 hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
              >
                Reset Project
              </button>
            </div>

            {savedScenarios.length > 0 && (
              <div className="rounded-md border border-white/[0.07] bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setScenariosOpen((o) => !o)}
                  aria-expanded={scenariosOpen}
                  className="flex w-full items-center justify-between px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-inset"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lf-taupe">
                    Saved Concepts
                    <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-lf-taupe">
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
                          className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-white/5"
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
                            className="rounded p-1 text-lf-taupe transition hover:bg-lf-espresso/60 hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
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
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
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
                  className="rounded p-1.5 text-lf-taupe transition hover:bg-lf-espresso/60 hover:text-lf-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-lf-sand py-2.5 text-sm font-semibold text-lf-espresso transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 focus-visible:ring-offset-lf-mahogany"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <main className="lf-grain flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-lf-sand pb-16 lg:min-h-0 lg:h-dvh lg:overflow-hidden lg:pb-0">
        <header className="flex items-center justify-between border-b border-lf-hairline bg-lf-card px-4 py-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lotfoundry-lockup-horizontal.svg" alt="LotFoundry" className="h-7 w-auto shrink-0" />
            <div className="hidden min-w-0 sm:block border-l border-lf-hairline pl-3">
              <div className="truncate text-xs text-lf-muted">
                {parcelAddress}, {parcelCity}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="h-9 rounded-md border border-lf-hairline px-3 text-sm font-semibold text-lf-muted transition hover:bg-lf-sand-2 hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
          >
            Reset
          </button>
        </header>
        {children}

        {/* Mobile bottom tab navigation */}
        <nav
          aria-label="Mobile navigation"
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-lf-hairline bg-lf-card lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-inset"
              >
                <Icon
                  size={20}
                  className={`shrink-0 ${isActive ? "text-lf-mahogany" : "text-lf-muted"}`}
                />
                <span
                  className={`truncate text-[10px] font-semibold ${
                    isActive ? "text-lf-mahogany" : "text-lf-muted"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
