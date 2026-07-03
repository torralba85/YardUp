"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useParcel } from "@/lib/parcel-context";
import { buildEstimatedParcel, type EstimatedParcel } from "@/lib/estimated-parcel";
import {
  calculateFeasibility,
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  formatCompactCurrency,
  parcelPresets,
  type ADUConfig,
} from "@/lib/feasibility";
import { nextStep, type WizardStep } from "@/lib/wizard-state";
import AddressSearch, { type AddressSearchResult } from "@/components/studio/AddressSearch";
import { AuthModal } from "@/components/auth/AuthModal";

/** Props for {@link WizardFlow}. */
export interface WizardFlowProps {
  /** Wizard finished (unlock, skip, or demo). Parent hides the wizard and
   * applies the config when one was chosen. */
  onComplete: (config?: ADUConfig) => void;
}

const SIZE_OPTIONS = [
  { footprint: 400, title: "Studio", blurb: "400 ft² · sleeps 1–2" },
  { footprint: 600, title: "1 Bedroom", blurb: "600 ft² · most popular" },
  { footprint: 800, title: "2 Bedroom", blurb: "800 ft² · max rent" },
] as const;

/**
 * First-run mobile onboarding wizard: collects an address (geocoded into an
 * estimated parcel for anonymous users), lets the user pick an ADU size, and
 * shows a quick feasibility teaser before completing into the studio. Bridges
 * anonymous estimates to live parcels on sign-in via {@link useParcel}.
 *
 * @param props - The {@link WizardFlowProps}.
 */
