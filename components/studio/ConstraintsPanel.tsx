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
import { Segmented } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
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
  // Address entry lives here too. Previously the only search was inside the
  // Massing tab's inspector, so a user on the default Feasibility view had no
  // way to make the studio about their own lot. Self-wire to parcel context
  // exactly as FeasibilityInspector does.
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
      className="flex w-full shrink-0 flex-col border-t border-lf-hairline bg-lf-card lg:h-full lg:min-h-0 lg:w-[384px] lg:border-l lg:border-t-0"
    >
      <div className="border-b border-lf-hairline px-[22px] pb-3.5 pt-[18px]">
        <p className="pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-clay-ink">
          Your property
        </p>
        <AddressSearch onSelect={handleAddressSelect} onSubmitText={handleAddressText} autoFocusSignal={addressFocusSignal} />
        {parcelLoading && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-lf-hairline bg-lf-sand-2 px-3 py-2 text-xs text-lf-muted">
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-lf-hairline border-t-lf-clay" />
            Looking up property data…
          </div>
        )}
        {parcelError && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick-soft p-3 text-xs text-lf-brick"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {parcelError}
          </div>
        )}
      </div>

      <div className="border-b border-lf-hairline px-[22px] pb-3.5 pt-[18px]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-clay-ink">
          Property constraints
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold leading-[1.15] text-lf-espresso">
          What this lot allows
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-[18px]">
        {GROUP_ORDER.map((group) => {
          const rows = summary.constraints.filter((c) => c.group === group);
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              <p className="pb-0.5 pt-[18px] font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-muted">
                {group}
                {group === "Economics" ? (
                  <span className="font-medium text-lf-taupe"> · if built</span>
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
        <div className="mt-[18px] border-t border-lf-hairline pt-[18px]">
          <div className="flex items-center justify-between pb-2">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-muted">
              Rent estimate
            </p>
            <MoneyFigure value={result.monthlyRent} size="sm" tone="forest" />
          </div>
          <Segmented
            aria-label="Rent estimate basis"
            value={assumptions.rentScenario}
            onChange={(scenario) => onAssumptionsChange({ ...assumptions, rentScenario: scenario })}
            options={(Object.keys(RENT_SCENARIO_LABELS) as RentScenario[]).map((scenario) => ({
              value: scenario,
              label: RENT_SCENARIO_LABELS[scenario],
            }))}
          />
        </div>

        <div className="mt-[18px] border-t border-lf-hairline pt-[18px]">
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
        className="flex items-start gap-3 border-t border-lf-hairline bg-lf-sand-2 px-[22px] py-3.5"
        style={{ borderLeft: `3px solid ${tone.color}` }}
      >
        <p className="text-[13px] leading-[1.5] text-lf-espresso">
          <strong style={{ color: tone.color }}>{summary.verdict}.</strong>{" "}
          {summary.clearedCount} of {summary.constraints.filter((c) => c.status !== "info").length}{" "}
          checks clear, with {summary.openCount}{" "}to confirm before permitting.
          Utility capacity and easements aren&rsquo;t in this estimate.
        </p>
      </div>
      <div className="px-[22px] pb-4">
        <Button
          type="button"
          variant="commit"
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
  const iconColor = item.status === "info" ? "var(--color-lf-muted)" : tone.color;

  return (
    <div className="flex items-start gap-3 border-b border-lf-hairline py-3">
      <Icon size={16} className="mt-px shrink-0" style={{ color: iconColor }} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-lf-espresso">{item.label}</div>
        <div className="mt-0.5 text-xs text-lf-muted">{item.detail}</div>
      </div>
      <RowTrailing item={item} />
    </div>
  );
}

function RowTrailing({ item }: { item: ConstraintItem }) {
  // The income figure keeps the brand's serif-money treatment.
  if (item.id === "rent") {
    return (
      <span className="lf-money-sm text-lf-forest">
        {item.value?.replace("/mo", "")}
        <span className="font-mono text-[10px] text-lf-muted">/mo</span>
      </span>
    );
  }
  // Rows carrying a measured value show it as a recorded fact (mono),
  // tinted only when the value itself represents a blocker.
  if (item.value) {
    return (
      <span
        className="whitespace-nowrap font-mono text-xs"
        style={{
          color:
            item.status === "blocked"
              ? statusTone(item.status).color
              : "var(--color-lf-espresso)",
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
