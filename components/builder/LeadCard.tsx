"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { CheckCircle2, CircleSlash, FileText, Flag, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusChip, type StatusChipStatus } from "@/components/ui/StatusChip";
import { finishLabels, formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import { formatNumber, formatUtcDate } from "@/lib/intl-format";
import { useStorePrice } from "@/lib/commerce/store-price";
import type {
  BuilderInboxItem,
  UnlockedLeadContact,
} from "@/lib/marketplace-types";

let clockNow = 0;
let clockTimer: ReturnType<typeof setInterval> | null = null;
const clockListeners = new Set<() => void>();

function subscribeNoop(): () => void {
  return () => {};
}

function subscribeClock(listener: () => void): () => void {
  if (clockListeners.size === 0) {
    if (clockNow === 0) {
      clockNow = Date.now();
    }
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((notify) => notify());
    }, 60_000);
  }
  clockListeners.add(listener);
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      if (clockTimer !== null) {
        clearInterval(clockTimer);
        clockTimer = null;
      }
      clockNow = 0;
    }
  };
}

function getClockSnapshot(): number {
  if (clockNow === 0) {
    clockNow = Date.now();
  }
  return clockNow;
}

function getServerClockSnapshot(): null {
  return null;
}

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
  /** Whether this lead has already been credited via a bad-lead report. */
  reported?: boolean;
  /** Whether the builder has bulk credits available. */
  hasCredits?: boolean;
}

