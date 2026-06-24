"use client";

import { useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/feasibility";
import { formatUnlockPrice } from "@/lib/lead-unlock-pricing";
import type { BuilderInboxItem } from "@/lib/marketplace-types";

/** Props for {@link UnlockSlip}. */
export interface UnlockSlipProps {
  /** The lead being unlocked. */
  item: BuilderInboxItem;
  /** The builder's company name, shown on the slip. */
  companyName: string;
  /** Payment/grant request in flight. */
  pending: boolean;
  /** Error message to display, or `null`. */
  error: string | null;
  /** Called when the builder confirms the unlock purchase. */
  onConfirm: () => void;
  /** Called to dismiss the slip. */
  onClose: () => void;
}

/**
 * Certificate-style purchase slip (3A). Lists exactly what the unlock buys,
 * the head-start and bad-lead-credit terms (19C/20A), and a single confirm
 * action. Basic dialog a11y here (Esc + focus + labelling); the full focus
 * trap + contrast bundle is T15.
 */
export default function UnlockSlip({
  item,
  companyName,
  pending,
  error,
  onConfirm,
  onClose,
}: UnlockSlipProps) {
  const { preview } = item.request;
  const price = formatUnlockPrice();
  const priceWithCents = formatUnlockPrice({ cents: true });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-lf-espresso/90 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-slip-title"
        className="relative w-full max-w-[520px] border-[1.5px] border-lf-espresso bg-lf-card"
      >
        <div aria-hidden className="pointer-events-none absolute inset-1.5 border border-lf-hairline" />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          disabled={pending}
          className="absolute right-4 top-3.5 z-10 font-mono text-[10px] uppercase tracking-[0.1em] text-lf-muted disabled:opacity-40"
        >
          Esc · Close
        </button>

        <div className="relative px-8 py-7">
          <div className="flex justify-between border-b-4 border-double border-lf-espresso pb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
            <span>Unlock slip · {preview.previewSerial}</span>
          </div>

          <h1
            id="unlock-slip-title"
            className="mt-4 font-display text-[32px] font-semibold leading-[1.05] text-lf-espresso"
          >
            Unlock this lead
          </h1>
          <p className="mt-1 text-[13px] text-lf-muted">
            One-time purchase. The homeowner is notified that {companyName} has their report.
          </p>

          <div className="mt-4 border border-lf-hairline bg-lf-sand-2 px-4 py-3.5">
            <p className="font-semibold">{preview.neighborhood}</p>
            <p className="mt-1 flex flex-wrap gap-3.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-lf-muted">
              <span>{preview.lotSqft.toLocaleString()} sqft lot</span>
              <span>{preview.aduSqft.toLocaleString()} sf ADU</span>
              {item.request.ownerVerified && <span>Owner-verified</span>}
            </p>
            <p className="mt-2 font-display text-[28px] font-semibold text-lf-forest tabular-nums">
              {formatCurrency(preview.rentBand)}
              <span className="ml-1.5 font-mono text-[10px] uppercase text-lf-muted">/mo rent potential</span>
            </p>
          </div>

          <ul className="mt-4 ml-4 list-disc text-[12.5px] text-lf-espresso marker:text-lf-taupe">
            <li className="my-1.5">
              <b className="font-semibold">Homeowner contact</b> — name, email, phone
            </li>
            <li className="my-1.5">
              <b className="font-semibold">Full Certificate of Feasibility</b> — parcel, zoning, finances ledger
            </li>
            <li className="my-1.5">
              <b className="font-semibold">Exclusive 48h window</b> before other builders see this lead
            </li>
          </ul>

          <div className="mt-4 font-mono text-[11.5px]">
            <div className="mb-2 text-[9.5px] uppercase tracking-[0.16em] text-lf-muted">This purchase</div>
            <div className="flex justify-between border-b border-dashed border-lf-hairline py-1.5">
              <span className="text-lf-muted">LEAD UNLOCK · {preview.previewSerial}</span>
              <span className="text-lf-espresso">{priceWithCents}</span>
            </div>
            <div className="mt-1 flex justify-between border-t-4 border-double border-lf-espresso pt-2.5 font-semibold text-[13px] text-lf-espresso">
              <span>DUE NOW</span>
              <span>{priceWithCents}</span>
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-3 border border-lf-brick/40 bg-lf-brick/5 px-3 py-2 text-xs text-lf-brick">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="mt-4 flex w-full items-center justify-between bg-lf-forest px-4 py-3.5 text-sm font-semibold text-lf-sand transition hover:brightness-95 disabled:opacity-60"
          >
            <span>{pending ? "Recording unlock…" : "Pay with Stripe"}</span>
            <span className="font-display text-lg">{price}</span>
          </button>
          <div className="mt-3 flex justify-center gap-3.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-lf-muted">
            <span>Receipt emailed</span>
            <span>Secure checkout — Stripe</span>
          </div>

          <div className="mt-3.5 flex items-center gap-2.5 border border-lf-hairline px-3.5 py-2.5">
            <span
              aria-hidden
              className="flex h-[30px] w-[30px] flex-none items-center justify-center border-[1.5px] border-lf-espresso font-display text-lg font-bold"
            >
              LF
            </span>
            <p className="text-[11.5px] text-lf-muted">
              <b className="text-lf-espresso">Bad-lead credit.</b> Contact info bounces or the homeowner never
              submitted it? The unlock is credited back, no questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
