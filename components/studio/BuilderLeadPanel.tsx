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
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";

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
      className="border-t border-lot-line bg-lot-chalk px-6 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="builder-lead-heading"
            className="font-display text-xl font-medium text-lot-ink"
          >
            Connect with local builders
          </h2>
          <p className="mt-1 text-sm leading-6 text-lot-stone">
            Share this address and feasibility snapshot with registered builders that serve this area. Builders may contact you about your project.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close builder connection form"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control text-lot-stone motion-safe:transition-colors hover:bg-lot-surface hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
        {error && (
          <div role="alert" className="md:col-span-2 text-sm text-status-blocked">
            {error}
          </div>
        )}
        {success && (
          <div className="md:col-span-2 text-sm font-semibold text-status-eligible">
            {success}
          </div>
        )}
        <div>
          <FieldLabel htmlFor="builder-lead-name">Name</FieldLabel>
          <Input
            id="builder-lead-name"
            type="text"
            autoComplete="name"
            className="mt-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="builder-lead-email">Email</FieldLabel>
          <Input
            id="builder-lead-email"
            type="email"
            autoComplete="email"
            className="mt-1"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="builder-lead-phone">Phone optional</FieldLabel>
          <Input
            id="builder-lead-phone"
            type="tel"
            autoComplete="tel"
            className="mt-1"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel htmlFor="builder-lead-message">Message optional</FieldLabel>
          <Textarea
            id="builder-lead-message"
            className="mt-1 min-h-20"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <label
          htmlFor="builder-lead-consent"
          className="flex cursor-pointer items-start gap-2 text-sm leading-6 text-lot-stone md:col-span-2"
        >
          <input
            id="builder-lead-consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded-none accent-lot-ink focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
          />
          <span>
            I agree to share my name, email, optional phone and message, exact property address, and backyard home snapshot with matched builders. Builders pay LotFoundry to unlock these details and may contact me about this project.
          </span>
        </label>
        <Button type="submit" variant="primary" size="md" loading={isPending}>
          {isPending ? "Submitting…" : "Submit snapshot"}
        </Button>
      </form>
    </section>
  );
}
