"use client";

import { AlertTriangle, ImagePlus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AIRequestError, requestADUConcept } from "@/lib/ai-api";
import type { AIADUConcept } from "@/lib/ai-types";
import type { ADUConfig, Parcel } from "@/lib/feasibility";

export default function AIStyleMatchPanel({
  parcel,
  config,
}: {
  parcel: Parcel & { zoning?: string; source?: string };
  config: ADUConfig;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [concept, setConcept] = useState<AIADUConcept | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
    setConcept(null);
    setError(null);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  async function generateConcept() {
    if (!file) {
      setError("Upload a home photo first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setConcept(await requestADUConcept({ image: file, parcel, config }));
    } catch (err) {
      setError(
        err instanceof AIRequestError
          ? err.userMessage
          : "AI concept generation failed. Please try another photo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="AI style match" className="space-y-3">
      <div>
        <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-lf-clay">
          AI style match
        </p>
        <h3 className="mt-0.5 text-sm font-semibold text-lf-espresso">
          Upload a home photo
        </h3>
      </div>

      <label className="block cursor-pointer rounded-lg border border-dashed border-lf-hairline bg-lf-sand-2 p-3 transition hover:border-lf-taupe">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
        />
        <span className="flex items-center gap-2 text-xs font-semibold text-lf-espresso">
          <ImagePlus size={15} />
          {file ? file.name : "Choose JPG, PNG, or WebP"}
        </span>
        <span className="mt-1 block text-xs leading-5 text-lf-muted">
          The AI reads exterior style cues and creates a matching detached ADU mockup.
        </span>
      </label>

      {previewUrl && !concept && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Uploaded home preview"
          className="aspect-[4/3] w-full rounded-lg border border-lf-hairline object-cover"
        />
      )}

      <button
        type="button"
        onClick={generateConcept}
        disabled={loading || !file}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-lf-clay text-xs font-semibold text-lf-sand transition hover:bg-lf-mahogany disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
      >
        <Sparkles size={14} />
        {loading ? "Generating concept" : "Generate matching ADU"}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick/10 p-3 text-xs leading-5 text-lf-brick">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {concept && (
        <div className="space-y-3 rounded-lg border border-lf-hairline bg-lf-sand-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={concept.imageDataUrl}
            alt="AI-generated matching ADU concept"
            className="aspect-[4/3] w-full rounded-lg border border-lf-hairline object-cover"
          />
          <div>
            <div className="text-sm font-semibold text-lf-espresso">
              {concept.architecturalStyle}
            </div>
            <p className="mt-1 text-xs leading-5 text-lf-muted">{concept.styleSummary}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {concept.matchedElements.map((element) => (
              <span
                key={element}
                className="rounded-md border border-lf-hairline bg-lf-card px-2 py-1 text-[10px] font-medium text-lf-muted"
              >
                {element}
              </span>
            ))}
          </div>
          <p className="text-[11px] leading-4 text-lf-muted">{concept.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
