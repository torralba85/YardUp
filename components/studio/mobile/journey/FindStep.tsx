"use client";

import { ArrowRight, Search } from "lucide-react";
import { parcelPresets } from "@/lib/feasibility";
import AddressSearch, { type AddressSearchResult } from "@/components/studio/AddressSearch";
import { Button } from "@/components/ui/Button";

/** Props for {@link FindStep}. */
export interface FindStepProps {
  /** A place was picked from the suggestion list. */
  onSelect: (found: AddressSearchResult) => void;
  /** Free-text address submitted. */
  onSubmitText: (query: string) => void;
  /** Whether a parcel lookup is in flight. */
  parcelLoading: boolean;
  /** Lookup/geocode error to surface, if any. */
  parcelError: string | null;
  /** The selected demo preset id (when in preset mode). */
  selectedPresetId: string | null;
  /** A demo lot chip was tapped. */
  onPresetSelect: (id: string) => void;
  /** The one primary action: reveal what the chosen lot could earn. */
  onReveal: () => void;
}

/**
 * Reveal 1 · Find — enter or select the property. One decision (the address
 * or a demo lot) and one primary action: reveal the backyard's potential.
 * A live address resolution advances the journey automatically; the CTA
 * covers the demo path and re-reveals.
 */
export default function FindStep({
  onSelect,
  onSubmitText,
  parcelLoading,
  parcelError,
  selectedPresetId,
  onPresetSelect,
  onReveal,
}: FindStepProps) {
  return (
    <section
      aria-label="Find your property"
      className="flex min-h-full flex-col px-5 pt-7"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <p className="lf-kicker text-lf-clay">Step 1 · Find</p>
      <h1 className="mt-2 font-display text-[clamp(1.65rem,7vw,1.95rem)] font-semibold leading-[1.1] text-balance text-lf-espresso">
        Start with your address.
      </h1>
      <p className="lf-body-sm mt-2 text-lf-muted">
        We&rsquo;ll pull your parcel, local zoning, and your area&rsquo;s market rents.
      </p>

      <div className="mt-5">
        <AddressSearch onSelect={onSelect} onSubmitText={onSubmitText} />
        {parcelLoading && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-lf-hairline bg-lf-sand-2 px-3 py-2 text-xs text-lf-muted">
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-lf-hairline border-t-lf-clay" />
            Looking up property data…
          </div>
        )}
        {parcelError && (
          <div
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick/10 p-3 text-xs text-lf-brick"
          >
            <Search size={14} className="mt-0.5 shrink-0" />
            {parcelError}
          </div>
        )}
      </div>

      <p className="mt-7 lf-kicker-dense text-lf-muted">
        Or explore a demo lot
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Demo lots">
        {parcelPresets.map((preset) => {
          const selected = selectedPresetId === preset.id;
          return (
            <Button
              key={preset.id}
              type="button"
              size="md"
              variant={selected ? "selected" : "secondary"}
              onClick={() => onPresetSelect(preset.id)}
              aria-pressed={selected}
              className="px-4"
            >
              {preset.city.split(",")[0]}
            </Button>
          );
        })}
      </div>

      <div className="mt-auto pt-8">
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight size={16} />}
          onClick={onReveal}
        >
          Reveal my backyard&rsquo;s potential
        </Button>
      </div>
    </section>
  );
}
