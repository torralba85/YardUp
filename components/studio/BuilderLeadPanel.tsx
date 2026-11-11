"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";
import { AdvisorIntakeSummary } from "./AdvisorIntakeSummary";
import { buildConnectionSnapshot, validateOwnerContact } from "@/lib/marketplace";
import {
  availablePartnerNetwork,
  partnerConsentText,
  type BuilderNetworkChoice,
  type PartnerReferralStatus,
} from "@/lib/partner-referrals";
import type { BuilderMatchState } from "@/lib/use-builder-matches";
import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "@/lib/feasibility";
import type { ConnectionSnapshot, OwnerContact } from "@/lib/marketplace-types";
import type { Parcel } from "@/lib/parcel-types";
import { Button } from "@/components/ui/Button";
import { Checkbox, FieldLabel, Input, Segmented, Textarea } from "@/components/ui/Field";

/** Payload emitted when a homeowner submits the connect-with-builders form. */
export interface BuilderLeadSubmitInput {
  /** The validated owner contact details. */
  contact: OwnerContact;
  /** The full feasibility snapshot to attach to the lead. */
  snapshot: ConnectionSnapshot;
  /**
   * Where the homeowner asked us to send it: the LotFoundry marketplace, or a
   * partner network offered for this lot (see `lib/partner-referrals.ts`).
   */
  network: BuilderNetworkChoice;
}

/** What the submit handler reports back, per network. */
export type BuilderLeadSubmitResult =
  | { matchedCount: number }
  | { partnerName: string; referralId: string; status: PartnerReferralStatus };

/**
 * What the homeowner has typed. The Studio holds it, so closing the form or
 * leaving the step loses nothing; consent is not kept and is asked again.
 */
export interface BuilderLeadDraft {
  name: string;
  email: string;
  phone: string;
  message: string;
}

type ContactField = "name" | "email" | "phone" | "consent";

const ERROR_ID = "builder-lead-error";

/**
 * Slide-over form that lets a homeowner share their feasibility study with
 * matched builders. Collects and validates contact details, assembles a
 * {@link ConnectionSnapshot} from the current parcel/config/result, and emits
 * a {@link BuilderLeadSubmitInput} on submit.
 *
 * Where a partner network covers the lot (flag-gated), the homeowner chooses
 * who receives it; where no LotFoundry builder serves the area, the partner is
 * the only network offered. With neither, it says so in place of the form. A
 * guest's Submit opens sign-in instead of failing after they fill everything
 * in, and a sent snapshot replaces the form so it cannot be sent twice.
 *
 * @param props - Open state, the contact draft and its setter, the
 *   parcel/config/result to snapshot, the sign-in and builder-match state, and
 *   the `onClose`/`onSubmit`/`onRequestSignIn` handlers.
 */
