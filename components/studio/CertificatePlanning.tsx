"use client";

import { useId } from "react";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import type { FeasibilityResult, Parcel } from "@/lib/feasibility";
import { planningRows, type FinancingInputs } from "@/lib/certificate-planning";

export default function CertificatePlanning({ parcel, result, inputs, onChange }: {
  parcel: Parcel; result: FeasibilityResult; inputs: FinancingInputs;
  onChange: (value: FinancingInputs) => void;
}) {
  const id = useId();
  return <section className="mt-6 border-t border-lot-line pt-5" aria-label="Certificate planning worksheets">
    <h3 className="lf-section-heading text-lot-ink">Monthly financing cash-flow breakdown</h3>
    <p className="lf-body-sm mt-2 text-lot-stone">Compare an amortizing loan with an interest-only HELOC or construction-loan illustration. Replace these example terms with your lender’s terms.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 print:hidden">
      {([{ key: "financedPercent", label: "Cost financed (%)", min: 0, max: 100, step: 1 },
        { key: "annualRate", label: "Annual interest (%)", min: 0, max: 30, step: 0.1 },
        { key: "years", label: "Repayment term (years)", min: 1, max: 40, step: 1 }] as const).map((field) => <div key={field.key}>
          <FieldLabel htmlFor={`${id}-${field.key}`}>{field.label}</FieldLabel>
          <Input id={`${id}-${field.key}`} className="mt-1" type="number" {...{ min: field.min, max: field.max, step: field.step }} value={inputs[field.key]} onChange={(event) => {
            if (event.target.value !== "" && event.target.validity.valid) onChange({ ...inputs, [field.key]: event.target.valueAsNumber });
          }} />
        </div>)}
      <div><FieldLabel htmlFor={`${id}-payment`}>Payment model</FieldLabel>
        <Select id={`${id}-payment`} className="mt-1" value={inputs.paymentType} onChange={(event) => onChange({ ...inputs, paymentType: event.target.value as FinancingInputs["paymentType"] })}>
          <option value="amortizing">Principal + interest</option><option value="interest-only">Interest only</option>
        </Select>
      </div>
    </div>
    <dl className="mt-4 divide-y divide-lot-line">
      {planningRows(parcel, result, inputs).map(([label, value], index) => <div key={`${label}-${index}`} className="py-3 break-words">
        <dt className="text-sm font-semibold text-lot-ink">{label}</dt><dd className="mt-1 text-xs leading-5 text-lot-stone">{value.startsWith("https://www.sandiego.gov/") ? <a href={value} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{value}</a> : value}</dd>
      </div>)}
    </dl>
  </section>;
}
