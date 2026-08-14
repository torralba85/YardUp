"use client";

import { CheckCircle2, CircleSlash, FileText, Flag, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { finishLabels, formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import { formatUnlockPrice } from "@/lib/lead-unlock-pricing";
import type {
  BuilderInboxItem,
  BuilderResponseStatus,
  UnlockedLeadContact,
} from "@/lib/marketplace-types";

/** A lead card's reveal state: paywalled, mid-unlock, or revealed. */
export type LeadAccess = "locked" | "confirming" | "unlocked";

/** Props for {@link LeadCard}. */
export interface LeadCardProps {
  /** The inbox item (redacted lead + this builder's response state). */
  item: BuilderInboxItem;
  /** Current reveal state of the card. */
  access: LeadAccess;
  /** The unlocked contact payload, present only when `access` is `unlocked`. */
  contact: UnlockedLeadContact | null;
  /** Grant came from the zero-key demo path — stamp the reveal DEMO. */
  demo?: boolean;
  /** Whether a respond action is in flight (disables the buttons). */
  responding?: boolean;
  /** Called when the builder starts the unlock/checkout flow. */
  onUnlockClick: () => void;
  /** Called when the builder triages the lead. */
  onRespond: (status: "interested" | "not-a-fit") => void;
  /** Optional handler to view the unlocked certificate. */
  onViewCertificate?: () => void;
  /** Wired by T9 (report-this-lead / bad-lead credit). */
  onReport?: () => void;
  /** Whether the builder has bulk credits available. */
  hasCredits?: boolean;
}

const ACCESS_CHIP: Record<LeadAccess, { label: string; cls: string }> = {
  locked: { label: "Locked", cls: "bg-lf-taupe-soft text-lf-muted" },
  confirming: { label: "Confirming", cls: "bg-lf-amber-soft text-lf-amber-ink" },
  unlocked: { label: "Unlocked", cls: "bg-lf-forest-soft text-lf-forest" },
};

/**
 * A single lead in the builder inbox. When locked it shows only the redacted
 * preview (banded figures, neighborhood) with an unlock CTA; once unlocked it
 * reveals the owner contact and exact details. Also exposes triage
 * (interested / not-a-fit) and optional certificate-view and report actions.
 *
 * @param props - The {@link LeadCardProps}.
 */
export default function LeadCard({
  item,
  access,
  contact,
  demo,
  responding,
  hasCredits,
  onUnlockClick,
  onRespond,
  onViewCertificate,
  onReport,
}: LeadCardProps) {
  const { preview } = item.request;
  const chip = ACCESS_CHIP[access];
  const recorded = formatRecorded(item.request.createdAt);
  const headline =
    access === "unlocked" && contact ? contact.streetAddress : preview.neighborhood;

  return (
    <article className="border border-lf-hairline bg-lf-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="lf-kicker-dense text-lf-muted">
          NO. {preview.previewSerial}
          {recorded ? ` · RECORDED ${recorded}` : ""}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${chip.cls}`}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {chip.label}
        </span>
      </div>

      {/* Value band first (B2): green is the money this lead pays the builder. */}
      <p className="mt-3 lf-money-md text-lf-forest">
        {formatCurrency(preview.rentBand)}
        <span className="ml-1.5 lf-kicker-dense text-lf-muted">
          /mo rent potential
        </span>
      </p>
      {preview.rentBasis && (
        <p className="mt-1 lf-kicker-dense text-lf-muted">
          {preview.rentBasis}
        </p>
      )}

      <div className="mt-2.5">
        <p className="font-semibold text-lf-espresso">
          {headline}
          {preview.zip && (
            <span className="ml-1.5 font-mono text-[10.5px] font-normal text-lf-muted">
              {preview.zip}
            </span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lf-muted">
          <span>{preview.lotSqft.toLocaleString()} sqft</span>
          <span>{preview.aduSqft.toLocaleString()} sf ADU</span>
          <span>{finishLabels[preview.config.finish]}</span>
        </p>
      </div>

      <p className="mt-2 flex flex-wrap gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lf-muted">
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
              className="rounded-md bg-lf-sand-2 px-2 py-1 text-[11px] text-lf-muted"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="lf-kicker-dense text-lf-muted">
          {statusLabel(item.response.status)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRespond("interested")}
            disabled={responding}
            aria-pressed={item.response.status === "interested"}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition disabled:opacity-50 ${
              item.response.status === "interested"
                ? "bg-lf-clay text-lf-sand"
                : "border border-lf-hairline text-lf-muted hover:bg-lf-sand-2"
            }`}
          >
            <CheckCircle2 size={14} />
            Interested
          </button>
          <button
            type="button"
            onClick={() => onRespond("not-a-fit")}
            disabled={responding}
            aria-pressed={item.response.status === "not-a-fit"}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition disabled:opacity-50 ${
              item.response.status === "not-a-fit"
                ? "border border-lf-taupe bg-lf-taupe-soft text-lf-espresso"
                : "border border-lf-hairline text-lf-muted hover:bg-lf-sand-2"
            }`}
          >
            <CircleSlash size={14} />
            Not a fit
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-dashed border-lf-hairline pt-3">
        {access === "locked" && (
          <div>
            <div className="flex items-center gap-1.5 lf-kicker-dense text-lf-muted">
              <Lock size={13} />
              Contact locked — unlock to view
            </div>
            <Button variant="commit" onClick={onUnlockClick} className="mt-2.5">
              {hasCredits ? "Unlock with 1 Credit" : "Unlock lead"}
              <span className="font-display text-base font-semibold">{hasCredits ? "1 Credit" : formatUnlockPrice()}</span>
            </Button>
          </div>
        )}

        {access === "confirming" && (
          <div className="border border-lf-amber-ink/35 bg-lf-amber-soft px-3.5 py-3">
            <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lf-amber-ink">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lf-amber-ink" />
              Payment received · recording unlock…
            </div>
            <p className="mt-1.5 text-xs text-lf-espresso">
              Usually a few seconds. Your contact details will appear right here.
            </p>
            <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-lf-muted">
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
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={onViewCertificate}
                  leftIcon={<FileText size={13} />}
                  className="border border-lf-hairline"
                >
                  View certificate
                </Button>
              )}
              {onReport && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={onReport}
                  leftIcon={<Flag size={13} />}
                  className="border border-lf-hairline"
                >
                  Report this lead
                </Button>
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

/**
 * Recorded date for the card eyebrow, mirroring the certificate's RECORDED
 * stamp (lib/report.ts). Pinned to UTC because `createdAt` is an ISO instant —
 * keeps the rendered day stable across the builder's timezone.
 */
function formatRecorded(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "2-digit",
    })
    .toUpperCase();
}
