"use client";

/**
 * ConstraintsPanel — the right rail of the redesigned "Feasibility" tab.
 *
 * Replaces the massing-controls-first rail with a constraints checklist: what
 * the lot actually allows, grouped Zoning & envelope / Site & utilities /
 * Economics, each line a real engine-derived finding with a Clear / Review
 * status. Massing controls move to their own tab (the existing
 * FeasibilityInspector). Ends with a verdict-reason strip + a jump to the
 * certificate.
 *
 * Mirrors the production rail conventions: 384px, lf-card surface, hairline
 * dividers, mono eyebrows, sharp corners.
 */

import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Stamp,
  XCircle,
} from "lucide-react";
import type { ADUConfig, FeasibilityResult, Parcel } from "@/lib/feasibility";
import {
  summarizeFeasibility,
  statusTone,
  verdictTone,
  type ConstraintGroup,
  type ConstraintItem,
  type ConstraintStatus,
} from "@/lib/feasibility-verdict";

const STATUS_ICON: Record<ConstraintStatus, typeof CheckCircle2> = {
  clear: CheckCircle2,
  review: AlertTriangle,
  blocked: XCircle,
  info: BadgeDollarSign,
};

const GROUP_ORDER: ConstraintGroup[] = [
  "Zoning & envelope",
  "Site & utilities",
  "Economics",
];

export interface ConstraintsPanelProps {
  parcel: Parcel;
  result: FeasibilityResult;
  config: Pick<ADUConfig, "width" | "length">;
  onViewCertificate: () => void;
}

export default function ConstraintsPanel({
  parcel,
  result,
  config,
  onViewCertificate,
}: ConstraintsPanelProps) {
  const summary = summarizeFeasibility(parcel, result, config);
  const tone = verdictTone(summary.verdict);

  return (
    <aside
      aria-label="Property constraints"
      className="flex w-full shrink-0 flex-col border-t border-lf-hairline bg-lf-card lg:w-[384px] lg:border-l lg:border-t-0"
    >
      <div className="border-b border-lf-hairline px-[22px] pb-3.5 pt-[18px]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-clay">
          Property constraints
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold leading-[1.15] text-lf-espresso">
          What this lot allows
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] pb-[18px]">
        {GROUP_ORDER.map((group) => {
          const rows = summary.constraints.filter((c) => c.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              <p className="pb-0.5 pt-[18px] font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-muted">
                {group}
                {group === "Economics" ? (
                  <span className="font-medium text-lf-taupe"> · if built</span>
                ) : null}
              </p>
              {rows.map((row) => (
                <ConstraintRow key={row.id} item={row} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Verdict-reason strip */}
      <div
        className="flex items-start gap-3 border-t border-lf-hairline bg-lf-sand-2 px-[22px] py-3.5"
        style={{ borderLeft: `3px solid ${tone.color}` }}
      >
        <p className="text-[13px] leading-[1.5] text-lf-espresso">
          <strong style={{ color: tone.color }}>{summary.verdict}.</strong>{" "}
          {summary.clearedCount} of {summary.constraints.filter((c) => c.status !== "info").length}{" "}
          checks clear, with {summary.openCount}{" "}to confirm before permitting.
          Utility capacity and easements aren&rsquo;t in this estimate.
        </p>
      </div>
      <div className="px-[22px] pb-4">
        <button
          type="button"
          onClick={onViewCertificate}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-lf-forest text-[13px] font-semibold text-lf-sand transition hover:bg-lf-mahogany focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
        >
          <Stamp size={15} />
          View certificate
        </button>
      </div>
    </aside>
  );
}

function ConstraintRow({ item }: { item: ConstraintItem }) {
  const tone = statusTone(item.status);
  const Icon = STATUS_ICON[item.status];
  const iconColor = item.status === "info" ? "var(--lf-muted)" : tone.color;

  return (
    <div className="flex items-start gap-3 border-b border-lf-hairline py-3">
      <Icon size={16} className="mt-px shrink-0" style={{ color: iconColor }} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-lf-espresso">{item.label}</div>
        <div className="mt-0.5 text-xs text-lf-muted">{item.detail}</div>
      </div>
      <RowTrailing item={item} tone={tone} />
    </div>
  );
}

function RowTrailing({
  item,
  tone,
}: {
  item: ConstraintItem;
  tone: ReturnType<typeof statusTone>;
}) {
  // The income figure keeps the brand's serif-money treatment.
  if (item.id === "rent") {
    return (
      <span className="font-display text-[21px] font-semibold text-lf-forest">
        {item.value?.replace("/mo", "")}
        <span className="font-mono text-[10px] text-lf-muted">/mo</span>
      </span>
    );
  }
  // Rows carrying a measured value show it as a recorded fact (mono),
  // tinted only when the value itself represents a blocker.
  if (item.value) {
    return (
      <span
        className="whitespace-nowrap font-mono text-xs"
        style={{ color: item.status === "blocked" ? tone.color : "var(--lf-espresso)" }}
      >
        {item.value}
      </span>
    );
  }
  // Otherwise a status chip (Clear / Review / Blocked).
  const chipLabel =
    item.status === "clear" ? "Clear" : item.status === "blocked" ? "Blocked" : "Review";
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-full border px-[9px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em]"
      style={{
        backgroundColor: tone.soft,
        color: tone.color,
        borderColor: `color-mix(in srgb, ${tone.color} 33%, transparent)`,
      }}
    >
      {chipLabel}
    </span>
  );
}
