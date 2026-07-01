"use client";

/**
 * StudioTabBar — the in-studio tab strip introduced by the redesign:
 * Feasibility (default) / Massing (optional) / Certificate.
 *
 * This is distinct from the sidebar nav in AppShell. It only governs what the
 * studio body shows while the sidebar's "Feasibility Studio" item is active.
 * Massing is explicitly labelled "optional" — feasibility no longer depends on
 * designing a building.
 *
 * Implements the full WAI-ARIA tab pattern: a roving tabindex (only the active
 * tab is focusable) plus ArrowLeft/ArrowRight/Home/End keyboard navigation that
 * activates and focuses the target tab. The studio body renders each view as a
 * matching `role="tabpanel"` keyed to {@link tabPanelId} / {@link tabId}.
 */

import { useRef } from "react";
import { CheckCircle2, FileText, SlidersHorizontal } from "lucide-react";

export type StudioTab = "feasibility" | "massing" | "certificate";

const TABS: { id: StudioTab; label: string; icon: typeof CheckCircle2; optional?: boolean }[] = [
  { id: "feasibility", label: "Feasibility", icon: CheckCircle2 },
  { id: "massing", label: "Massing", icon: SlidersHorizontal, optional: true },
  { id: "certificate", label: "Certificate", icon: FileText },
];

/** Stable id for a tab control, so its panel can reference it via aria-labelledby. */
export const tabId = (tab: StudioTab) => `studio-tab-${tab}`;
/** Stable id for a tab's panel, so its tab can reference it via aria-controls. */
export const tabPanelId = (tab: StudioTab) => `studio-tabpanel-${tab}`;

export interface StudioTabBarProps {
  active: StudioTab;
  onChange: (tab: StudioTab) => void;
}

export default function StudioTabBar({ active, onChange }: StudioTabBarProps) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusTab(tab: StudioTab) {
    onChange(tab);
    // Move focus to the newly activated tab so the roving tabindex follows the
    // user's keyboard intent (WAI-ARIA automatic activation).
    tabRefs.current[tab]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    let nextIndex = index;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % TABS.length;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + TABS.length) % TABS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusTab(TABS[nextIndex].id);
  }

  return (
    <div
      role="tablist"
      aria-label="Studio views"
      className="flex shrink-0 items-stretch border-b border-lf-hairline bg-lf-sand-2 px-7"
    >
      {TABS.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={isActive}
            // Only the active panel is rendered (the studio shares one 3D scene
            // across the feasibility/massing panels, so all panels can't be in
            // the DOM at once). Point aria-controls only at the live panel so it
            // never dangles to a missing id.
            aria-controls={isActive ? tabPanelId(tab.id) : undefined}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`relative mr-7 flex h-[50px] items-center gap-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-inset ${
              isActive ? "text-lf-espresso" : "text-lf-muted hover:text-lf-espresso"
            }`}
          >
            <Icon size={16} className={isActive ? "text-lf-clay" : ""} />
            {tab.label}
            {tab.optional ? (
              <span className="rounded-md border border-lf-hairline px-[5px] py-px font-mono text-[9px] uppercase tracking-[0.08em] text-lf-muted">
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
