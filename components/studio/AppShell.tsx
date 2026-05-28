"use client";

import { BarChart3, Box, ChevronDown, FileText, Home, Share2 } from "lucide-react";
import type { NavItem } from "./types";

export const navItems: NavItem[] = [
  { id: "studio", label: "Feasibility Studio", icon: Box },
  { id: "parcel", label: "Parcel Assumptions", icon: FileText },
  { id: "summary", label: "Estimate Summary", icon: BarChart3 },
  { id: "export", label: "Export Preview", icon: Share2 },
];

export interface AppShellProps {
  activeNav: string;
  parcelAddress: string;
  parcelCity: string;
  onNavigate: (id: string) => void;
  onReset: () => void;
  children: React.ReactNode;
}

export default function AppShell({
  activeNav,
  parcelAddress,
  parcelCity,
  onNavigate,
  onReset,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#07111a] text-slate-900">
      <aside
        aria-label="Application navigation"
        className="hidden w-[238px] shrink-0 flex-col border-r border-white/10 bg-[#07111a] text-white lg:flex"
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-400/10 text-emerald-300">
              <Home size={22} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">UrbanLens AR</h1>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                ADU Feasibility Visualizer
              </p>
            </div>
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
                  className={`flex h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111a] ${
                    isActive
                      ? "bg-emerald-500/20 text-white ring-1 ring-emerald-400/15"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-emerald-300" : "text-slate-400"} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex gap-3">
                <div className="h-14 w-14 rounded bg-gradient-to-br from-emerald-200 to-slate-500" />
                <div>
                  <div className="text-sm font-semibold">{parcelAddress}</div>
                  <div className="mt-1 text-xs text-slate-400">{parcelCity}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="mt-3 h-9 w-full rounded border border-white/10 text-xs font-medium text-slate-200 transition hover:border-emerald-300/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111a]"
              >
                Reset Project
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-md px-2 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold">
                MC
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">M. Carter</div>
                <div className="text-xs text-slate-400">Investor Demo</div>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#f5f7f4] lg:h-screen lg:overflow-hidden">
        {children}
      </main>
    </div>
  );
}