export default function BuilderLeadPanel({
  open,
  draft,
  onDraftChange,
  parcelKey,
  parcel,
  config,
  assumptions,
  result,
  signedIn,
  matches,
  onClose,
  onSubmit,
  onRequestSignIn,
}: {
  open: boolean;
  draft: BuilderLeadDraft;
  onDraftChange: (draft: BuilderLeadDraft) => void;
  parcelKey: string;
  parcel: Parcel;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
  /** Sending needs an account; a guest's Submit calls `onRequestSignIn`. */
  signedIn: boolean;
  /** How many builders serve this parcel, from `useBuilderMatches`. */
  matches: BuilderMatchState;
  onClose: () => void;
  onSubmit: (input: BuilderLeadSubmitInput) => Promise<BuilderLeadSubmitResult>;
  onRequestSignIn: () => void;
}) {
  const [consent, setConsent] = useState(false);
  const [network, setNetwork] = useState<BuilderNetworkChoice>("lotfoundry");
  // `field` is null for a failed send, which is reported beside Submit.
  const [error, setError] = useState<{ field: ContactField | null; message: string } | null>(null);
  const [success, setSuccess] = useState<{ message: string; next: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // The button that opened the form is gone; start keyboard and screen-reader
  // users at the form's heading rather than at the top of the page.
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  // Submit unmounts with the form; land focus on the confirmation instead.
  useEffect(() => {
    if (success) successRef.current?.focus();
  }, [success]);

  // Take the person to the field that needs fixing (ids are `builder-lead-<field>`).
  useEffect(() => {
    if (error?.field) document.getElementById(`builder-lead-${error.field}`)?.focus();
  }, [error]);

  if (!open) return null;
  const snapshot = buildConnectionSnapshot({ parcelKey, parcel, config, assumptions, result });
  const noBuilders = matches.status === "ready" && matches.count === 0;
  const partner = availablePartnerNetwork(snapshot);
  const networks: BuilderNetworkChoice[] = partner
    ? noBuilders ? [partner.id] : ["lotfoundry", partner.id]
    : ["lotfoundry"];
  // Coverage and matches can change with the address; never submit to a hidden option.
  const activeNetwork = networks.includes(network) ? network : networks[0];
  const toPartner = partner !== null && activeNetwork === partner.id;
  const matchNote =
    matches.status === "guest"
      ? "Sign in or create a free account to send it."
      : toPartner
        ? null
        : matches.status === "loading"
          ? "Checking which builders serve this area…"
          : matches.status === "ready"
            ? `Goes to ${matches.count} builder${matches.count === 1 ? "" : "s"} who serve${matches.count === 1 ? "s" : ""} this area.`
            : null;

  function chooseNetwork(next: BuilderNetworkChoice) {
    setNetwork(next);
    // Consent is specific to who receives the details, so it never carries over.
    setConsent(false);
    setError(null);
  }

  function fieldProps(field: ContactField) {
    const invalid = error?.field === field;
    return {
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? ERROR_ID : undefined,
    };
  }

  function fieldError(field: ContactField | null) {
    if (!error || error.field !== field) return null;
    return (
      <p id={ERROR_ID} role="alert" className="mt-1 text-sm text-status-blocked md:col-span-2">
        {error.message}
      </p>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validateOwnerContact({ ...draft, consent });
    if (!validation.ok) {
      setError({ field: validation.field, message: validation.error });
      return;
    }
    if (!signedIn) {
      onRequestSignIn();
      return;
    }
    startTransition(async () => {
      try {
        const submitted = await onSubmit({
          contact: validation.contact,
          snapshot,
          network: activeNetwork,
        });
        if ("referralId" in submitted) {
          setSuccess(submitted.status === "queued" ? {
            message: `Referral received. Your referral number is ${submitted.referralId}.`,
            next: `Your introduction to ${submitted.partnerName} is pending. LotFoundry will follow up and copy you when it is sent. You don't need to submit again.`,
          } : {
            message: `Sent to ${submitted.partnerName}. Your referral number is ${submitted.referralId}.`,
            next: `You're copied on the introduction email. A ${submitted.partnerName} project advisor will contact you to set up a free consultation.`,
          });
        } else {
          setSuccess({
            message:
              submitted.matchedCount === 1
                ? "Sent to 1 local builder."
                : `Sent to ${submitted.matchedCount} local builders.`,
            next: "Interested builders may contact you about your project. There's nothing more to send.",
          });
        }
      } catch (err) {
        setError({ field: null, message: err instanceof Error ? err.message : "Could not submit this snapshot." });
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
            ref={headingRef}
            id="builder-lead-heading"
            tabIndex={-1}
            className="font-display text-xl font-medium text-lot-ink outline-none"
          >
            Connect with local builders
          </h2>
          <p className="mt-1 text-sm leading-6 text-lot-stone">
            {partner && networks.length > 1
              ? "Choose who receives this address and feasibility snapshot. Whoever you choose may contact you about your project."
              : partner
                ? `Share this address and feasibility snapshot with ${partner.name}, which serves this area. ${partner.name} may contact you about your project.`
                : "Share this address and feasibility snapshot with registered builders that serve this area. Builders may contact you about your project."}
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

      {success ? (
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="mt-4 border border-lot-line bg-lot-surface p-4 outline-none"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-status-eligible">
            <CheckCircle2 size={16} aria-hidden="true" className="shrink-0" />
            {success.message}
          </p>
          <p className="mt-1 text-sm leading-6 text-lot-stone">{success.next}</p>
          <Button type="button" variant="primary" size="md" className="mt-4" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : noBuilders && !partner ? (
        <div className="mt-4 border border-lot-line bg-lot-surface p-4">
          <p className="text-sm font-semibold text-lot-ink">No builders are registered for this area yet.</p>
          <p className="mt-1 text-sm leading-6 text-lot-stone">
            The network is growing. Save your concept and check back; we&apos;ll match you as builders join.
          </p>
          <Button type="button" variant="secondary" size="md" className="mt-4" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <>
          {partner && (
            <div className="mt-4 space-y-2">
              {networks.length > 1 && (
                <>
                  <p id="builder-lead-network-label" className="text-sm font-semibold text-lot-ink">
                    Builder network
                  </p>
                  <Segmented
                    aria-labelledby="builder-lead-network-label"
                    value={activeNetwork}
                    onChange={chooseNetwork}
                    options={[
                      { value: "lotfoundry", label: "LotFoundry builders" },
                      { value: partner.id, label: partner.name },
                    ]}
                  />
                </>
              )}
              <p className="text-sm leading-6 text-lot-stone">
                {toPartner
                  ? `${partner.name} is an independent contractor-matching service in ${partner.serviceAreaLabel}. When you submit, LotFoundry emails your project to ${partner.name} and copies you. A ${partner.name} project advisor then offers you a free consultation and introduces contractors or architects from its network.`
                  : "Registered builders that serve this area see a preview without your contact details. A builder sees your details only after paying LotFoundry to unlock this snapshot."}
              </p>
            </div>
          )}

          {snapshot.advisorIntake && (
            <div className="mt-4">
              <AdvisorIntakeSummary
                intake={snapshot.advisorIntake}
                title={toPartner ? `Project details shared with ${partner.name}` : "Project details shared with builders"}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="builder-lead-name">Name</FieldLabel>
              <Input
                id="builder-lead-name"
                type="text"
                autoComplete="name"
                className="mt-1"
                value={draft.name}
                onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                {...fieldProps("name")}
              />
              {fieldError("name")}
            </div>
            <div>
              <FieldLabel htmlFor="builder-lead-email">Email</FieldLabel>
              <Input
                id="builder-lead-email"
                type="email"
                autoComplete="email"
                className="mt-1"
                value={draft.email}
                onChange={(event) => onDraftChange({ ...draft, email: event.target.value })}
                {...fieldProps("email")}
              />
              {fieldError("email")}
            </div>
            <div>
              <FieldLabel htmlFor="builder-lead-phone">Phone (optional)</FieldLabel>
              <Input
                id="builder-lead-phone"
                type="tel"
                autoComplete="tel"
                className="mt-1"
                value={draft.phone}
                onChange={(event) => onDraftChange({ ...draft, phone: event.target.value })}
                {...fieldProps("phone")}
              />
              {fieldError("phone")}
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="builder-lead-message">Message (optional)</FieldLabel>
              <Textarea
                id="builder-lead-message"
                className="mt-1 min-h-20"
                value={draft.message}
                onChange={(event) => onDraftChange({ ...draft, message: event.target.value })}
              />
            </div>
            <label
              htmlFor="builder-lead-consent"
              className="flex cursor-pointer items-start gap-2 text-sm leading-6 text-lot-stone md:col-span-2"
            >
              <Checkbox
                id="builder-lead-consent"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5"
                {...fieldProps("consent")}
              />
              <span>
                {toPartner
                  ? partnerConsentText(partner)
                  : "I'm 18 or older and I direct LotFoundry to share my name, email, optional phone and message, exact property address, and backyard home snapshot with matched builders. Builders pay LotFoundry to unlock these details and may contact me about this project by email, phone, or text, including automated texts. Message and data rates may apply; reply STOP to opt out of texts. Consent isn't required to buy anything. LotFoundry doesn't verify builder licenses, bonds, or insurance; check any contractor at cslb.ca.gov before signing."}
              </span>
            </label>
            {fieldError("consent")}
            {toPartner && (
              <p className="text-sm leading-6 text-lot-stone md:col-span-2">
                Read the {partner.name}{" "}
                <a
                  href={partner.privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                >
                  privacy policy
                </a>{" "}
                and{" "}
                <a
                  href={partner.termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-lot-orange-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                >
                  terms
                </a>
                .
              </p>
            )}
            {matchNote && <p className="text-sm text-lot-stone md:col-span-2">{matchNote}</p>}
            {/* Beside Submit, not atop the form: the form is taller than most
                screens, so a message up there appeared out of view. */}
            {fieldError(null)}
            <Button type="submit" variant="primary" size="md" loading={isPending}>
              {isPending ? "Submitting…" : signedIn ? "Submit snapshot" : "Sign in to send"}
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
