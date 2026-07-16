"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { buildConnectionSnapshot, validateOwnerContact } from "@/lib/marketplace";
import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "@/lib/feasibility";
import type { ConnectionSnapshot, OwnerContact } from "@/lib/marketplace-types";
import type { Parcel } from "@/lib/parcel-types";
import { Button } from "@/components/ui/Button";

/** Payload emitted when a homeowner submits the connect-with-builders form. */
export interface BuilderLeadSubmitInput {
  /** The validated owner contact details. */
  contact: OwnerContact;
  /** The full feasibility snapshot to attach to the lead. */
  snapshot: ConnectionSnapshot;
}

/**
 * Slide-over form that lets a homeowner share their feasibility study with
 * matched builders. Collects and validates contact details, assembles a
 * {@link ConnectionSnapshot} from the current parcel/config/result, and emits
 * a {@link BuilderLeadSubmitInput} on submit.
 *
 * @param props - Open state, prefilled defaults, the parcel/config/result to
 *   snapshot, and the `onClose`/`onSubmit` handlers.
 */
export default function BuilderLeadPanel({
  open,
  userDefaults,
  parcelKey,
  parcel,
  config,
  assumptions,
  result,
  onClose,
  onSubmit,
}: {
  open: boolean;
  userDefaults: { name: string; email: string };
  parcelKey: string;
  parcel: Parcel;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
  onClose: () => void;
  onSubmit: (input: BuilderLeadSubmitInput) => Promise<{ matchedCount: number }>;
}) {
  const [name, setName] = useState(userDefaults.name);
  const [email, setEmail] = useState(userDefaults.email);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validateOwnerContact({ name, email, phone, message, consent });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const snapshot = buildConnectionSnapshot({
      parcelKey,
      parcel,
      config,
      assumptions,
      result,
    });

    startTransition(async () => {
      try {
        const submitted = await onSubmit({ contact: validation.contact, snapshot });
        setSuccess(
          submitted.matchedCount === 1
            ? "Sent to 1 local builder."
            : `Sent to ${submitted.matchedCount} local builders.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not submit this snapshot.");
      }
    });
  }

  return (
    <section
      aria-labelledby="builder-lead-heading"
      className="border-t border-lf-hairline bg-lf-card px-6 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="builder-lead-heading"
            className="font-display text-xl font-bold text-lf-espresso"
          >
            Connect with local builders
          </h2>
          <p className="mt-1 text-sm leading-6 text-lf-muted">
            Share this address and feasibility snapshot with registered builders that serve this area.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close builder connection form"
          className="rounded p-1 text-lf-muted transition hover:bg-lf-sand-2 hover:text-lf-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        {error && (
          <div role="alert" className="md:col-span-2 text-sm text-lf-brick">
            {error}
          </div>
        )}
        {success && (
          <div className="md:col-span-2 text-sm font-semibold text-lf-forest">
            {success}
          </div>
        )}
        <label className="text-sm font-medium text-lf-espresso">
          Name
          <input
            className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-lf-espresso">
          Email
          <input
            className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-lf-espresso">
          Phone optional
          <input
            className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-sm"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-lf-espresso md:col-span-2">
          Message optional
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-sm"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <label className="flex gap-2 text-sm leading-6 text-lf-muted md:col-span-2">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          I agree to share my contact details, property address, and ADU snapshot with matched local builders.
        </label>
        <Button type="submit" variant="primary" size="md" loading={isPending}>
          {isPending ? "Submitting…" : "Submit snapshot"}
        </Button>
      </form>
    </section>
  );
}
