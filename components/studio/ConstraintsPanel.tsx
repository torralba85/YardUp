"use client";

/**
 * ConstraintsPanel — the right rail of the redesigned "Feasibility" tab.
 *
 * Replaces the massing-controls-first rail with a constraints checklist: what
 * the lot actually allows, grouped Zoning & setbacks / Site & utilities /
 * Economics, each line a real engine-derived finding with a Clear / Review
 * status. Massing controls move to their own tab (the existing
 * FeasibilityInspector). Ends with a verdict-reason strip + a jump to the
 * certificate.
 *
 * Mirrors the production rail conventions: 384px, lf-card surface, hairline
 * dividers, mono eyebrows, and softened rectangular controls.
 */

import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  Stamp,
  XCircle,
} from "lucide-react";
import { type ADUConfig, type FeasibilityResult, type FinancialAssumptions, type Parcel, type RentScenario } from "@/lib/feasibility";
import { MoneyFigure } from "@/components/ui/MoneyFigure";
import { FieldLabel, Segmented } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PanelHeader } from "@/components/ui/Panel";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  summarizeFeasibility,
  statusTone,
  verdictTone,
  type ConstraintGroup,
  type ConstraintItem,
  type ConstraintStatus,
} from "@/lib/feasibility-verdict";
import type { AIProjectBriefResponse } from "@/lib/ai-types";
import AIProjectBriefPanel from "./AIProjectBriefPanel";
import AddressSearch, { type AddressSearchResult } from "./AddressSearch";
import { useParcel } from "@/lib/parcel-context";
import { COLOR } from "@/lib/design-tokens";


const STATUS_ICON: Record<ConstraintStatus, typeof CheckCircle2> = {
  clear: CheckCircle2,
  review: AlertTriangle,
  blocked: XCircle,
  info: BadgeDollarSign,
};

const GROUP_ORDER: ConstraintGroup[] = [
  "Zoning & setbacks",
  "Site & utilities",
  "Economics",
];

const RENT_SCENARIO_LABELS: Record<RentScenario, string> = {
  conservative: "Conservative",
  market: "Market",
  optimistic: "Optimistic",
};

export interface ConstraintsPanelProps {
  parcel: Parcel & { zoning?: string; source?: string };
  result: FeasibilityResult;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  onAssumptionsChange: (assumptions: FinancialAssumptions) => void;
  onViewCertificate: () => void;
  projectBriefResponse: AIProjectBriefResponse | null;
  projectBriefLoading: boolean;
  projectBriefError: string | null;
  onGenerateProjectBrief: (idToken: string) => Promise<AIProjectBriefResponse>;
  /** Bumped by an outside "Change address" action to focus the search field. */
  addressFocusSignal?: number;
}