export default function WizardFlow({ onComplete }: WizardFlowProps) {
  const { user } = useAuth();
  const { resetToPreset, setEstimatedParcel, searchParcel } = useParcel();
  const [step, setStep] = useState<WizardStep>("address");
  const [address, setAddress] = useState<AddressSearchResult | null>(null);
  const [footprint, setFootprint] = useState<number>(600);
  const [authOpen, setAuthOpen] = useState(false);
  const [freeTextHint, setFreeTextHint] = useState(false);
  const completedRef = useRef(false);

  const estimated: EstimatedParcel | null = useMemo(
    () => (address ? buildEstimatedParcel(address) : null),
    [address],
  );
  const teaserConfig = useMemo(() => configForFootprint(footprint, defaultAduConfig), [footprint]);
  const teaser = useMemo(
    () => (estimated ? calculateFeasibility(estimated, teaserConfig, defaultFinancialAssumptions) : null),
    [estimated, teaserConfig],
  );

  function complete(config?: ADUConfig) {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(config);
  }

  // Auth unlock: when the user signs in on the results step, apply the
  // estimated parcel immediately, then upgrade to live Regrid data.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user || step !== "results" || !estimated) return;
    setAuthOpen(false);
    setEstimatedParcel(estimated);
    void searchParcel(estimated.lat, estimated.lng, estimated.address);
    complete(teaserConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSkip() {
    if (step === "results" && estimated) {
      setEstimatedParcel(estimated);
      complete(teaserConfig);
      return;
    }
    resetToPreset(parcelPresets[0]);
    complete();
  }

  function handleDemoPreset(presetId: string) {
    const preset = parcelPresets.find((p) => p.id === presetId) ?? parcelPresets[0];
    resetToPreset(preset);
    complete();
  }

  const roundedRent = teaser ? `~$${(Math.round(teaser.monthlyRent / 100) * 100).toLocaleString()}` : "";

  return (
    <div className="fixed inset-0 z-(--z-index-modal) flex flex-col bg-lf-sand" role="dialog" aria-label="Get started">
      <div className="flex items-center justify-center gap-1.5 pt-5" aria-hidden>
        {(["address", "size", "results"] as WizardStep[]).map((s) => (
          <span key={s} className={`h-1.5 w-1.5 rounded-full ${s === step ? "bg-lf-clay" : "bg-lf-taupe/40"}`} />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6">
        {step === "address" && (
          <section>
            <h1 className="font-display text-3xl font-bold leading-tight text-lf-espresso">
              Could your backyard pay you rent?
            </h1>
            <p className="mt-2 text-sm text-lf-muted">
              Enter your address for an instant ADU feasibility check.
            </p>
            <div className="mt-5">
              <AddressSearch
                onSelect={(result) => {
                  setAddress(result);
                  setStep(nextStep("address"));
                }}
                onSubmitText={() => setFreeTextHint(true)}
                placeholder="Start typing your address…"
              />
              {freeTextHint && (
                <p className="mt-2 text-xs text-lf-clay" role="note">
                  Pick a suggestion from the list, or explore a demo lot below.
                </p>
              )}
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">
              or explore a demo lot
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {parcelPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleDemoPreset(preset.id)}
                  className="min-h-11 rounded-full border border-lf-hairline bg-lf-card px-4 text-sm text-lf-espresso transition hover:border-lf-clay"
                >
                  {preset.city.split(",")[0]}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "size" && (
          <section>
            <h1 className="font-display text-3xl font-bold text-lf-espresso">What size ADU?</h1>
            <p className="mt-1 text-sm text-lf-muted">
              {address?.formattedAddress}
              <span className="ml-2 rounded bg-lf-amber/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">
                lot: estimated
              </span>
            </p>
            <div className="mt-5 flex flex-col gap-3" role="radiogroup" aria-label="ADU size">
              {SIZE_OPTIONS.map((option) => (
                <button
                  key={option.footprint}
                  type="button"
                  role="radio"
                  aria-checked={footprint === option.footprint}
                  onClick={() => setFootprint(option.footprint)}
                  className={`min-h-16 rounded-xl border-2 bg-lf-card px-4 py-3 text-left transition ${
                    footprint === option.footprint ? "border-lf-clay bg-lf-clay/5" : "border-lf-hairline"
                  }`}
                >
                  <span className="block font-semibold text-lf-espresso">{option.title}</span>
                  <span className="text-sm text-lf-muted">{option.blurb}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(nextStep("size"))}
              className="mt-6 min-h-12 w-full rounded-xl bg-lf-clay font-semibold text-white transition hover:bg-lf-mahogany"
            >
              See my results →
            </button>
          </section>
        )}

        {step === "results" && teaser && (
          <section>
            <h1 className="font-display text-2xl font-bold text-lf-espresso">Your lot looks promising</h1>
            <p className="mt-1 text-sm text-lf-muted">
              {address?.formattedAddress} · {footprint} ft²
              <span className="ml-2 rounded bg-lf-amber/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]">
                estimated
              </span>
            </p>
            <div className="mt-5 rounded-2xl border border-lf-hairline bg-lf-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">Rent potential</p>
              <p className="lf-money-xl text-lf-espresso">
                {roundedRent}
                <span className="text-base font-medium text-lf-muted">/mo</span>
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <BlurredFact label="Build cost" value={`${formatCompactCurrency(teaser.costLow)}-${formatCompactCurrency(teaser.costHigh)}`} />
                <BlurredFact label="Payback" value={`${teaser.paybackYears} yrs`} />
                <BlurredFact label="Zoning" value={teaser.zoningStatus} />
              </div>
            </div>
            <div className="mt-4 rounded-2xl border-2 border-dashed border-lf-clay/60 bg-lf-card p-4 text-center">
              <p className="font-semibold text-lf-espresso">🔒 Unlock your exact numbers</p>
              <p className="mt-1 text-xs text-lf-muted">Free account · real parcel data for your address</p>
            </div>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="mt-4 min-h-12 w-full rounded-xl bg-lf-clay font-semibold text-white transition hover:bg-lf-mahogany"
            >
              Create free account
            </button>
          </section>
        )}
      </div>

      <div className="pb-8 pt-4 text-center">
        <button
          type="button"
          onClick={handleSkip}
          className="min-h-11 px-4 text-sm text-lf-muted underline underline-offset-4"
        >
          Skip — explore the demo lot
        </button>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function BlurredFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-lf-muted">{label}</p>
      {/* blur-sm + select-none keeps the layout honest without leaking the value */}
      <p aria-hidden className="select-none font-semibold text-lf-espresso blur-sm">
        {value}
      </p>
    </div>
  );
}
