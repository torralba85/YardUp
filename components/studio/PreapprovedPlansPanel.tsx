"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { preapprovedPlans, preapprovedPrograms } from "@/lib/preapproved-plans-data";
import {
  findPreapprovedPlan,
  modelMatchesPlan,
  planFacts,
  planFootprintLabel,
  planProgramsForLot,
  suggestPlanJurisdiction,
  type PreapprovedPlan,
  type PreapprovedPlanReference,
  type PreapprovedProgram,
} from "@/lib/preapproved-plans";
import type { ADUConfig } from "@/lib/feasibility";
import type { PlacementFitStatus } from "@/lib/placement-validation";
import { Button } from "@/components/ui/Button";
import { Checkbox, FieldLabel, Select } from "@/components/ui/Field";
import { StatusChip } from "@/components/ui/StatusChip";

/** How a chosen plan connects to the Studio's 3D model. */
export interface PlanModelLink {
  /** The model's current size. */
  config: Pick<ADUConfig, "width" | "length" | "footprint">;
  /** Placement verdict for the current model, in the scene's own wording. */
  fit: PlacementFitStatus;
  /** For a plan that isn't rectangular: the verdict for its full outer rectangle at the same placement. */
  outlineFit?: PlacementFitStatus;
  /** Give the model the selected plan's footprint (or, without one, its floor area). */
  onSizeToPlan: () => void;
  /** What happened to the model's placement when the plan was used: moved to fit, or no fit found. */
  placementNote?: { tone: "info" | "review"; text: string };
  /** Search the lot for a spot where the plan fits; present while the current spot doesn't. */
  onSnapToFit?: () => void;
  /** Present while the model's size came from a plan and the earlier size can be restored. */
  onUndoSize?: () => void;
  /** Bring the 3D model into view. */
  onViewModel?: () => void;
}

interface Props {
  parcel: { city: string; state?: string };
  selected: PreapprovedPlanReference | null;
  /** Use a plan. In the Studio this also gives the model the plan's footprint. */
  onSelect: (reference: PreapprovedPlanReference) => void;
  onRemove: () => void;
  model?: PlanModelLink;
  /** `inline` sits inside an already padded column (mobile Shape). */
  layout?: "panel" | "inline";
}

const linkClass = "inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lot-orange-ink";
const sqft = (value: number) => `${value.toLocaleString()} sq ft`;
const feet = (value: number) => `${Number(value.toFixed(2))}`;
const authorityLabel = (program: PreapprovedProgram) => `${program.city}, ${program.state}`;

function PlanLinks({ plan }: { plan: PreapprovedPlan }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      <a href={plan.sourceUrl} className={linkClass} target="_blank" rel="noopener noreferrer">Official listing<span className="sr-only"> (opens in a new tab)</span></a>
      {plan.documentUrl && <a href={plan.documentUrl} className={linkClass} target="_blank" rel="noopener noreferrer">{plan.documentLabel ?? "Plan documents"}<span className="sr-only"> (opens in a new tab)</span></a>}
    </div>
  );
}

