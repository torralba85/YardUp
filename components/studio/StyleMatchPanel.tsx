"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  prepareStyleMatchPhoto,
  STYLE_MATCH_ACCEPT,
  type PreparedStyleMatchPhoto,
} from "@/lib/style-match-photo";
import { AIRequestError, requestADUConcept } from "@/lib/ai-api";
import type { AIADUConcept } from "@/lib/ai-types";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";

/** Props for {@link StyleMatchPanel}. */
export interface StyleMatchPanelProps {
  /** Active parcel context sent to the ADU concept API. */
  parcel: Parcel & { zoning?: string; source?: string };
  /** Active ADU configuration sent to the ADU concept API. */
  config: ADUConfig;
  /** Called with the prepared photo once the user confirms their upload. */
  onConfirm?: (photo: PreparedStyleMatchPhoto) => void;
  /** Called when concept generation finishes, with the synthesized result. */
  onGenerationComplete?: (concept: {
    photoUrl: string;
    conceptUrl: string;
    styleName: string;
    matchPercentage: number;
    traits: string[];
  }) => void;
  /** Injectable photo-preparation function (overridden in tests). */
  preparePhoto?: typeof prepareStyleMatchPhoto;
}

type PanelStatus = "idle" | "preparing" | "preview" | "generating" | "ready" | "error" | "timeout";

const GENERATING_STEPS = [
  "Reading materials & roofline",
  "Matching siding + trim palette",
  "Casting 2BD/1BA DADU concept",
];

const STYLE_MATCH_CONFIDENCE = 91;
const DEV_CONCEPT: AIADUConcept = {
  architecturalStyle: "Craftsman",
  styleSummary: "Dev-only style-match concept.",
  matchedElements: ["Cedar lap siding", "Low-pitch gable", "White trim", "Espresso door"],
  recommendedConfig: { roof: "gable", finish: "lap" },
  imagePrompt: "Dev-only style-match concept.",
  imageDataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  disclaimer: "Developer preview only.",
};

const showDeveloperTestControls = process.env.NODE_ENV !== "production";

const getStepState = (index: number, progress: number): "completed" | "current" | "pending" => {
  if (index === 0) {
    return progress >= 30 ? "completed" : "current";
  }
  if (index === 1) {
    if (progress < 30) return "pending";
    return progress >= 60 ? "completed" : "current";
  }
  if (index === 2) {
    if (progress < 60) return "pending";
    return progress >= 100 ? "completed" : "current";
  }
  return "pending";
};

/**
 * Photo uploader for the AI style-match flow: accepts a reference photo,
 * prepares it client-side (downscale, JPEG re-encode, metadata strip) via
 * {@link prepareStyleMatchPhoto}, validates it, and drives concept generation,
 * surfacing progress and any errors.
 *
 * @param props - The {@link StyleMatchPanelProps}.
 */
