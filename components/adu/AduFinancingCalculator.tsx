"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Field";
import { calculateMonthlyPayment } from "@/lib/certificate-pro-forma";
import { formatCurrency } from "@/lib/feasibility";

export function AduFinancingCalculator({
  projectCost,
  annualNoi,
}: {
  projectCost: number;
  annualNoi: number;
}) {
  const [customLoan, setCustomLoan] = useState<string | null>(null);
  const [rate, setRate] = useState("7.5");
  const [term, setTerm] = useState("30");
  const loan = customLoan ?? String(Math.round(projectCost * 0.8));
  const principal = Number(loan);
  const annualRate = Number(rate);
  const years = Number(term);
  const valid = loan.trim() !== "" && rate.trim() !== "" && term.trim() !== ""
    && Number.isFinite(principal) && principal >= 0 && principal <= projectCost
    && Number.isFinite(annualRate) && annualRate >= 0 && annualRate <= 100
    && Number.isInteger(years) && years >= 1 && years <= 50;
  const payment = valid ? calculateMonthlyPayment(principal, annualRate / 100, years) : null;
  const monthlyNoi = annualNoi / 12;

  return (
    <section id="financing" aria-labelledby="adu-financing-heading" className="scroll-mt-8 border-t border-lot-line pt-6">
      <h3 id="adu-financing-heading" className="font-display text-xl font-medium text-lot-ink">
        ADU loan and cash-flow calculator
      </h3>
      <p className="mt-2 text-sm leading-6 text-lot-stone">
        Optional: compare a fixed-rate, fully amortizing loan with the rental scenario above.
        The starting example borrows 80% of the budget at 7.5% over 30 years. These are illustrative
        inputs, not a current lender quote. Change them to match your offer.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block space-y-2 text-sm text-lot-ink">
            <span>Loan amount ($)</span>
            <Input type="number" min="0" max={projectCost} step="1" value={loan}
              onChange={(event) => setCustomLoan(event.target.value)} aria-describedby="adu-financing-note" />
          </label>
          {valid ? (
            <p className="mt-1 text-xs tabular-nums text-lot-stone">
              {formatCurrency(principal)} principal
            </p>
          ) : null}
        </div>
        <label className="space-y-2 text-sm text-lot-ink">
          <span>Annual interest rate (%)</span>
          <Input type="number" min="0" max="100" step="0.01" value={rate}
            onChange={(event) => setRate(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm text-lot-ink">
          <span>Loan term (years)</span>
          <Input type="number" min="1" max="50" step="1" value={term}
            onChange={(event) => setTerm(event.target.value)} />
        </label>
      </div>
      <div aria-live="polite" className="mt-5">
        {payment === null ? (
          <p className="text-sm text-lot-stone">
            Enter a loan from $0 to {formatCurrency(projectCost)}, a rate from 0% to 100%,
            and a whole-number term from 1 to 50 years to see the comparison.
          </p>
        ) : (
          <dl className="grid gap-4 border-y border-lot-line py-4 sm:grid-cols-3">
            {[
              ["Monthly rent after operating expenses", monthlyNoi],
              ["Monthly loan payment", payment],
              ["Monthly cash after loan payment", monthlyNoi - payment],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-lot-stone">{label}</dt>
                <dd className="mt-1 whitespace-nowrap lf-money-md text-lot-ink">
                  {formatCurrency(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <p id="adu-financing-note" className="mt-3 text-sm leading-6 text-lot-stone">
        Cash after the loan equals modeled rent minus operating expenses and the full loan payment.
        Principal repaid builds equity; it is not added back as cash. Loan payments do not change the
        build budget or simple payback above. Until you edit it, the loan amount follows 80% of that
        budget. Loan fees and construction-period interest need separate quotes; this comparison
        excludes interest-only draws, variable rates, income taxes and future rent changes.
      </p>
    </section>
  );
}
