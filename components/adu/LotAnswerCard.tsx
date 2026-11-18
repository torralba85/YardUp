"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { StatusChip, type StatusChipStatus } from "@/components/ui/StatusChip";
import { stashAddressQuery } from "@/lib/address-handoff";
import { stashEntrySource } from "@/lib/analytics/entry-source";
import {
  extractStateCode,
  getAduSqftBucket,
  getLotSizeBucket,
  mapFeasibilityVerdict,
  mapParcelSource,
  trackLotAnswerOpenStudio,
  trackLotAnswerViewed,
  type LotAnswerQuality,
  type LotAnswerSurface,
} from "@/lib/analytics/events";
import {
  calculateFeasibility,
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  type ADUConfig,
} from "@/lib/feasibility";
import { summarizeFeasibility, type FeasibilitySummary } from "@/lib/feasibility-verdict";
import { GeocodeError } from "@/lib/geocode-api";
import { canGuestLookup, consumeGuestLookup, resetGuestLookups } from "@/lib/guest-lookup";
import { acquireLiveParcel } from "@/lib/live-parcel-acquisition";
import { hasMemberSessionHint } from "@/lib/member-session-hint";
import { ParcelFetchError } from "@/lib/parcel-api";
import { parcelConfidence } from "@/lib/parcel-confidence";
import { stashInitialParcel } from "@/lib/parcel-handoff";
import type { LiveParcelData } from "@/lib/parcel-types";
import { describePlacement, getDefaultAduPose, getScenePlacement } from "@/lib/scene-placement";

const LandingAuthGate = dynamic(
  () => import("@/components/landing/LandingAuthGate"),
  { ssr: false },
);

export interface LotAnswerFormControls {
  submit: (rawQuery?: string) => Promise<void>;
  loading: boolean;
  validationError: string | null;
  clearValidationError: () => void;
}

export interface LotAnswerCardProps {
  /** Bounded surface identifier for consent-gated analytics. */
  surface: LotAnswerSurface;
  /** Surrounding container ground for the default form inputs. */
  tone?: "light" | "dark";
  /** Optional ADU footprint preset (sq ft) to test; defaults to 600 sq ft. */
  footprint?: number;
  /** Controlled address input value. */
  query?: string;
  /** Controlled address input change handler. */
  onQueryChange?: (next: string) => void;
  /** Input label when using the built-in form. */
  inputLabel?: string;
  /** Whether to visually hide the input label. */
  inputLabelSrOnly?: boolean;
  /** Optional deterministic id for the built-in address input. */
  inputId?: string;
  /** Placeholder for the built-in address input. */
  placeholder?: string;
  /** Submit button label for the built-in form. */
  submitLabel?: string;
  /** Helper text displayed below the built-in form when idle/no error. */
  helperText?: ReactNode;
  /** Optional extra callback fired right when a lookup actually starts. */
  onLookupStart?: () => void;
  /**
   * Optional override when the guest allowance is exhausted. Callers like
   * LotMoreLanding and BackyardHomeQuiz already manage LandingAuthGate; callers
   * that omit this use LotAnswerCard's built-in lazy LandingAuthGate.
   */
  onAuthGateRequired?: (trimmedAddress: string) => void;
  /**
   * Optional custom form renderer so existing surfaces (like the landing hero)
   * can preserve their exact CSS Module markup and optical layout.
   */
  renderForm?: (controls: LotAnswerFormControls) => ReactNode;
  /** Optional wrapper classes. */
  className?: string;
}

interface LotAnswerState {
  submittedQuery: string;
  parcel: LiveParcelData;
  config: ADUConfig;
  summary: FeasibilitySummary;
  isNonAddressOrPartial: boolean;
  isRangeInterpolated: boolean;
  isFallback: boolean;
  physicalEstimated: boolean;
  chipStatus: StatusChipStatus;
  chipLabel: string;
}

/**
 * Firebase-free inline lot feasibility island.
 *
 * Runs geocode -> parcel -> calculateFeasibility + scene-placement evidence
 * checks directly on public pages without loading Firebase. Guest allowance is
 * consumed only after a parcel resolves; failures and retries never spend a try.
 */
