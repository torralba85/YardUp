"use client";

import { useId, useState } from "react";
import { preapprovedPlans, preapprovedPrograms } from "@/lib/preapproved-plans-data";
import { findPreapprovedPlan, suggestPlanJurisdiction, type PreapprovedPlanReference } from "@/lib/preapproved-plans";
import { Button } from "@/components/ui/Button";
import { Checkbox, FieldLabel, Select } from "@/components/ui/Field";
import { PanelHeader } from "@/components/ui/Panel";
import { StatusChip } from "@/components/ui/StatusChip";

interface Props {
  parcel: { city: string; state?: string };
  selected: PreapprovedPlanReference | null;
  onSelect: (reference: PreapprovedPlanReference) => void;
  onRemove: () => void;
  showSelectedSummary?: boolean;
}

const linkClass = "inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lot-orange-ink";

export function PreapprovedPlanSummary({ selected, onRemove }: Pick<Props, "selected" | "onRemove">) {
  if (!selected) return null;
  const plan = findPreapprovedPlan(selected);
  const program = preapprovedPrograms.find(item => item.id === selected.jurisdictionId);
  const available = plan?.status === "active" && program?.status === "verified";
  return (
    <section aria-label="Selected plan reference" className="space-y-2 border-b border-lot-line bg-lot-surface px-6 py-4">
      <StatusChip status={available ? "clear" : "review"} label={available ? "Plan reference selected" : "Plan unavailable"} />
      <p className="font-semibold text-lot-ink">{plan?.name ?? selected.planId}</p>
      <p className="text-sm text-lot-stone">{program ? `${program.city}, ${program.state}` : selected.jurisdictionId}</p>
      <p className="text-sm leading-relaxed text-lot-stone">{available
        ? "Reference only. Your 3D design and feasibility estimates are independent of this plan. Save your study to keep this choice."
        : "This saved reference is no longer available in our verified catalog. Check with the permitting authority or choose another plan."}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {available && <a href={plan.sourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>Official plan listing<span className="sr-only"> (opens in a new tab)</span></a>}
        <Button variant="secondary" size="sm" onClick={onRemove}>Remove plan reference</Button>
      </div>
    </section>
  );
}

/** Shared, free browser. Confirmation establishes the authority, never lot eligibility. */
export default function PreapprovedPlansPanel({ parcel, selected, onSelect, onRemove, showSelectedSummary = true }: Props) {
  const id = useId();
  const suggested = suggestPlanJurisdiction(parcel)?.id ?? "";
  const restoredAuthority = preapprovedPrograms.find(program => program.id === selected?.jurisdictionId);
  const restoredConfirmation = Boolean(selected && restoredAuthority?.status === "verified" && findPreapprovedPlan(selected)?.status === "active");
  const [authorityId, setAuthorityId] = useState(restoredAuthority?.id ?? suggested);
  const [browsingId, setBrowsingId] = useState(restoredAuthority?.id || suggested || preapprovedPrograms[0].id);
  const [confirmed, setConfirmed] = useState(restoredConfirmation);
  const [previousAuthority, setPreviousAuthority] = useState(selected?.jurisdictionId);
  // Loading another study on the same lot may replace the reference without
  // remounting this browser. Restore its prior confirmation, not a postal guess.
  if (previousAuthority !== selected?.jurisdictionId) {
    setPreviousAuthority(selected?.jurisdictionId);
    if (restoredAuthority) {
      setAuthorityId(restoredAuthority.id);
      setBrowsingId(restoredAuthority.id);
      setConfirmed(restoredConfirmation);
    }
  }
  const [notice, setNotice] = useState("");
  const authority = preapprovedPrograms.find(program => program.id === authorityId);
  const program = preapprovedPrograms.find(program => program.id === browsingId)!;
  const plans = preapprovedPlans.filter(plan => plan.jurisdictionId === browsingId && plan.status === "active");
  const canSelect = confirmed && authorityId === browsingId && program.status === "verified";
  const programLabel = program.status === "verified" ? "Official program verified"
    : program.status === "unavailable" ? "Program unavailable" : "Availability needs verification";

  return (
    <section aria-label="Pre-approved plan browser" className="min-w-0 bg-lot-chalk">
      <PanelHeader title="A head start on plan review." sub="Explore city-listed ADU plans that may shorten design review. Lot-specific review and permits are still required." />
      {showSelectedSummary && <PreapprovedPlanSummary selected={selected} onRemove={onRemove} />}
      <div className="space-y-5 px-6 py-5">
        <p className="text-sm leading-relaxed text-lot-stone">Selecting a plan does not change your 3D model, placement or estimates. Official documents describe the plan; the Studio remains a separate planning study.</p>
        <div className="space-y-2">
          <FieldLabel htmlFor={`${id}-authority`}>Permitting authority for this lot</FieldLabel>
          <Select id={`${id}-authority`} value={authorityId} onChange={event => { setAuthorityId(event.target.value); setConfirmed(false); setNotice(""); if (selected) onRemove(); }}>
            <option value="">Choose the permitting authority</option>
            {preapprovedPrograms.map(item => <option key={item.id} value={item.id}>{item.city}, {item.state}{item.authority === "county" ? " (county)" : ""}</option>)}
          </Select>
          <p className="text-xs leading-relaxed text-lot-stone">A postal city is a suggestion. Verify who issues permits for your lot; county plans do not automatically apply inside a city.</p>
          {authority && <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-lot-ink">
            <Checkbox checked={confirmed} onChange={event => { setConfirmed(event.target.checked); if (!event.target.checked && selected) onRemove(); }} />
            <span>I confirm {authority.city}, {authority.state} is the permitting authority for this lot.</span>
          </label>}
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor={`${id}-browse`}>Browse plans for</FieldLabel>
          <Select id={`${id}-browse`} value={browsingId} onChange={event => { setBrowsingId(event.target.value); setNotice(""); }}>
            {preapprovedPrograms.map(item => <option key={item.id} value={item.id}>{item.city}, {item.state}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <StatusChip status={program.status === "verified" ? "clear" : "review"} label={programLabel} />
          <p className="text-sm leading-relaxed text-lot-stone">{program.notes}</p>
          <p className="text-xs text-lot-stone">{program.verifiedAt ? `Official listing checked ${program.verifiedAt}` : `Verification attempted ${program.reviewedAt}`}</p>
          <a href={program.catalogUrl ?? program.sourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {program.catalogUrl ? "Full official catalog" : "Visit permitting authority"}<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <p className="text-xs leading-relaxed text-lot-stone">Browse freely; select a plan only for your confirmed permitting authority. Confirmation does not establish lot eligibility or guarantee approval.</p>
        <p role="status" aria-live="polite" className={notice ? "text-sm text-lot-ink" : "sr-only"}>{notice}</p>
        {plans.length === 0 && <p className="text-sm leading-relaxed text-lot-stone">{program.status === "unavailable" ? "The authority reports this program is unavailable." : "No individually verified plans are listed here yet. Check the official source for current options."}</p>}
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          {plans.map(plan => {
            const isSelected = selected?.planId === plan.id && selected.jurisdictionId === plan.jurisdictionId;
            return (
              <article key={plan.id} aria-label={plan.name} className="min-w-0 border border-lot-line">
                <PanelHeader as="h3" title={plan.name} sub={plan.provider} />
                <div className="space-y-3 px-6 py-4">
                  <p className="text-sm font-semibold text-lot-ink tabular-nums">{[
                    plan.sqft !== undefined ? `${plan.sqft.toLocaleString()} sq ft` : null,
                    plan.bedrooms === 0 ? "Studio" : plan.bedrooms !== undefined ? `${plan.bedrooms} bedroom${plan.bedrooms === 1 ? "" : "s"}` : null,
                  ].filter(Boolean).join(" · ")}</p>
                  <p className="text-sm leading-relaxed text-lot-stone">{plan.restrictions}</p>
                  {plan.feeNote && <p className="text-sm leading-relaxed text-lot-stone">{plan.feeNote}</p>}
                  <p className="text-xs text-lot-stone">Listing checked {plan.verifiedAt}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <a href={plan.sourceUrl} className={linkClass} target="_blank" rel="noopener noreferrer">Official listing<span className="sr-only"> (opens in a new tab)</span></a>
                    {plan.documentUrl && <a href={plan.documentUrl} className={linkClass} target="_blank" rel="noopener noreferrer">Plan documents<span className="sr-only"> (opens in a new tab)</span></a>}
                  </div>
                  <Button fullWidth variant="secondary" disabled={!canSelect || isSelected} onClick={() => {
                    onSelect({ planId: plan.id, jurisdictionId: plan.jurisdictionId });
                    setNotice(`${plan.name} selected as a reference. Save your study to keep this choice.`);
                  }}>{isSelected ? "Selected" : selected ? "Replace selected plan" : "Select plan"}</Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** The selected reference stays visible while the catalog is collapsed. Key by lot in Studio. */
export function PreapprovedPlansSection(props: Props) {
  return <div className="border-t border-lot-line bg-lot-chalk">
    <PreapprovedPlanSummary selected={props.selected} onRemove={props.onRemove} />
    <details>
      <summary className="flex min-h-14 cursor-pointer items-center px-6 text-sm font-semibold text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">Pre-approved plans</summary>
      <PreapprovedPlansPanel {...props} showSelectedSummary={false} />
    </details>
  </div>;
}
