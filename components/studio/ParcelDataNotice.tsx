import { Check, ChevronDown, HelpCircle, TriangleAlert } from "lucide-react";
import type { Parcel } from "@/lib/parcel-types";
import {
  parcelDataEvidenceRows,
  parcelDataNotice,
  type ParcelFieldEvidenceRow,
} from "@/lib/parcel-confidence";

function StatusBadge({ row }: { row: ParcelFieldEvidenceRow }) {
  if (row.status === "observed" && row.confidence === "high") {
    return (
      <span className="inline-flex items-center gap-1 bg-status-eligible-soft px-1.5 py-0.5 text-xs font-medium text-status-eligible">
        <Check size={12} aria-hidden="true" />
        {row.statusLabel}
      </span>
    );
  }
  if (row.status === "observed" || row.status === "derived") {
    return (
      <span className="inline-flex items-center gap-1 bg-status-review-soft px-1.5 py-0.5 text-xs font-medium text-status-review">
        <TriangleAlert size={12} aria-hidden="true" />
        {row.statusLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-lot-surface px-1.5 py-0.5 text-xs font-medium text-lot-stone">
      <HelpCircle size={12} aria-hidden="true" />
      {row.statusLabel}
    </span>
  );
}

export default function ParcelDataNotice({ parcel }: { parcel: Parcel }) {
  const notice = parcelDataNotice(parcel);
  if (!notice) return null;
  const rows = parcelDataEvidenceRows(parcel);
  return (
    <div className="mt-3 border border-status-review/35 bg-status-review-soft text-xs leading-5 text-status-review">
      <p role="status" className="px-3 py-2">
        {notice}
      </p>
      {rows.length > 0 && (
        <details className="group/evidence border-t border-status-review/25 bg-lot-chalk text-lot-ink">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold text-lot-ink hover:bg-lot-surface focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">
            <span>Inspect data sources ({rows.length} fields)</span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="shrink-0 text-lot-stone motion-safe:transition-transform group-open/evidence:rotate-180"
            />
          </summary>
          <dl className="divide-y divide-lot-line border-t border-lot-line px-3 py-1">
            {rows.map((row) => (
              <div key={row.field} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="font-semibold text-lot-ink">{row.label}</dt>
                  <dd>
                    <StatusBadge row={row} />
                  </dd>
                </div>
                <dd className="mt-0.5 text-lot-stone">
                  {row.sourceLabel}
                  {row.recordId ? ` · ID ${row.recordId}` : ""}
                  {row.asOf ? ` · As of ${row.asOf}` : ""}
                </dd>
                {row.detail && (
                  <dd className="mt-0.5 text-lot-stone">{row.detail}</dd>
                )}
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}