export default function ConstraintsPanel({
  parcel,
  result,
  config,
  assumptions,
  onAssumptionsChange,
  onViewCertificate,
  projectBriefResponse,
  projectBriefLoading,
  projectBriefError,
  onGenerateProjectBrief,
  addressFocusSignal,
}: ConstraintsPanelProps) {
  const summary = summarizeFeasibility(parcel, result, config);
  const tone = verdictTone(summary.verdict);
  const { parcelLoading, parcelError, searchParcel, searchByAddress } = useParcel();

  function handleAddressSelect(found: AddressSearchResult) {
    searchParcel(found.lat, found.lng, found.formattedAddress);
  }

  function handleAddressText(query: string) {
    searchByAddress(query);
  }

  return (
    <aside
      aria-label="Property constraints"
      className="flex w-full shrink-0 flex-col border-t border-lot-line bg-lot-chalk text-lot-ink lg:h-full lg:min-h-0 lg:w-[384px] lg:border-l lg:border-t-0"
    >
      <div className="border-b border-lot-line px-6 pb-4 pt-5">
        <p className="pb-2 lf-kicker text-lot-stone">
          Your property
        </p>
        <AddressSearch onSelect={handleAddressSelect} onSubmitText={handleAddressText} autoFocusSignal={addressFocusSignal} />
        {parcelLoading && (
          <div role="status" aria-live="polite" className="mt-2 flex items-center gap-2 rounded-none border border-lot-line bg-lot-surface px-3 py-2 text-xs text-lot-stone">
            <span className="block h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange" />
            Looking up property data…
          </div>
        )}
        {parcelError && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-none border border-status-blocked/30 bg-status-blocked/10 p-3 text-xs text-status-blocked"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {parcelError}
          </div>
        )}
      </div>

      <PanelHeader eyebrow="Property constraints" title="What this lot allows" />

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
        {GROUP_ORDER.map((group) => {
          const rows = summary.constraints.filter((c) => c.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              <p className="pb-0.5 pt-[18px] font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-lot-stone">
                {group}
                {group === "Economics" ? (
                  <span className="font-medium text-lot-stone"> · if built</span>
                ) : null}
              </p>
              {rows.map((row) => (
                <ConstraintRow key={row.id} item={row} />
              ))}
            </div>
          );
        })}

        {/* Rent scenario — drives the headline $/mo. Lives on the Feasibility
            tab so the income figure is adjustable without opening Massing. */}
        <div className="mt-[18px] border-t border-lot-line pt-[18px]">
          <FieldLabel
            className="pb-2"
            value={<MoneyFigure value={result.monthlyRent} size="sm" tone="onLight" className="text-lot-ink" />}
          >
            Rent estimate
          </FieldLabel>
          <Segmented
            aria-label="Rent estimate basis"
            value={assumptions.rentScenario}
            onChange={(scenario) => onAssumptionsChange({ ...assumptions, rentScenario: scenario })}
            options={(Object.keys(RENT_SCENARIO_LABELS) as RentScenario[]).map((scenario) => ({
              value: scenario,
              label: RENT_SCENARIO_LABELS[scenario],
            }))}
          />
          <p className="mt-2 text-xs text-lot-stone">{result.rentBasis} — Estimates, not guarantees.</p>
        </div>

        <div className="mt-[18px] border-t border-lot-line pt-[18px]">
          <AIProjectBriefPanel
            response={projectBriefResponse}
            loading={projectBriefLoading}
            error={projectBriefError}
            onGenerate={onGenerateProjectBrief}
            onViewCertificate={onViewCertificate}
          />
        </div>
      </div>

      {/* Verdict-reason strip */}
      <div
        className="flex items-start gap-3 border-t border-lot-line bg-lot-surface px-6 py-3.5"
        style={{ borderLeft: `3px solid ${tone.color}` }}
      >
        <p className="text-[13px] leading-[1.5] text-lot-ink">
          <strong style={{ color: tone.color }}>{summary.verdict}.</strong>{" "}
          {summary.clearedCount} of {summary.constraints.filter((c) => c.status !== "info").length}{" "}
          checks clear, with {summary.openCount}{" "}to confirm before permitting.
          Utility capacity and easements aren&rsquo;t in this estimate.
        </p>
      </div>
      <div className="px-6 pb-4 pt-3">
        <Button
          type="button"
          variant="primary"
          size="md"
          fullWidth
          onClick={onViewCertificate}
          leftIcon={<Stamp size={15} />}
        >
          View certificate
        </Button>
      </div>
    </aside>
  );
}

function ConstraintRow({ item }: { item: ConstraintItem }) {
  const tone = statusTone(item.status);
  const Icon = STATUS_ICON[item.status];
  const iconColor = item.status === "info" ? COLOR["lot-stone"] : tone.color;

  return (
    <div className="flex items-start gap-3 border-b border-lot-line py-3">
      <Icon size={16} className="mt-px shrink-0" style={{ color: iconColor }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-lot-ink">{item.label}</div>
        <div className="mt-0.5 text-xs text-lot-stone">{item.detail}</div>
      </div>
      <RowTrailing item={item} />
    </div>
  );
}

function RowTrailing({ item }: { item: ConstraintItem }) {
  // Income figures set plain and large in carbon tabular numerals (§2.6)
  if (item.id === "rent") {
    return (
      <span className="lf-money-sm tabular-nums text-lot-ink">
        {item.value?.replace("/mo", "")}
        <span className="ml-0.5 font-sans text-[10px] tabular-nums text-lot-stone">/mo</span>
      </span>
    );
  }
  // Rows carrying a measured value show it as a recorded fact (tabular numerals),
  // tinted only when the value itself represents a blocker.
  if (item.value) {
    return (
      <span
        className="whitespace-nowrap font-sans text-xs tabular-nums"
        style={{
          color:
            item.status === "blocked"
              ? statusTone(item.status).color
              : COLOR["lot-ink"],
        }}
      >
        {item.value}
      </span>
    );
  }
  // Otherwise a status chip (Clear / Review / Blocked).
  const chipLabel =
    item.status === "clear" ? "Clear" : item.status === "blocked" ? "Blocked" : "Review";
  return <StatusChip status={item.status} label={chipLabel} size="sm" />;
}