export function PreapprovedPlanSummary({ selected, onRemove, model, layout = "panel", headingRef }: Pick<Props, "selected" | "onRemove" | "model" | "layout"> & {
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  if (!selected) return null;
  const plan = findPreapprovedPlan(selected);
  const program = preapprovedPrograms.find(item => item.id === selected.jurisdictionId);
  const available = plan?.status === "active" && program?.status === "verified";
  const footprint = available ? plan.footprint : undefined;
  const rectangle = footprint?.shape === "rectangle";
  const sizable = available && (footprint !== undefined || plan.sqft !== undefined);
  const sized = sizable && model !== undefined && modelMatchesPlan(plan, model.config);
  const areaTarget = available && plan.sqft !== undefined ? sqft(plan.sqft) : "";
  const modelSize = model ? `${feet(model.config.width)} × ${feet(model.config.length)} ft, ${sqft(Math.round(model.config.footprint))}` : "";
  return (
    <section aria-label="Selected plan reference" className={`space-y-3 border-b border-lot-line bg-lot-surface py-4 ${layout === "inline" ? "px-4" : "px-6"}`}>
      <StatusChip status={available ? "clear" : "review"} label={available ? "Plan in use" : "Plan unavailable"} />
      <div>
        <h3 ref={headingRef} tabIndex={-1} className="font-semibold text-lot-ink focus:outline-none">{plan?.name ?? selected.planId}</h3>
        <p className="text-sm text-lot-stone">{[plan ? planFacts(plan) : "", program ? authorityLabel(program) : selected.jurisdictionId].filter(Boolean).join(" · ")}</p>
      </div>
      {sizable && model && (sized ? (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-lot-ink">
            {rectangle && footprint
              ? <>3D model uses this plan&apos;s footprint: <span className="tabular-nums">{planFootprintLabel(footprint)} ({sqft(Math.round(model.config.footprint))})</span>.</>
              : footprint
                ? <>3D model uses a usable <span className="tabular-nums">{planFootprintLabel(model.config)}</span> rectangle with this plan&apos;s depth and floor area (<span className="tabular-nums">{sqft(Math.round(model.config.footprint))}</span>).</>
                : <>3D model sized to this plan&apos;s floor area: <span className="tabular-nums">{modelSize}</span>.</>}
          </p>
          <StatusChip status={model.fit.tone} label={model.fit.title} />
          {model.placementNote && <p role="status" className={`text-sm leading-relaxed ${model.placementNote.tone === "review" ? "font-semibold text-status-review" : "text-lot-ink"}`}>{model.placementNote.text}</p>}
          {footprint && !rectangle && model.outlineFit && <div className="space-y-1">
            <p className="text-sm leading-relaxed text-lot-ink">Full outer outline, <span className="tabular-nums">{planFootprintLabel(footprint)}</span>:</p>
            <StatusChip status={model.outlineFit.tone} label={model.outlineFit.title} />
          </div>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-lot-ink">
            Your 3D model is <span className="tabular-nums">{modelSize}</span>; this plan is <span className="tabular-nums">{rectangle && footprint ? planFootprintLabel(footprint) : areaTarget}</span>.
          </p>
          <Button variant="secondary" size="sm" onClick={model.onSizeToPlan}>{rectangle ? "Use the plan's footprint" : `Size 3D model to ${areaTarget}`}</Button>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-lot-stone">{!available
        ? "This saved reference is no longer in our verified catalog. Check with the permitting authority or choose another plan."
        : footprint && !rectangle
          ? "This plan isn't rectangular, and the Studio models rectangles. The model keeps the plan's depth and floor area, so size limits and estimates stay right, and the full outer outline is checked at the same spot: if the outline fits, the plan fits. Lot-specific review and permits still apply."
          : footprint
            ? "Dimensions are to the outside of the walls, from the official floor plan, so the area can exceed the listed living area. Lot-specific review and permits still apply."
            : "This listing publishes floor area but not dimensions, so the model matches the area, not the plan's shape. Check the official sheets. Lot-specific review and permits still apply."}</p>
      {available && <PlanLinks plan={plan} />}
      <div className="flex flex-wrap gap-2">
        {sized && model?.onSnapToFit && <Button variant="secondary" size="sm" onClick={model.onSnapToFit}>Snap to fit</Button>}
        {sized && model?.onViewModel && <Button variant="secondary" size="sm" onClick={model.onViewModel}>View on your lot</Button>}
        {model?.onUndoSize && <Button variant="ghost" size="sm" onClick={model.onUndoSize}>Undo plan change</Button>}
        <Button variant="ghost" size="sm" onClick={onRemove}>Remove plan</Button>
      </div>
    </section>
  );
}

/** Free catalog. Confirming the authority unlocks its plans; it never establishes lot eligibility. */
export default function PreapprovedPlansPanel({ parcel, selected, onSelect, onRemove, model, layout = "panel" }: Props) {
  const id = useId();
  const suggested = suggestPlanJurisdiction(parcel)?.id ?? "";
  const restoredAuthority = preapprovedPrograms.find(program => program.id === selected?.jurisdictionId);
  const restoredConfirmation = Boolean(selected && restoredAuthority?.status === "verified" && findPreapprovedPlan(selected)?.status === "active");
  const [authorityId, setAuthorityId] = useState(restoredAuthority?.id ?? suggested);
  const [confirmed, setConfirmed] = useState(restoredConfirmation);
  const [previousAuthority, setPreviousAuthority] = useState(selected?.jurisdictionId);
  // Loading another study on the same lot may replace the reference without
  // remounting this browser. Restore its prior confirmation, not a postal guess.
  if (previousAuthority !== selected?.jurisdictionId) {
    setPreviousAuthority(selected?.jurisdictionId);
    if (restoredAuthority) {
      setAuthorityId(restoredAuthority.id);
      setConfirmed(restoredConfirmation);
    }
  }
  // Removals stay visible because the summary they explain disappears; a use is
  // announced only, since focus moves to the summary that reports it.
  const [notice, setNotice] = useState({ text: "", visible: false });
  const programs = planProgramsForLot(parcel, selected?.jurisdictionId);
  const program = preapprovedPrograms.find(item => item.id === authorityId);
  const plans = program ? preapprovedPlans.filter(plan => plan.jurisdictionId === program.id && plan.status === "active") : [];
  const canUse = confirmed && program?.status === "verified";
  const pad = layout === "inline" ? "px-4" : "px-6";
  const programLabel = program?.status === "verified" ? "Official program verified"
    : program?.status === "unavailable" ? "Program unavailable" : "Availability needs verification";

  return (
    <section aria-label="Pre-approved plan browser" className={`min-w-0 space-y-5 pb-6 pt-1 ${pad}`}>
      <p className="text-sm leading-relaxed text-lot-stone">Start from a plan your permitting authority has already reviewed. Using one gives your 3D model the plan&apos;s footprint from its official drawings, so you can check how it fits this lot.</p>
      <div className="space-y-2">
        <FieldLabel htmlFor={`${id}-authority`}>Permitting authority for this lot</FieldLabel>
        <Select id={`${id}-authority`} value={authorityId} onChange={event => {
          const next = event.target.value;
          setAuthorityId(next);
          setConfirmed(false);
          if (selected && selected.jurisdictionId !== next) {
            onRemove();
            setNotice({ text: "Plan removed: it belongs to a different permitting authority.", visible: true });
          } else setNotice({ text: "", visible: false });
        }}>
          <option value="">Choose your permitting authority</option>
          {programs.map(item => <option key={item.id} value={item.id}>{authorityLabel(item)}</option>)}
        </Select>
        <p className="text-xs leading-relaxed text-lot-stone">Suggested from the postal city. Unincorporated areas are permitted by the county, and county plans don&apos;t automatically apply inside a city.</p>
        {program && <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-lot-ink">
          <Checkbox checked={confirmed} onChange={event => {
            setConfirmed(event.target.checked);
            if (!event.target.checked && selected) {
              onRemove();
              setNotice({ text: "Plan removed until the permitting authority is confirmed.", visible: true });
            }
          }} />
          <span>I confirm {authorityLabel(program)} is the permitting authority for this lot.</span>
        </label>}
      </div>
      <p role="status" aria-live="polite" className={notice.visible ? "text-sm text-lot-ink" : "sr-only"}>{notice.text}</p>
      {program ? (
        <div className="space-y-2">
          <StatusChip status={program.status === "verified" ? "clear" : "review"} label={programLabel} />
          <p className="text-sm leading-relaxed text-lot-stone">{program.notes}</p>
          <p className="text-xs text-lot-stone">{program.verifiedAt ? `Official listing checked ${program.verifiedAt}` : `Verification attempted ${program.reviewedAt}`}</p>
          <a href={program.catalogUrl ?? program.sourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {program.catalogUrl ? "Full official catalog" : "Visit permitting authority"}<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-lot-stone">Don&apos;t see yours? Ask your city or county building department whether it offers pre-approved ADU plans.</p>
      )}
      {program && plans.length === 0 && <p className="text-sm leading-relaxed text-lot-stone">{program.status === "unavailable"
        ? "The authority reports this program is unavailable."
        : "No individual plans are listed here yet. Check the official source for current options."}</p>}
      {plans.length > 0 && !canUse && <p id={`${id}-hint`} className="text-sm font-semibold text-lot-ink">Confirm the permitting authority above to use a plan.</p>}
      {plans.length > 0 && <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {plans.map(plan => {
          const isSelected = selected?.planId === plan.id && selected.jurisdictionId === plan.jurisdictionId;
          return (
            <article key={plan.id} aria-label={plan.name} className="min-w-0 space-y-3 border border-lot-line bg-lot-chalk p-4">
              <div>
                <h3 className="font-semibold text-lot-ink">{plan.name}</h3>
                <p className="text-xs text-lot-stone">{plan.provider}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-lot-ink">{planFacts(plan)}</p>
              {plan.footprint && <p className="text-xs text-lot-stone">{plan.footprint.shape === "irregular" ? "Not rectangular; outer " : ""}{planFootprintLabel(plan.footprint)} outside walls</p>}
              <p className="text-sm leading-relaxed text-lot-stone">{plan.restrictions}</p>
              {plan.feeNote && <p className="text-sm leading-relaxed text-lot-stone">{plan.feeNote}</p>}
              <PlanLinks plan={plan} />
              <Button fullWidth variant="secondary" disabled={!canUse || isSelected} aria-describedby={canUse ? undefined : `${id}-hint`} onClick={() => {
                onSelect({ planId: plan.id, jurisdictionId: plan.jurisdictionId });
                setNotice({ text: model && (plan.footprint || plan.sqft !== undefined) ? `${plan.name} is in use. 3D model updated to match it.` : `${plan.name} is in use.`, visible: false });
              }}>{isSelected ? "In use" : selected ? "Use this plan instead" : "Use this plan"}</Button>
              <p className="text-xs text-lot-stone">Listing checked {plan.verifiedAt}</p>
            </article>
          );
        })}
      </div>}
    </section>
  );
}

/**
 * Studio placement: the plan in use stays visible while the catalog is
 * collapsed. Key by lot so a new lot starts from its own postal suggestion.
 */
export function PreapprovedPlansSection(props: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusSummary = useRef(false);
  // After "Use this plan", move to the summary that reports the new size and fit.
  useEffect(() => {
    if (!focusSummary.current || !headingRef.current) return;
    focusSummary.current = false;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView?.({ block: "nearest", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  const shown = props.selected?.jurisdictionId ?? suggestPlanJurisdiction(props.parcel)?.id;
  const count = shown ? preapprovedPlans.filter(plan => plan.jurisdictionId === shown && plan.status === "active").length : 0;
  const shownProgram = preapprovedPrograms.find(program => program.id === shown);
  const hint = count > 0 && shownProgram ? `${count} plan${count === 1 ? "" : "s"} for ${authorityLabel(shownProgram)}` : "Check your city";
  const inline = props.layout === "inline";
  return (
    <div className={`bg-lot-chalk ${inline ? "border border-lot-line" : "border-t border-lot-line"}`}>
      <PreapprovedPlanSummary selected={props.selected} onRemove={props.onRemove} model={props.model} layout={props.layout} headingRef={headingRef} />
      <details className="group">
        <summary className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink ${inline ? "px-4" : "px-6"}`}>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span>Pre-approved plans</span>
            <span className="text-xs font-normal text-lot-stone">{hint}</span>
          </span>
          <span aria-hidden="true" className="group-open:rotate-45">+</span>
        </summary>
        <PreapprovedPlansPanel {...props} onSelect={reference => { focusSummary.current = true; props.onSelect(reference); }} />
      </details>
    </div>
  );
}
