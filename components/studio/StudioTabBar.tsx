"use client";

/**
 * StudioTabBar — the in-studio tab strip introduced by the redesign:
 * Feasibility (default) / Massing (optional) / Certificate.
 *
 * This is distinct from the sidebar nav in AppShell. It only governs what the
 * studio body shows while the sidebar's "Feasibility Studio" item is active.
 * Massing is explicitly labelled "optional" — feasibility no longer depends on
 * designing a building.
 */

import { CheckCircle2, FileText, SlidersHorizontal } from "lucide-react";

export type StudioTab = "feasibility" | "massing" | "certificate";

const TABS: { id: StudioTab; label: string; icon: typeof CheckCircle2; optional?: boolean }[] = [
  { id: "feasibility", label: "Feasibility", icon: CheckCircle2 },
  { id: "massing", label: "Massing", icon: SlidersHorizontal, optional: true },
  { id: "certificate", label: "Certificate", icon: FileText },
];

export interface StudioTabBarProps {
  active: StudioTab;
  onChange: (tab: StudioTab) => void;
}

export default function StudioTabBar({ active, onChange }: StudioTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Studio views"
      className="flex shrink-0 items-stretch border-b border-lf-hairline bg-lf-sand-2 px-7"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative mr-7 flex h-[50px] items-center gap-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-inset ${
              isActive ? "text-lf-espresso" : "text-lf-muted hover:text-lf-espresso"
            }`}
          >
            <Icon size={16} className={isActive ? "text-lf-clay" : ""} />
            {tab.label}
            {tab.optional ? (
              <span className="rounded border border-lf-hairline px-[5px] py-px font-mono text-[9px] uppercase tracking-[0.08em] text-lf-muted">
                optional
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-lf-clay" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