export function LotAnswerCard({
  surface,
  tone = "light",
  footprint,
  query,
  onQueryChange,
  inputLabel = "Your street address",
  inputLabelSrOnly = true,
  inputId,
  placeholder = "123 Main St, San Diego, CA",
  submitLabel = "Check my address",
  helperText,
  onLookupStart,
  onAuthGateRequired,
  renderForm,
  className,
}: LotAnswerCardProps) {
  const router = useRouter();
  const generatedId = useId();
  const resolvedInputId = inputId ?? `${generatedId}-address`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [internalQuery, setInternalQuery] = useState("");
  const currentQuery = query !== undefined ? query : internalQuery;

  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<LotAnswerState | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);

  const pendingAuthQueryRef = useRef("");
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const trimmedQuery = currentQuery.trim();
  const [prevTrimmedQuery, setPrevTrimmedQuery] = useState(trimmedQuery);

  // Clear stale results, errors, and loading state synchronously when the
  // address changes (including controlled updates from sibling forms).
  if (trimmedQuery !== prevTrimmedQuery) {
    setPrevTrimmedQuery(trimmedQuery);
    if (lookupError) setLookupError(null);
    if (validationError) setValidationError(null);
    if (answer && answer.submittedQuery !== trimmedQuery) {
      setAnswer(null);
    }
    if (loading) setLoading(false);
  }

  useEffect(() => {
    requestIdRef.current += 1;
    inFlightRef.current = false;
  }, [trimmedQuery]);

  function updateQuery(next: string) {
    if (onQueryChange) {
      onQueryChange(next);
    } else {
      setInternalQuery(next);
    }
  }

  async function runLookup(rawQuery?: string) {
    const trimmed = (rawQuery ?? currentQuery).trim();
    if (!trimmed) {
      setValidationError("Enter a street address to check your lot.");
      inputRef.current?.focus();
      return;
    }

    if (inFlightRef.current) return;

    if (!canGuestLookup()) {
      pendingAuthQueryRef.current = trimmed;
      if (onAuthGateRequired) {
        onAuthGateRequired(trimmed);
      } else {
        setAuthGateOpen(true);
      }
      return;
    }

    onLookupStart?.();

    const reqId = ++requestIdRef.current;
    inFlightRef.current = true;
    setLoading(true);
    setValidationError(null);
    setLookupError(null);
    setAnswer(null);

    try {
      const parcel = await acquireLiveParcel({ kind: "address", query: trimmed }, null);
      if (reqId !== requestIdRef.current) return;

      // Consume the anonymous lookup only once the parcel resolves.
      consumeGuestLookup();

      const config = footprint
        ? configForFootprint(footprint, defaultAduConfig)
        : defaultAduConfig;
      const pose = getDefaultAduPose(parcel, config);
      const placement = getScenePlacement(parcel, config, pose);
      const placementFeedback = describePlacement(placement, parcel);
      const result = calculateFeasibility(parcel, config, defaultFinancialAssumptions);
      const summary = summarizeFeasibility(parcel, result, config, placement);

      const geocodeMatch = parcel.dataQuality?.geocode?.match;
      const isNonAddressOrPartial = Boolean(
        geocodeMatch &&
          (geocodeMatch.partialMatch ||
            geocodeMatch.precision === "street" ||
            geocodeMatch.precision === "locality" ||
            geocodeMatch.precision === "unknown" ||
            !geocodeMatch.components.houseNumber),
      );
      const isRangeInterpolated = geocodeMatch?.precision === "range-interpolated";
      const confidence = parcelConfidence(parcel);
      const isFallback = parcel.source === "fallback";

      let chipStatus: StatusChipStatus;
      let chipLabel: string;
      if (summary.verdict === "Unlikely" || placementFeedback.tone === "blocked") {
        chipStatus = "blocked";
        chipLabel = "Unlikely";
      } else if (
        isNonAddressOrPartial ||
        isFallback ||
        confidence.regulationsEstimated ||
        placementFeedback.tone === "review" ||
        summary.verdict === "Needs Review"
      ) {
        chipStatus = "review";
        chipLabel = isNonAddressOrPartial ? "Approximate area" : "Needs Review";
      } else {
        chipStatus = "clear";
        chipLabel = "Likely Feasible";
      }

      const lotQuality: LotAnswerQuality = isNonAddressOrPartial
        ? "approximate_geocode"
        : isFallback || confidence.physicalEstimated
          ? "estimated_lot"
          : "parcel_record";

      trackLotAnswerViewed({
        surface,
        parcel_source: mapParcelSource(parcel.source),
        feasibility_status: mapFeasibilityVerdict(summary.verdict),
        lot_size_bucket: getLotSizeBucket(parcel.lotArea),
        adu_sqft_bucket: getAduSqftBucket(config.footprint),
        lot_quality: lotQuality,
        state_code: extractStateCode(parcel),
      });

      setAnswer({
        submittedQuery: trimmed,
        parcel,
        config,
        summary,
        isNonAddressOrPartial,
        isRangeInterpolated,
        isFallback,
        physicalEstimated: confidence.physicalEstimated,
        chipStatus,
        chipLabel,
      });
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      const message =
        err instanceof GeocodeError || err instanceof ParcelFetchError
          ? err.userMessage
          : "We could not check that address right now. Please try again.";
      setLookupError(message);
    } finally {
      if (reqId === requestIdRef.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }

  function handleBuiltInSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runLookup();
  }

  function handleOpenStudio() {
    if (!answer) return;
    // Clear any stale text handoff so Studio consumes the already-fetched
    // parcel without re-fetching or double-counting the guest allowance.
    stashAddressQuery("");
    stashInitialParcel(answer.parcel);
    stashEntrySource("landing_cta");
    trackLotAnswerOpenStudio({
      surface,
      parcel_source: mapParcelSource(answer.parcel.source),
      feasibility_status: mapFeasibilityVerdict(answer.summary.verdict),
      adu_sqft_bucket: getAduSqftBucket(answer.config.footprint),
    });
    const studioHref =
      footprint && footprint !== defaultAduConfig.footprint
        ? `/studio?size=${footprint}`
        : "/studio";
    router.push(studioHref);
  }

  const isDark = tone === "dark";
  const resolvedLabel = answer
    ? answer.isNonAddressOrPartial
      ? answer.parcel.dataQuality?.geocode?.formattedAddress || answer.submittedQuery
      : [answer.parcel.address, answer.parcel.city].filter(Boolean).join(", ")
    : "";

  const builtInForm = (
    <form onSubmit={handleBuiltInSubmit} className="space-y-2.5" noValidate>
      <label
        htmlFor={resolvedInputId}
        className={
          inputLabelSrOnly
            ? "sr-only"
            : `block lf-body-sm font-medium ${isDark ? "text-lot-chalk" : "text-lot-ink"}`
        }
      >
        {inputLabel}
      </label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          ref={inputRef}
          id={resolvedInputId}
          type="text"
          autoComplete="street-address"
          placeholder={placeholder}
          value={currentQuery}
          onChange={(event) => updateQuery(event.target.value)}
          aria-invalid={validationError ? "true" : undefined}
          aria-describedby={validationError ? `${resolvedInputId}-error` : undefined}
          className={
            isDark
              ? "flex-1 border-lot-stone-on-dark bg-lot-surface-dark text-lot-chalk placeholder:text-lot-stone-on-dark focus-visible:ring-lot-chalk"
              : "flex-1 bg-lot-chalk text-lot-ink"
          }
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          disabled={loading}
          className={
            isDark
              ? "shrink-0 focus-visible:ring-lot-chalk focus-visible:ring-offset-lot-ink"
              : "shrink-0"
          }
        >
          {loading ? "Checking…" : submitLabel}
        </Button>
      </div>
      {validationError ? (
        <p
          id={`${resolvedInputId}-error`}
          role="alert"
          className={
            isDark
              ? "text-xs font-semibold text-lot-chalk"
              : "text-xs font-semibold text-status-blocked"
          }
        >
          {validationError}
        </p>
      ) : helperText ? (
        <div>{helperText}</div>
      ) : null}
    </form>
  );

  return (
    <div className={className}>
      {renderForm
        // The renderer installs submit as an event handler; it never invokes it during render.
        // eslint-disable-next-line react-hooks/refs
        ? renderForm({
            submit: runLookup,
            loading,
            validationError,
            clearValidationError: () => setValidationError(null),
          })
        : builtInForm}

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex items-center gap-2 rounded-none border border-lot-line bg-lot-chalk px-4 py-3 text-sm text-lot-ink"
        >
          <RefreshCw
            size={16}
            className="shrink-0 text-lot-orange-ink motion-safe:animate-spin"
            aria-hidden="true"
          />
          <span>Checking parcel records and modeled ADU fit…</span>
        </div>
      ) : null}

      {lookupError ? (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-none border border-status-blocked/30 bg-lot-chalk p-4 text-sm text-status-blocked"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{lookupError}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => void runLookup()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {answer ? (
        <section
          aria-label="Inline lot feasibility answer"
          aria-live="polite"
          className="mt-4 space-y-4 rounded-none border border-lot-line bg-lot-chalk p-4 text-lot-ink shadow-paper-sm sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="lf-kicker-dense text-lot-stone">
                {answer.isNonAddressOrPartial
                  ? "Approximate location · Not an exact property"
                  : answer.isFallback
                    ? "Estimated lot dimensions"
                    : "Inline lot feasibility"}
              </p>
              <h3 className="font-display text-lg font-medium leading-snug tracking-tight text-lot-ink break-words">
                {answer.isNonAddressOrPartial
                  ? `Approximate match near ${resolvedLabel}`
                  : resolvedLabel}
              </h3>
            </div>
            <StatusChip
              status={answer.chipStatus}
              label={answer.chipLabel}
              size="sm"
              className="shrink-0"
            />
          </div>

          {answer.isNonAddressOrPartial ? (
            <p className="border-l-2 border-status-review bg-status-review-soft px-3 py-2 text-xs leading-5 text-status-review">
              Partial or non-address location match — this result is not confirmed for an exact street property. Enter a full street number and address to check a specific lot.
            </p>
          ) : null}

          {answer.isFallback || answer.physicalEstimated ? (
            <p className="border border-status-review/35 bg-status-review-soft px-3 py-2 text-xs leading-5 text-status-review">
              Exact parcel data unavailable — the Studio uses estimated dimensions and modeled setbacks. Confirm county records in 3D.
            </p>
          ) : answer.isRangeInterpolated ? (
            <p className="border border-status-review/35 bg-status-review-soft px-3 py-2 text-xs leading-5 text-status-review">
              Block-interpolated address point — confirm exact property boundaries in 3D.
            </p>
          ) : null}

          {/* A teaser only: lot facts, rent, cost and payback wait for the Studio and the certificate. */}
          <div className="flex flex-col gap-3 border-t border-lot-line pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1 text-xs leading-5 text-lot-stone">
              <p className="text-sm leading-6 text-lot-ink">
                See how a backyard home fits this lot in the 3D Studio.
              </p>
              <p>
                Early planning estimates only — not a permit, appraisal, or contractor quote.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              rightIcon={<ArrowRight size={16} aria-hidden="true" />}
              onClick={handleOpenStudio}
              className="w-full shrink-0 sm:w-auto"
            >
              Open in 3D
            </Button>
          </div>
        </section>
      ) : null}

      {authGateOpen ? (
        <LandingAuthGate
          initialMode={hasMemberSessionHint() ? "sign-in" : "sign-up"}
          analyticsSource={hasMemberSessionHint() ? "account_control" : "guest_limit"}
          onAuthenticated={() => {
            resetGuestLookups();
            stashAddressQuery(pendingAuthQueryRef.current);
            stashEntrySource("landing_cta");
            setAuthGateOpen(false);
            router.push("/studio");
          }}
          onDismiss={() => setAuthGateOpen(false)}
        />
      ) : null}
    </div>
  );
}