const ACCESS_CHIP: Record<LeadAccess, { label: string; status: StatusChipStatus }> = {
  locked: { label: "Locked", status: "info" },
  confirming: { label: "Confirming", status: "review" },
  unlocked: { label: "Unlocked", status: "clear" },
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
  reported,
  onUnlockClick,
  onRespond,
  onViewCertificate,
  onReport,
}: LeadCardProps) {
  const { preview } = item.request;
  const recorded = formatRecorded(item.request.createdAt);
  // Store shells are charged Play's own localized amount, not the Stripe one.
  const unlockPrice = useStorePrice("builder1");
  const headline =
    access === "unlocked" && contact ? contact.streetAddress : preview.neighborhood;

  const headStartUntil = item.request.headStartUntil;
  const now = useSyncExternalStore(
    headStartUntil ? subscribeClock : subscribeNoop,
    headStartUntil ? getClockSnapshot : getServerClockSnapshot,
    getServerClockSnapshot,
  );
  const headStartMs =
    headStartUntil && now !== null
      ? new Date(headStartUntil).getTime() - now
      : 0;
  const isHeadStartActive = headStartMs > 0 && access === "locked";

  // Build is the widest figure, so on two-column phones it takes the last row whole.
  const facts: Array<{ label: string; value: ReactNode; wide?: boolean }> = [
    { label: "Lot", value: `${formatNumber(preview.lotSqft)} sqft` },
    { label: "ADU", value: `${formatNumber(preview.aduSqft)} sf` },
    { label: "Finish", value: finishLabels[preview.config.finish] },
    { label: "Payback", value: `${preview.paybackYears} yrs` },
    {
      label: "Build",
      value: (
        <span className="whitespace-nowrap">
          {formatCompactCurrency(preview.buildBandLow)}–{formatCompactCurrency(preview.buildBandHigh)}
        </span>
      ),
      wide: true,
    },
  ];

  return (
    <article
      className={`border bg-lot-chalk motion-safe:transition-colors motion-safe:duration-(--duration-hover) ${
        item.response.status === "not-a-fit" ? "border-lot-line" : "border-lot-line hover:border-lot-stone"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="lf-kicker-dense text-lot-stone">
            NO. {preview.previewSerial}
            {recorded ? ` · RECORDED ${recorded}` : ""}
          </span>
          <span className="flex items-center gap-3">
            {item.response.status === "new" && (
              <span className="lf-kicker-dense inline-flex items-center gap-1.5 text-lot-ink">
                <span aria-hidden className="h-2 w-2 rounded-full bg-lot-orange" />
                New
              </span>
            )}
            <StatusChip status={ACCESS_CHIP[access].status} label={ACCESS_CHIP[access].label} />
          </span>
        </div>

        {/* Value band first (B2): rent potential leads, then where the lot is. */}
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="lf-money-lg text-lot-ink">{formatCurrency(preview.rentBand)}</span>
          <span className="lf-caption text-lot-stone">/mo rent potential</span>
        </p>
        {preview.rentBasis && (
          <p className="lf-caption mt-1 text-lot-stone">{preview.rentBasis}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="font-display text-xl font-medium tracking-[-0.02em] text-lot-ink">
            {headline}
            {preview.zip && (
              <span className="ml-2 font-sans text-sm font-normal tabular-nums tracking-normal text-lot-stone">
                {preview.zip}
              </span>
            )}
          </p>
          <StatusChip
            status={preview.zoningStatus === "Compliant" ? "clear" : "review"}
            label={`Zoning · ${preview.zoningStatus}`}
          />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px border border-lot-line bg-lot-line sm:grid-cols-5">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className={`min-w-0 bg-lot-chalk px-3 py-2.5 ${fact.wide ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <dt className="lf-kicker-dense text-lot-stone">{fact.label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-lot-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {preview.matchReasons.length > 0 && (
          <ul aria-label="Why this lead matched" className="mt-4 flex flex-wrap gap-2">
            {preview.matchReasons.map((reason) => (
              <li
                key={reason}
                className="lf-caption rounded-none bg-lot-surface px-2 py-1 text-lot-stone"
              >
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-lot-line bg-lot-surface/40 px-5 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          {access === "locked" &&
            (isHeadStartActive ? (
              <div className="border-l-2 border-status-review pl-3">
                <div className="lf-kicker-dense flex items-center gap-1.5 text-status-review">
                  <Lock size={13} aria-hidden />
                  Exclusive window active · Unlocked by 1 builder
                </div>
                <p className="mt-1 text-sm text-lot-ink">
                  This lead is in an exclusive 48h head start window. Opens to all builders in{" "}
                  <span className="font-semibold tabular-nums">{formatHeadStartRemaining(headStartMs)}</span>.
                </p>
                <Button variant="secondary" size="sm" disabled className="mt-3 w-full sm:w-auto">
                  Exclusive window ({formatHeadStartRemaining(headStartMs)} left)
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  variant="commit"
                  onClick={onUnlockClick}
                  leftIcon={<Lock size={16} />}
                  className="w-full sm:w-auto"
                >
                  {hasCredits ? (
                    "Unlock with 1 credit"
                  ) : (
                    <>
                      Unlock lead
                      <span className="font-display text-base font-semibold tabular-nums">{unlockPrice.amountCompact}</span>
                    </>
                  )}
                </Button>
                <span className="lf-caption text-lot-stone">Contact locked — unlock to view</span>
              </div>
            ))}

          {access === "confirming" && (
            <div className="border-l-2 border-status-review pl-3">
              <div className="lf-kicker-dense flex items-center gap-2 text-status-review">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-status-review" />
                Payment received · recording unlock…
              </div>
              <p className="mt-1 text-sm text-lot-ink">
                Usually a few seconds. Your contact details will appear right here.
              </p>
              <p className="lf-caption mt-1 text-lot-stone">You will not be charged twice.</p>
            </div>
          )}

          {access === "unlocked" && contact && (
            <div className="lf-stamp border-l-2 border-status-eligible pl-3">
              <div className="lf-kicker-dense flex items-center gap-1.5 text-status-eligible">
                <CheckCircle2 size={12} aria-hidden />
                <span>Access recorded{demo ? " · demo" : ""}</span>
              </div>
              <address className="mt-1 not-italic text-sm leading-relaxed text-lot-ink">
                <span className="block font-display text-lg font-medium">{contact.ownerContact.name}</span>
                <span className="block break-words">
                  {contact.ownerContact.email}
                  {contact.ownerContact.phone ? ` · ${contact.ownerContact.phone}` : ""}
                </span>
              </address>
              {(onViewCertificate || onReport || reported) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {onViewCertificate && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={onViewCertificate}
                      leftIcon={<FileText size={13} />}
                    >
                      View certificate
                    </Button>
                  )}
                  {reported ? (
                    <StatusChip status="review" label="Bad-lead credited" />
                  ) : (
                    onReport && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={onReport}
                        leftIcon={<Flag size={13} />}
                      >
                        Report this lead
                      </Button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div role="group" aria-label="Your response" className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant={item.response.status === "interested" ? "selected" : "secondary"}
            onClick={() => onRespond("interested")}
            disabled={responding}
            aria-pressed={item.response.status === "interested"}
            leftIcon={<CheckCircle2 size={14} />}
            className="flex-1 lg:flex-none"
          >
            Interested
          </Button>
          <Button
            type="button"
            size="sm"
            variant={item.response.status === "not-a-fit" ? "selected" : "secondary"}
            onClick={() => onRespond("not-a-fit")}
            disabled={responding}
            aria-pressed={item.response.status === "not-a-fit"}
            leftIcon={<CircleSlash size={14} />}
            className="flex-1 lg:flex-none"
          >
            Not a fit
          </Button>
        </div>
      </div>
    </article>
  );
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
  return formatUtcDate(date, "short").toUpperCase();
}

function formatHeadStartRemaining(ms: number): string {
  const totalMinutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