export default function StyleMatchPanel({
  parcel,
  config,
  onConfirm,
  onGenerationComplete,
  preparePhoto = prepareStyleMatchPhoto,
}: StyleMatchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onGenerationCompleteRef = useRef(onGenerationComplete);
  const generationRunRef = useRef(0);

  const [status, setStatus] = useState<PanelStatus>("idle");
  const [prepared, setPrepared] = useState<PreparedStyleMatchPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  /** Required before OpenAI photo upload / generation. */
  const [aiConsent, setAiConsent] = useState(false);

  function clearGenerationTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    onGenerationCompleteRef.current = onGenerationComplete;
  }, [onGenerationComplete]);

  useEffect(() => {
    return () => {
      generationRunRef.current += 1;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      clearGenerationTimer();
    };
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!aiConsent) {
      setError("Confirm you agree to send this photo to OpenAI before uploading.");
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setStatus("preparing");
    setError(null);
    setPrepared(null);
    replacePreviewUrl(null);
    generationRunRef.current += 1;
    clearGenerationTimer();

    try {
      const next = await preparePhoto(file);
      const nextPreviewUrl = URL.createObjectURL(next.blob);
      setPrepared(next);
      replacePreviewUrl(nextPreviewUrl);
      setStatus("preview");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Photo preparation failed.");
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function triggerSuccess() {
    generationRunRef.current += 1;
    completeGeneration(DEV_CONCEPT);
  }

  function triggerError() {
    generationRunRef.current += 1;
    clearGenerationTimer();
    setError("We couldn't read enough of the house from this photo. Try a daylight shot.");
    setStatus("error");
  }

  function triggerTimeout() {
    generationRunRef.current += 1;
    clearGenerationTimer();
    setError("Casting timed out (>90s). Try again or check connection.");
    setStatus("timeout");
  }

  async function startGeneration() {
    if (!prepared || !previewUrlRef.current) return;
    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    setStatus("generating");
    setError(null);
    setGeneratingProgress(0);

    clearGenerationTimer();

    let progress = 0;
    timerRef.current = setInterval(() => {
      progress += 5;
      const nextProgress = Math.min(progress, 95);
      setGeneratingProgress(nextProgress);
    }, 500);

    try {
      const concept = await requestADUConcept({
        image: new File([prepared.blob], prepared.filename, { type: prepared.outputType }),
        parcel,
        config,
      });
      if (generationRunRef.current !== runId) return;
      completeGeneration(concept);
    } catch (caught) {
      if (generationRunRef.current !== runId) return;
      clearGenerationTimer();
      setError(
        caught instanceof AIRequestError
          ? caught.userMessage
          : "AI concept generation failed. Please try another photo.",
      );
      setStatus("error");
    }
  }

  function handleConfirm() {
    if (!prepared || !previewUrlRef.current) return;
    if (!aiConsent) {
      setError("Confirm you agree to send this photo to OpenAI before generating.");
      return;
    }
    onConfirm?.(prepared);
    void startGeneration();
  }

  function handleReset() {
    setStatus("idle");
    setPrepared(null);
    setError(null);
    replacePreviewUrl(null);
    setGeneratingProgress(0);
    setAiConsent(false);
    generationRunRef.current += 1;
    clearGenerationTimer();
    if (inputRef.current) inputRef.current.value = "";
  }

  function replacePreviewUrl(nextUrl: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }

  function completeGeneration(concept: AIADUConcept) {
    clearGenerationTimer();
    setGeneratingProgress(100);
    setStatus("ready");
    const currentPreviewUrl = previewUrlRef.current;
    if (currentPreviewUrl) {
      onGenerationCompleteRef.current?.({
        photoUrl: currentPreviewUrl,
        conceptUrl: concept.imageDataUrl,
        styleName: concept.architecturalStyle,
        matchPercentage: STYLE_MATCH_CONFIDENCE,
        traits: concept.matchedElements,
      });
    }
  }

  const inputId = "style-match-photo-input";

  return (
    <div className="border-[1.5px] border-lot-ink bg-lot-surface">
      <div className="border-b-4 border-double border-lot-ink px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="lf-kicker text-lot-orange-ink">
              Your house / your ADU
            </p>
            <h3 className="mt-1 font-display text-xl font-medium leading-tight text-lot-ink">
              Style-match photo
            </h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center border border-lot-ink bg-lot-chalk text-lot-ink">
            <Camera size={18} aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <p role="status" aria-live="polite" className="sr-only">
          {status === "preparing" ? "Preparing photo…" : status === "generating" ? "Generating your concept…" : status === "ready" ? "Photo ready for style match." : status === "preview" ? "Photo prepared. Ready to generate." : ""}
        </p>
        {status === "idle" && (
          <div className="space-y-4">
            <div className="border border-lot-line bg-lot-chalk px-3 py-3">
              <div className="flex items-start gap-2.5 text-sm leading-6 text-lot-stone">
                <ShieldCheck size={17} className="mt-1 shrink-0 text-status-eligible" aria-hidden="true" />
                <p>Used only to match your ADU&apos;s style. Never shown to builders.</p>
              </div>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-lot-ink">
              <Checkbox
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I agree to send this photo to OpenAI to generate a concept. LotFoundry does not
                store the original photo.
              </span>
            </label>
            <label
              htmlFor={inputId}
              className={`flex min-h-24 flex-col items-center justify-center border-[1.5px] border-dashed border-lot-orange bg-lot-chalk px-4 py-5 text-center motion-safe:transition focus-within:outline-none focus-within:ring-2 focus-within:ring-lot-orange-ink focus-within:ring-offset-2 ${
                aiConsent
                  ? "cursor-pointer hover:border-lot-ink hover:bg-lot-surface"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <input
                ref={inputRef}
                id={inputId}
                name="styleMatchPhoto"
                type="file"
                accept={STYLE_MATCH_ACCEPT}
                disabled={!aiConsent}
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              <ImagePlus size={22} className="text-lot-orange-ink" aria-hidden="true" />
              <span className="mt-2 text-sm font-semibold text-lot-ink">
                Choose house photo
              </span>
              <span className="mt-1 lf-kicker-dense text-lot-stone">
                JPG PNG WEBP HEIC
              </span>
            </label>
          </div>
        )}

        {status === "preparing" && (
          <div className="flex min-h-32 items-center justify-center border border-lot-line bg-lot-chalk px-4 py-6 text-lot-ink">
            <Loader2
              size={20}
              className="mr-2 motion-safe:animate-spin text-lot-orange-ink motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="lf-kicker">
              Preparing photo…
            </span>
          </div>
        )}

        {status === "generating" && (
          <div className="flex flex-col min-h-32 border border-lot-line bg-lot-chalk p-4 text-lot-ink">
            <div className="flex items-center justify-between lf-kicker-dense text-lot-stone mb-3">
              <span>Casting concept…</span>
            </div>
            
            <div className="relative aspect-[4/3] w-full border border-lot-line overflow-hidden mb-3">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Uploading house"
                  width={prepared?.width ?? 800}
                  height={prepared?.height ?? 600}
                  className="h-full w-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-lot-ink/10">
                <Loader2 className="motion-safe:animate-spin text-lot-orange-ink" size={24} aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2 border-t border-dashed border-lot-line pt-3">
              {GENERATING_STEPS.map((stepText, idx) => {
                const state = getStepState(idx, generatingProgress);
                let icon = null;
                let textColor = "text-lot-stone";
                
                if (state === "completed") {
                  icon = <CheckCircle2 size={16} className="text-status-eligible shrink-0" aria-hidden="true" />;
                  textColor = "text-status-eligible font-semibold";
                } else if (state === "current") {
                  icon = <Loader2 size={16} className="motion-safe:animate-spin text-lot-orange-ink shrink-0" aria-hidden="true" />;
                  textColor = "text-lot-ink font-semibold";
                } else {
                  icon = (
                    <div className="h-4 w-4 rounded-full border border-lot-stone bg-lot-surface flex items-center justify-center shrink-0" aria-hidden="true">
                      <div className="h-1.5 w-1.5 rounded-full bg-lot-ink" />
                    </div>
                  );
                  textColor = "text-lot-stone";
                }

                return (
                  <div key={idx} className={`flex items-center gap-2.5 text-[11px] font-sans leading-none ${textColor}`}>
                    {icon}
                    <span>{stepText}</span>
                  </div>
                );
              })}
            </div>

            <div className="h-1.5 w-full bg-lot-stone-soft mt-4 overflow-hidden rounded-full">
              <div className="h-full w-full origin-left bg-lot-orange motion-safe:transition-transform duration-(--duration-settle) motion-safe:animate-pulse" style={{ transform: `scaleX(${generatingProgress / 100})` }} />
            </div>

            <p className="mt-3 text-[11px] text-lot-stone leading-normal">
              Usually under a minute. Keep adjusting the plan — the concept appears in the gallery as soon as it is ready.
            </p>

            {showDeveloperTestControls && (
              <div className="mt-4 border border-dashed border-lot-line p-2 flex flex-col gap-1.5 bg-lot-surface">
                <div className="font-sans text-[11px] uppercase text-lot-orange-ink text-center font-bold">
                  Dev Test Controls
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={triggerSuccess}
                    className="inline-flex min-h-11 items-center rounded-control bg-status-eligible px-3 py-1 font-sans text-xs font-semibold text-lot-chalk motion-safe:transition hover:bg-status-eligible-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
                  >
                    [Success]
                  </button>
                  <button
                    type="button"
                    onClick={triggerError}
                    className="inline-flex min-h-11 items-center rounded-control bg-status-blocked px-3 py-1 font-sans text-xs font-semibold text-lot-chalk motion-safe:transition hover:bg-status-blocked-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
                  >
                    [Error]
                  </button>
                  <button
                    type="button"
                    onClick={triggerTimeout}
                    className="inline-flex min-h-11 items-center rounded-control border border-status-review bg-status-review-soft px-3 py-1 font-sans text-xs font-semibold text-status-review motion-safe:transition hover:bg-lot-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
                  >
                    [Timeout]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(status === "preview" || status === "ready") && prepared && previewUrl && (
          <div className="space-y-4">
            <div className="overflow-hidden border border-lot-line bg-lot-chalk">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Prepared house photo preview"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            <dl className="grid grid-cols-2 gap-px overflow-hidden border border-lot-line bg-lot-line text-[11px]">
              <PhotoFact label="Output" value="JPEG" />
              <PhotoFact label="Max edge" value={`${Math.max(prepared.width, prepared.height)} px`} />
              <PhotoFact
                label="Downscale"
                value={prepared.wasDownscaled ? "Applied" : "Native"}
              />
              <PhotoFact label="EXIF" value={prepared.strippedMetadata ? "Stripped" : "Kept"} />
            </dl>

            {status === "ready" ? (
              <div className="lf-stamp border-[1.5px] border-status-eligible bg-status-eligible-soft px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-status-eligible">
                  <CheckCircle2 size={17} aria-hidden="true" />
                  Photo sealed for style match.
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="commit"
                  size="md"
                  className="flex-1"
                  onClick={handleConfirm}
                  leftIcon={<CheckCircle2 size={16} />}
                >
                  Use this photo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleReset}
                  aria-label="Choose another photo"
                  leftIcon={<RotateCcw size={16} />}
                />
              </div>
            )}
          </div>
        )}

        {(status === "error" || status === "timeout") && (
          <div className="space-y-3">
            <div
              role="alert"
              className={`border px-3 py-3 ${
                status === "error"
                  ? "border-status-blocked bg-status-blocked-soft text-status-blocked"
                  : "border-status-review/40 bg-status-review-soft text-status-review"
              }`}
            >
              <div className="flex items-start gap-2 text-sm leading-6">
                {status === "error" ? (
                  <XCircle size={17} className="mt-1 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={17} className="mt-1 shrink-0" aria-hidden="true" />
                )}
                <p>{error}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => void startGeneration()}
                leftIcon={<RotateCcw size={16} />}
              >
                Retry
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={handleReset}
              >
                Choose another photo
              </Button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}

function PhotoFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-lot-chalk px-3 py-2">
      <dt className="lf-kicker-dense text-lot-stone">
        {label}
      </dt>
      <dd className="mt-0.5 font-sans font-semibold uppercase tracking-[0.08em] text-lot-ink">
        {value}
      </dd>
    </div>
  );
}
