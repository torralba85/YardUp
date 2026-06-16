"use client";

import { CheckCircle2, CircleSlash, FileText, Flag, Lock } from "lucide-react";
import { finishLabels, formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import { formatUnlockPrice } from "@/lib/lead-unlock-pricing";
import type {
  BuilderInboxItem,
  BuilderResponseStatus,
  UnlockedLeadContact,
} from "@/lib/marketplace-types";

export type LeadAccess = "locked" | "confirming" | "unlocked";

export interface LeadCardProps {
  item: BuilderInboxItem;
  access: LeadAccess;
  contact: UnlockedLeadContact | null;
  /** Grant came from the zero-key demo path — stamp the reveal DEMO. */
  demo?: boolean;
  responding?: boolean;
  onUnlockClick: () => void;
  onRespond: (status: "interested" | "not-a-fit") => void;
  onViewCertificate?: () => void;
  /** Wired by T9 (report-this-lead / bad-lead credit). */
  onReport?: () => void;
}

const ACCESS_CHIP: Record<LeadAccess, { label: string; cls: string }> = {
  locked: { label: "Locked", cls: "bg-lf-taupe-soft text-lf-muted" },
  confirming: { label: "Confirming", cls: "bg-lf-amber-soft text-lf-amber" },
  unlocked: { label: "Unlocked", cls: "bg-lf-forest-soft text-lf-forest" },
};

export default function LeadCard({
  item,
  access,
  contact,
  demo,
  responding,
  onUnlockClick,
  onRespond,
  onViewCertificate,
  onReport,
}: LeadCardProps) {
  const { preview } = item.request;
  const chip = ACCESS_CHIP[access];
  const headline =
    access === "unlocked" && contact ? contact.streetAddress : preview.neighborhood;

  return (
    <article className="border border-lf-hairline bg-lf-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
          NO. {preview.previewSerial}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${chip.cls}`}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {chip.label}
        </span>
      </div>

      <div className="mt-2">
        <p className="font-semibold text-lf-espresso">
          {headline}
          {preview.zip && (
            <span className="ml-1.5 font-mono text-[10.5px] font-normal text-lf-muted">
              {preview.zip}
            </span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap gap-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-lf-muted">
          <span>{preview.lotSqft.toLocaleString()} sqft</span>
          <span>{preview.aduSqft.toLocaleString()} sf ADU</span>
          <span>{finishLabels[preview.config.finish]}</span>
        </p>
      </div>

      <p className="mt-2 font-display text-[26px] font-semibold leading-none text-lf-forest tabular-nums">
        {formatCurrency(preview.rentBand)}
        <span className="ml-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-muted">
          /mo rent potential
        </span>
      </p>

      <p className="mt-2 flex flex-wrap gap-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-lf-muted">
        <span>
          Build {formatCompactCurrency(preview.buildBandLow)}–{formatCompactCurrency(preview.buildBandHigh)}
        </span>
        <span>Payback {preview.paybackYears} yrs</span>
        <span>{preview.zoningStatus}</span>
      </p>

      {preview.matchReasons.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {preview.matchReasons.map((reason) => (
            <li
              key={reason}
              className="bg-lf-sand-2 px-2 py-1 text-[11px] text-lf-muted"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-lf-muted">
          {statusLabel(item.response.status)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRespond("interested")}
            disabled={responding}
            className="flex h-9 items-center gap-1.5 bg-lf-mahogany px-3 text-xs font-semibold text-lf-sand transition hover:bg-lf-espresso disabled:opacity-50"
          >
            <CheckCircle2 size={14} />
            Interested
          </button>
          <button
            type="button"
            onClick={() => onRespond("not-a-fit")}
            disabled={responding}
            className="flex h-9 items-center gap-1.5 border border-lf-hairline px-3 text-xs font-semibold text-lf-muted transition hover:bg-lf-sand-2 disabled:opacity-50"
          >
            <CircleSlash size={14} />
            Not a fit
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-dashed border-lf-hairline pt-3">
        {access === "locked" && (
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-lf-muted">
              <Lock size={13} />
              Contact locked — unlock to view
            </div>
            <button
              type="button"
              onClick={onUnlockClick}
              className="mt-2.5 inline-flex items-center gap-2 bg-lf-forest px-4 py-2.5 text-sm font-semibold text-lf-sand transition hover:brightness-95"
            >
              Unlock lead
              <span className="font-display text-base font-semibold">{formatUnlockPrice()}</span>
            </button>
          </div>
        )}

        {access === "confirming" && (
          <div className="border border-lf-amber bg-lf-amber-soft px-3.5 py-3">
            <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lf-amber">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lf-amber" />
              Payment received · recording unlock…
            </div>
            <p className="mt-1.5 text-xs text-lf-espresso">
              Usually a few seconds. Your contact details will appear right here.
            </p>
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-lf-muted">
              You will not be charged twice.
            </p>
          </div>
        )}

        {access === "unlocked" && contact && (
          <div className="lf-stamp relative border-[1.5px] border-lf-forest bg-lf-forest-soft px-3.5 py-3">
            <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-[0.14em] text-lf-forest">
              <span>Access recorded{demo ? " · demo" : ""}</span>
            </div>
            <address className="mt-2 font-mono text-xs not-italic leading-relaxed text-lf-espresso">
              <span className="block font-semibold">{contact.ownerContact.name}</span>
              <span className="block">
                {contact.ownerContact.email}
                {contact.ownerContact.phone ? ` · ${contact.ownerContact.phone}` : ""}
              </span>
            </address>
            <div className="mt-2.5 flex gap-2">
              {onViewCertificate && (
                <button
                  type="button"
                  onClick={onViewCertificate}
                  className="flex items-center gap-1.5 border border-lf-hairline px-3 py-2 text-[11.5px] text-lf-clay transition hover:bg-lf-card"
                >
                  <FileText size={13} />
                  View certificate
                </button>
              )}
              {onReport && (
                <button
                  type="button"
                  onClick={onReport}
                  className="flex items-center gap-1.5 border border-lf-hairline px-3 py-2 text-[11.5px] text-lf-clay transition hover:bg-lf-card"
                >
                  <Flag size={13} />
                  Report this lead
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function statusLabel(status: BuilderResponseStatus): string {
  if (status === "interested") return "Interested";
  if (status === "not-a-fit") return "Not a fit";
  return "New";
}
