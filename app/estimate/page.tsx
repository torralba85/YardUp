"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "../../lib/auth-context";

type Size = "studio" | "one-bed" | "two-bed";
type Finish = "essential" | "mid" | "premium";

const sizeMeta: Record<Size, { label: string; sqft: number; baseRent: number; baseCost: number }> = {
  studio: { label: "Studio · 400 sq ft", sqft: 400, baseRent: 2100, baseCost: 240000 },
  "one-bed": { label: "1 bed · 600 sq ft", sqft: 600, baseRent: 2650, baseCost: 305000 },
  "two-bed": { label: "2 bed · 850 sq ft", sqft: 850, baseRent: 3200, baseCost: 395000 },
};

const finishMeta: Record<Finish, { label: string; rentMult: number; costMult: number }> = {
  essential: { label: "Essential", rentMult: 0.95, costMult: 0.9 },
  mid: { label: "Mid-range", rentMult: 1, costMult: 1 },
  premium: { label: "Premium", rentMult: 1.12, costMult: 1.18 },
};

const steps = ["Address", "Site", "ADU", "Result"] as const;

export default function EstimatePage() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [lotSize, setLotSize] = useState<"under-5k" | "5k-10k" | "over-10k">("5k-10k");
  const [hasAlleyAccess, setHasAlleyAccess] = useState(false);
  const [size, setSize] = useState<Size>("one-bed");
  const [finish, setFinish] = useState<Finish>("mid");

  const result = useMemo(() => {
    const s = sizeMeta[size];
    const f = finishMeta[finish];
    const rent = Math.round(s.baseRent * f.rentMult);
    const rentLow = Math.round(rent * 0.94);
    const rentHigh = Math.round(rent * 1.06);
    const cost = Math.round(s.baseCost * f.costMult);
    const costLow = Math.round(cost * 0.92);
    const costHigh = Math.round(cost * 1.1);
    const paybackYears = Math.round(cost / (rent * 12 * 0.7));
    return { rent, rentLow, rentHigh, cost, costLow, costHigh, paybackYears };
  }, [size, finish]);

  const canAdvance = () => {
    if (step === 0) return address.trim().length > 4 && zip.trim().length >= 5;
    return true;
  };

  return (
    <main className="estimate">
      <header className="estimateHeader">
        <div className="eyebrow">ADU income estimator</div>
        <h1>Let&apos;s see what your backyard could earn.</h1>
        <ol className="stepper">
          {steps.map((label, i) => (
            <li
              key={label}
              className={
                i === step ? "stepperItem active" : i < step ? "stepperItem done" : "stepperItem"
              }
            >
              <span className="stepDot">{i + 1}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </header>

      <section className="estimateCard">
        {step === 0 && (
          <div className="estStep">
            <h2>Where is the property?</h2>
            <p>We use address and ZIP to look up zoning and comparable rents.</p>
            <label className="field">
              <span>Street address</span>
              <input
                type="text"
                placeholder="123 Maple Ave"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <label className="field">
              <span>ZIP code</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="94110"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="estStep">
            <h2>Tell us about the lot.</h2>
            <p>Lot size and access shape what kind of ADU fits.</p>
            <div className="choiceRow">
              {(
                [
                  { v: "under-5k", l: "Under 5,000 sq ft" },
                  { v: "5k-10k", l: "5,000 – 10,000 sq ft" },
                  { v: "over-10k", l: "Over 10,000 sq ft" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  className={lotSize === opt.v ? "choice selected" : "choice"}
                  onClick={() => setLotSize(opt.v)}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <label className="toggleRow">
              <input
                type="checkbox"
                checked={hasAlleyAccess}
                onChange={(e) => setHasAlleyAccess(e.target.checked)}
              />
              <span>Alley or rear-yard access</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="estStep">
            <h2>What kind of ADU?</h2>
            <p>Pick a starting point. You can change it later.</p>
            <div className="choiceRow">
              {(Object.keys(sizeMeta) as Size[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={size === s ? "choice selected" : "choice"}
                  onClick={() => setSize(s)}
                >
                  {sizeMeta[s].label}
                </button>
              ))}
            </div>
            <div className="choiceLabel">Finish level</div>
            <div className="choiceRow">
              {(Object.keys(finishMeta) as Finish[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={finish === f ? "choice selected" : "choice"}
                  onClick={() => setFinish(f)}
                >
                  {finishMeta[f].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="estStep estResult">
            <div className="resultHeadline">
              <span className="eyebrow">Estimated monthly rent</span>
              <strong className="resultBig">${result.rent.toLocaleString()}</strong>
              <span className="resultRange">
                Range ${result.rentLow.toLocaleString()} – ${result.rentHigh.toLocaleString()}
              </span>
            </div>
            <div className="resultGrid">
              <div>
                <span>Build cost</span>
                <strong>
                  ${(result.costLow / 1000).toFixed(0)}k – ${(result.costHigh / 1000).toFixed(0)}k
                </strong>
              </div>
              <div>
                <span>Payback</span>
                <strong>~{result.paybackYears} yrs</strong>
              </div>
              <div>
                <span>Builder matches</span>
                <strong>7 ready</strong>
              </div>
            </div>
            <p className="estDisclaimer">
              Estimate, not a guarantee. Comparable rents and build costs vary
              by lot, finish, and permit conditions.
            </p>
            {!user && (
              <div className="authNotice">
                <strong>Save your estimate.</strong>{" "}
                <Link href="/register">Create an account</Link> or{" "}
                <Link href="/login">log in</Link> to keep this estimate and
                contact builders.
              </div>
            )}
            {user && (
              <Link href="/dashboard" className="primaryAction">
                Open your dashboard
              </Link>
            )}
          </div>
        )}

        <div className="estimateFooter">
          <button
            type="button"
            className="secondaryAction"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="primaryAction"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={!canAdvance()}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="secondaryAction"
              onClick={() => setStep(0)}
            >
              Start over
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
