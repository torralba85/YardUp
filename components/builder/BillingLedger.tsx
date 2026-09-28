"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/feasibility";
import type { BuilderLedgerEntry } from "@/lib/marketplace-types";
import { FileText, Receipt, ShieldCheck } from "lucide-react";

export interface BillingLedgerProps {
  /** The builder's financial and credit ledger transactions. */
  ledger: BuilderLedgerEntry[];
  /** Current available lead unlock credits balance. */
  credits: number;
}

/**
 * In-app billing ledger (T10).
 *
 * Renders an instrument-grade ledger displaying lead unlocks, credit pack
 * purchases, bad-lead credit adjustments, and account balances, complete with
 * double-rule accounting totals and receipt policy disclosures.
 */
export default function BillingLedger({ ledger, credits }: BillingLedgerProps) {
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

  return (
    <div className="space-y-6">
      {/* Account overview instruments */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-lf-hairline bg-lf-card p-5">
          <span className="lf-kicker-dense text-lf-muted">Available Balance</span>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-lf-espresso">
            {credits} <span className="text-base font-normal text-lf-muted">{credits === 1 ? "Credit" : "Credits"}</span>
          </p>
          <p className="mt-1 text-xs text-lf-muted">
            1 credit unlocks 1 full homeowner feasibility lead.
          </p>
        </div>

        <div className="border border-lf-hairline bg-lf-card p-5">
          <span className="lf-kicker-dense text-lf-muted">Total Unlocks</span>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-lf-espresso">
            {totals.totalCreditsUsed}
          </p>
          <p className="mt-1 text-xs text-lf-muted">
            Homeowner leads unlocked across your service areas.
          </p>
        </div>

        <div className="border border-lf-hairline bg-lf-card p-5">
          <span className="lf-kicker-dense text-lf-muted">Total Spent</span>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-lf-espresso">
            {formatCurrency(totals.totalPaid)}
          </p>
          <p className="mt-1 text-xs text-lf-muted">
            Direct card & credit purchases. Receipts emailed upon checkout.
          </p>
        </div>
      </div>

      {/* Transaction ledger sheet */}
      <div className="border border-lf-hairline bg-lf-card">
        <div className="border-b border-lf-hairline px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-lf-espresso">
                Billing & Credits Ledger
              </h2>
              <p className="mt-0.5 text-xs text-lf-muted">
                Audit trail of lead unlock purchases, credit grants, and bad-lead adjustments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-none border border-lf-hairline bg-lf-sand-2 px-2.5 py-1 text-[11px] font-medium text-lf-muted">
                <Receipt size={13} />
                Tax Receipts via Stripe
              </span>
            </div>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-lf-muted opacity-40" />
            <p className="mt-3 text-sm font-medium text-lf-espresso">No billing activity recorded yet</p>
            <p className="mt-1 text-xs text-lf-muted">
              When you purchase lead unlocks or credit packs, transactions will appear in this ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-lf-hairline bg-lf-sand-2 text-[10px] uppercase tracking-[0.08em] text-lf-muted">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Date (UTC)</th>
                  <th scope="col" className="px-6 py-3 font-medium">Description</th>
                  <th scope="col" className="px-6 py-3 font-medium">Type</th>
                  <th scope="col" className="px-6 py-3 font-medium text-right">Credits</th>
                  <th scope="col" className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lf-hairline">
                {ledger.map((entry) => {
                  const isCredit = entry.type === "credit";
                  const isPurchase = entry.type === "purchase";
                  const isUnlock = entry.type === "unlock";

                  return (
                    <tr key={entry.id} className="hover:bg-lf-sand-2/50 motion-safe:transition-colors">
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-lf-muted">
                        {formatLedgerDate(entry.createdAt)}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-lf-espresso">
                        {entry.description || "Marketplace Lead Unlock"}
                        {entry.referenceId && (
                          <span className="ml-2 font-mono text-[10.5px] font-normal text-lf-muted">
                            ({entry.referenceId.startsWith("LF-") ? entry.referenceId : `Ref: ${entry.referenceId.slice(0, 10)}…`})
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        {isCredit && (
                          <span className="inline-flex items-center gap-1 rounded-none border border-lf-amber-ink/20 bg-lf-amber-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-amber-ink">
                            CREDITED
                          </span>
                        )}
                        {isPurchase && (
                          <span className="inline-flex items-center gap-1 rounded-none border border-lf-forest/20 bg-lf-forest-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-forest">
                            PURCHASE
                          </span>
                        )}
                        {isUnlock && (
                          <span className="inline-flex items-center gap-1 rounded-none border border-lf-hairline bg-lf-sand-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-muted">
                            UNLOCK
                          </span>
                        )}
                        {!isCredit && !isPurchase && !isUnlock && (
                          <span className="inline-flex items-center gap-1 rounded-none border border-lf-hairline bg-lf-sand-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-lf-muted">
                            {entry.type.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right font-mono text-sm">
                        {entry.creditsChange > 0 && (
                          <span className="text-lf-forest font-semibold">+{entry.creditsChange}</span>
                        )}
                        {entry.creditsChange < 0 && (
                          <span className="text-lf-muted">{entry.creditsChange}</span>
                        )}
                        {entry.creditsChange === 0 && <span className="text-lf-muted">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right font-mono text-sm font-semibold text-lf-espresso">
                        {formatCurrency(entry.amountPaid || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-4 border-double border-lf-espresso bg-lf-sand-2/80 font-semibold text-lf-espresso">
                <tr>
                  <td colSpan={3} className="px-6 py-3.5 font-sans text-xs uppercase tracking-[0.08em]">
                    Net Account Total
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm">
                    {credits} balance
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-sm">
                    {formatCurrency(totals.totalPaid)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Bad-lead credit guarantee notice */}
      <div className="flex items-start gap-3 border border-lf-hairline bg-lf-card p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lf-forest" />
        <div className="text-xs text-lf-muted leading-relaxed">
          <strong className="text-lf-espresso">Bad-Lead Guarantee:</strong> If homeowner contact details bounce, the phone
          is disconnected, or the owner denies having submitted their parcel feasibility request, use the &ldquo;Report this lead&rdquo;
          button on your unlocked lead card. An immediate 1-credit refund will be applied to your balance and recorded in this ledger.
        </div>
      </div>
    </div>
  );
}

function formatLedgerDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleDateString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "2-digit",
    })
    .toUpperCase();
}
