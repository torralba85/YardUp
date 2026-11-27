"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/feasibility";
import { formatNumber, formatUtcDate } from "@/lib/intl-format";
import type { BuilderLedgerEntry } from "@/lib/marketplace-types";
import { Button } from "@/components/ui/Button";
import { PanelHeader } from "@/components/ui/Panel";
import { FileText, Receipt, ShieldCheck } from "lucide-react";

const PAGE_SIZE = 20;

export interface BillingLedgerProps {
  /** The builder's financial and credit ledger transactions. */
  ledger: BuilderLedgerEntry[];
  /** Current available lead unlock credits balance. */
  credits: number;
  /** Optional navigation back to the lead inbox from the empty ledger state. */
  onViewLeads?: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  credit: "CREDITED",
  purchase: "PURCHASE",
  unlock: "UNLOCK",
};

/**
 * In-app billing ledger (T10).
 *
 * Renders an instrument-grade ledger displaying lead unlocks, credit pack
 * purchases, bad-lead credit adjustments, and account balances, complete with
 * double-rule accounting totals and receipt policy disclosures. Rows read
 * newest first.
 */
export default function BillingLedger({ ledger, credits, onViewLeads }: BillingLedgerProps) {
  const [page, setPage] = useState(1);

  const totals = useMemo(() => {
    let totalPaid = 0;
    let totalCreditsGained = 0;
    let totalCreditsUsed = 0;

    for (const entry of ledger) {
      totalPaid += entry.amountPaid || 0;
      if (entry.creditsChange > 0) {
        totalCreditsGained += entry.creditsChange;
      } else if (entry.creditsChange < 0) {
        totalCreditsUsed += Math.abs(entry.creditsChange);
      }
    }

    return {
      totalPaid,
      totalCreditsGained,
      totalCreditsUsed,
    };
  }, [ledger]);

  const rows = useMemo(
    () => [...ledger].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)),
    [ledger],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="mt-6 space-y-6">
      {/* Account overview instruments */}
      <div className="grid gap-px border border-lot-line bg-lot-line sm:grid-cols-3">
        <div className="bg-lot-chalk p-5 sm:p-6">
          <span className="lf-kicker-dense text-lot-stone">Available balance</span>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="lf-money-lg text-lot-ink">{credits}</span>
            <span className="text-base text-lot-stone">{credits === 1 ? "Credit" : "Credits"}</span>
          </p>
          <p className="lf-caption mt-2 text-lot-stone">
            1 credit unlocks 1 full homeowner feasibility lead.
          </p>
        </div>

        <div className="bg-lot-chalk p-5 sm:p-6">
          <span className="lf-kicker-dense text-lot-stone">Total unlocks</span>
          <p className="lf-money-lg mt-3 text-lot-ink">
            {totals.totalCreditsUsed}
          </p>
          <p className="lf-caption mt-2 text-lot-stone">
            Homeowner leads unlocked across your service areas.
          </p>
        </div>

        <div className="bg-lot-chalk p-5 sm:p-6">
          <span className="lf-kicker-dense text-lot-stone">Total spent</span>
          <p className="lf-money-lg mt-3 text-lot-ink">
            {formatCurrency(totals.totalPaid)}
          </p>
          <p className="lf-caption mt-2 text-lot-stone">
            Direct card & credit purchases. Receipts emailed upon checkout.
          </p>
        </div>
      </div>

      {/* Transaction ledger sheet */}
      <div className="border border-lot-line bg-lot-chalk">
        <PanelHeader
          title="Billing & Credits Ledger"
          sub="Audit trail of lead unlock purchases, credit grants, and bad-lead adjustments."
          actions={
            <span className="hidden items-center gap-1.5 rounded-none border border-lot-line bg-lot-surface px-2.5 py-1 text-xs font-medium text-lot-stone sm:inline-flex">
              <Receipt size={14} aria-hidden />
              Tax Receipts via Stripe
            </span>
          }
        />

        {ledger.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText aria-hidden className="mx-auto h-8 w-8 text-lot-stone opacity-40" />
            <p className="mt-3 text-sm font-medium text-lot-ink">No billing activity recorded yet</p>
            <p className="mt-1 text-xs text-lot-stone">
              When you purchase lead unlocks or credit packs, transactions will appear in this ledger.
            </p>
            {onViewLeads ? (
              <div className="mt-4">
                <Button type="button" variant="secondary" size="sm" onClick={onViewLeads}>
                  Browse matched leads
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-lot-line bg-lot-surface text-lot-stone">
                  <tr>
                    <th scope="col" className="lf-kicker-dense px-6 py-3">Date (UTC)</th>
                    <th scope="col" className="lf-kicker-dense px-6 py-3">Description</th>
                    <th scope="col" className="lf-kicker-dense px-6 py-3">Type</th>
                    <th scope="col" className="lf-kicker-dense px-6 py-3 text-right">Credits</th>
                    <th scope="col" className="lf-kicker-dense px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lot-line">
                  {visibleRows.map((entry) => (
                    <tr key={entry.id} className="hover:bg-lot-surface/50 motion-safe:transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 tabular-nums text-lot-stone">
                        {formatLedgerDate(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-medium text-lot-ink">
                        {entry.description || "Marketplace Lead Unlock"}
                        {entry.referenceId && (
                          <span translate="no" className="lf-caption ml-2 font-normal tabular-nums text-lot-stone">
                            ({entry.referenceId.startsWith("LF-") ? entry.referenceId : `Ref: ${entry.referenceId.slice(0, 10)}…`})
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="lf-kicker-dense inline-flex items-center rounded-none border border-lot-line bg-lot-surface px-2 py-0.5 text-lot-stone">
                          {TYPE_LABEL[entry.type] ?? entry.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right tabular-nums">
                        {entry.creditsChange > 0 && (
                          <span className="text-lot-ink font-semibold">+{entry.creditsChange}</span>
                        )}
                        {entry.creditsChange < 0 && (
                          <span className="text-lot-stone">{entry.creditsChange}</span>
                        )}
                        {entry.creditsChange === 0 && <span className="text-lot-stone">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right tabular-nums font-semibold text-lot-ink">
                        {formatCurrency(entry.amountPaid || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-4 border-double border-lot-ink bg-lot-surface/80 font-semibold text-lot-ink">
                  <tr>
                    <td colSpan={3} className="lf-kicker px-6 py-4">
                      Net Account Total
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right tabular-nums">
                      {credits} balance
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {formatCurrency(totals.totalPaid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {pageCount > 1 && (
              <nav
                aria-label="Billing ledger pages"
                className="flex items-center justify-between gap-3 border-t border-lot-line bg-lot-surface/40 px-6 py-3"
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous page
                </Button>
                <span role="status" className="text-sm tabular-nums text-lot-stone">
                  Page {formatNumber(currentPage)} of {formatNumber(pageCount)}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next page
                </Button>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Bad-lead credit guarantee notice */}
      <div className="flex items-start gap-3 border border-lot-line bg-lot-chalk p-5">
        <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-status-eligible" />
        <div className="lf-body-sm text-lot-stone">
          <strong className="text-lot-ink">Bad-Lead Guarantee:</strong> If homeowner contact details bounce, the phone
          is disconnected, or the owner denies having submitted their parcel feasibility request, use the &ldquo;Report this lead&rdquo;
          button on your unlocked lead card. We immediately add 1 credit back to your balance and record the adjustment in this ledger.
        </div>
      </div>
    </div>
  );
}

function formatLedgerDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return formatUtcDate(date, "short").toUpperCase();
}
