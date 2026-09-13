"use client";

import { useSyncExternalStore } from "react";

export type InboxFilter = "all" | "new" | "interested" | "archived";
type InboxView = { tab: InboxFilter; viewMode: "cards" | "table"; selectedItemId: string | null; page: number };
const CHANGE_EVENT = "lotfoundry:inbox-view";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readView(search: string): InboxView {
  const params = new URLSearchParams(search);
  const filter = params.get("filter");
  const page = Number(params.get("page"));
  return {
    tab: filter === "new" || filter === "interested" || filter === "archived" ? filter : "all",
    viewMode: params.get("view") === "table" ? "table" : "cards",
    selectedItemId: params.get("lead") || null,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

function updateView(patch: Partial<InboxView>) {
  const url = new URL(window.location.href);
  const next = { ...readView(url.search), ...patch };
  for (const [key, value] of Object.entries({
    filter: next.tab === "all" ? null : next.tab,
    view: next.viewMode === "cards" ? null : next.viewMode,
    lead: next.selectedItemId,
    page: next.page === 1 ? null : String(next.page),
  })) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  if (url.href === window.location.href) return;
  window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Only view state enters the URL; contact/address data remains behind the existing grant checks. */
export function useBuilderInboxView() {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return {
    ...readView(search),
    setTab: (tab: InboxFilter) => updateView({ tab, page: 1, selectedItemId: null }),
    setViewMode: (viewMode: InboxView["viewMode"]) => updateView({ viewMode }),
    setSelectedItemId: (selectedItemId: string | null) => updateView({ selectedItemId }),
    setPage: (page: number) => updateView({ page, selectedItemId: null }),
  };
}
