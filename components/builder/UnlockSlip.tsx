"use client";

import { formatCurrency } from "@/lib/feasibility";
import {
  leadUnlockPayLabel,
  leadUnlockSecureNote,
} from "@/lib/lead-unlock-api";
import { useStorePrice } from "@/lib/commerce/store-price";
import type { BuilderInboxItem } from "@/lib/marketplace-types";
import {
  detectPurchaseChannel,
  type PurchaseChannel,
} from "@/lib/commerce/purchase-channel";
import { Dialog } from "@/components/ui/Dialog";

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
  /** Whether the builder has bulk credits available. */
  hasCredits?: boolean;
  /**
   * Billing channel for CTA copy. Defaults to runtime detection so store shells
   * never show a Stripe-only pay label.
   */
  purchaseChannel?: PurchaseChannel;
}

/**
 * Certificate-style purchase slip (3A). Lists exactly what the unlock buys,
 * the head-start and bad-lead-credit terms (19C/20A), and a single confirm
 * action, in the shared `ui/Dialog` (Escape, focus on Close, Tab trap, inert page).
 * `busy` holds it open while an unlock is recording.
 */
export default function UnlockSlip({
  item,
  companyName,
  pending,
  error,
  onConfirm,
  onClose,
  hasCredits,
  purchaseChannel,
}: UnlockSlipProps) {
  const { preview } = item.request;
  const channel = purchaseChannel ?? detectPurchaseChannel();
  // Quote what this channel will actually charge. Play applies its own price
  // charming and per-country currency to `builder.credit1`, so the Stripe
  // amount would be a total the buyer is never billed.
  const unlockPrice = useStorePrice("builder1", { channel });
  const price = unlockPrice.amountCompact;
  const priceWithCents = unlockPrice.amount;
  const payLabel = leadUnlockPayLabel(Boolean(hasCredits), channel);
  const secureNote = leadUnlockSecureNote(Boolean(hasCredits), channel);
  // Without credits and without a store quote there is no honest total to
  // confirm against, so the purchase waits rather than showing a wrong one.
  const priceBlocked = !hasCredits && (unlockPrice.loading || unlockPrice.error !== null);

  return (
    <Dialog
      title="Unlock this lead"
      kicker={`Unlock slip · ${preview.previewSerial}`}
      description={`One-time purchase. The homeowner is notified that ${companyName} has their report.`}
      onClose={onClose}
      busy={pending}
      titleId="unlock-slip-title"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || priceBlocked}
            className="flex min-h-12 w-full items-center justify-between rounded-control bg-lot-ink px-4 py-3.5 text-sm font-semibold text-lot-chalk motion-safe:transition-colors motion-safe:duration-(--duration-hover) hover:bg-lot-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk disabled:opacity-60"
          >
            <span>{pending ? "Recording unlock…" : payLabel}</span>
            <span className="font-display text-lg">{hasCredits ? "1 Credit" : price}</span>
          </button>
          <div className="mt-3 flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-center lf-kicker-dense text-lot-stone">
            <span>Receipt emailed</span>
            <span>{secureNote}</span>
          </div>
        </>
      }
    >
      <div className="border border-lot-line bg-lot-surface px-4 py-3.5">
        <p className="font-semibold">{preview.neighborhood}</p>
        <p className="mt-1 flex flex-wrap gap-3.5 lf-kicker-dense text-lot-stone">
          <span>{preview.lotSqft.toLocaleString()} sqft lot</span>
          <span>{preview.aduSqft.toLocaleString()} sf ADU</span>
          {item.request.ownerVerified && <span>Verified email</span>}
        </p>
        <p className="mt-2 lf-money-lg text-lot-ink">
          {formatCurrency(preview.rentBand)}
          <span className="ml-1.5 lf-kicker-dense text-lot-stone">/mo rent potential</span>
        </p>
      </div>

      <ul className="mt-4 ml-4 list-disc text-sm text-lot-ink marker:text-lot-stone">
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

      <div className="mt-4 text-xs">
        <div className="mb-2 lf-kicker-dense text-lot-stone">This purchase</div>
        <div className="flex justify-between border-b border-dashed border-lot-line py-1.5">
          <span className="text-lot-stone">LEAD UNLOCK · {preview.previewSerial}</span>
          <span className="tabular-nums text-lot-ink">{hasCredits ? "1 Credit" : priceWithCents}</span>
        </div>
        <div className="mt-1 flex justify-between border-t-4 border-double border-lot-ink pt-2.5 text-sm font-semibold text-lot-ink">
          <span>DUE NOW</span>
          <span className="tabular-nums">{hasCredits ? "1 Credit" : priceWithCents}</span>
        </div>
      </div>

      {(error || unlockPrice.error) && (
        <div role="alert" className="mt-3 border border-status-blocked/40 bg-status-blocked-soft px-3 py-2 text-xs text-status-blocked">
          {error ?? unlockPrice.error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2.5 border border-lot-line px-3.5 py-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 flex-none items-center justify-center border-[1.5px] border-lot-ink font-display text-lg font-medium"
        >
          LF
        </span>
        <p className="text-xs text-lot-stone">
          <b className="text-lot-ink">Bad-lead credit.</b> Contact info bounces or the homeowner never
          submitted it? The unlock is credited back, no questions.
        </p>
      </div>
    </Dialog>
  );
}
