"use client";

import { useState, useTransition } from "react";
import { normalizeServiceArea } from "@/lib/marketplace";
import type { BuilderProfile } from "@/lib/marketplace-types";

type BuilderProfileInput = Omit<
  BuilderProfile,
  "id" | "ownerUid" | "createdAt" | "updatedAt" | "credits"
>;

/**
 * Form for creating/editing a builder's marketplace profile: company name,
 * contact email, phone, license, comma-separated service areas (normalized via
 * {@link normalizeServiceArea}), and active status.
 *
 * @param props.defaults - Prefilled company name and contact email.
 * @param props.onSave - Persists the validated profile input.
 */
export default function BuilderProfileForm({
  defaults,
  onSave,
}: {
  defaults: { companyName: string; contactEmail: string };
  onSave: (input: BuilderProfileInput) => Promise<void>;
}) {
  const [companyName, setCompanyName] = useState(defaults.companyName);
  const [contactEmail, setContactEmail] = useState(defaults.contactEmail);
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [serviceAreaText, setServiceAreaText] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const serviceAreas = serviceAreaText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const parts = value.split(/\s+/);
        const state = parts.at(-1) ?? "";
        const city = parts.slice(0, -1).join(" ");
        return normalizeServiceArea(city, state);
      })
      .filter((area) => area.city && area.state.length === 2);

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!contactEmail.trim()) {
      setError("Contact email is required.");
      return;
    }
    if (serviceAreas.length === 0) {
      setError("Add at least one service area like Seattle WA.");
      return;
    }

    startTransition(async () => {
      try {
        await onSave({
          companyName: companyName.trim(),
          contactEmail: contactEmail.trim(),
          phone: phone.trim() || null,
          licenseNumber: licenseNumber.trim() || null,
          serviceAreas,
          active,
        });
      } catch {
        setError("Could not save this builder profile.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 grid gap-4 rounded-md border border-lf-hairline bg-lf-card p-4 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <h2 className="lf-panel-heading">Builder profile</h2>
        <p className="lf-body-sm mt-1 text-lf-muted">
          Add your service coverage before receiving matched ADU snapshots.
        </p>
        <p className="lf-caption mt-1 text-lf-muted">* Required</p>
      </div>
      {error && (
        <div role="alert" className="md:col-span-2 text-sm text-lf-brick">
          {error}
        </div>
      )}
      <label className="lf-body-sm font-medium text-lf-espresso">
        Company name <span aria-hidden="true">*</span>
        <input
          type="text"
          autoComplete="organization"
          className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-base sm:text-sm"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          aria-required="true"
        />
      </label>
      <label className="lf-body-sm font-medium text-lf-espresso">
        Contact email <span aria-hidden="true">*</span>
        <input
          type="email"
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-base sm:text-sm"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          aria-required="true"
        />
      </label>
      <label className="lf-body-sm font-medium text-lf-espresso">
        Phone (optional)
        <input
          type="tel"
          autoComplete="tel"
          className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-base sm:text-sm"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      <label className="lf-body-sm font-medium text-lf-espresso">
        License number (optional)
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-base sm:text-sm"
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
        />
      </label>
      <label className="lf-body-sm font-medium text-lf-espresso md:col-span-2">
        Service areas
        <input
          type="text"
          className="mt-1 w-full rounded-md border border-lf-hairline bg-lf-sand px-3 py-2 text-base sm:text-sm"
          placeholder="Seattle WA, Portland OR"
          value={serviceAreaText}
          onChange={(event) => setServiceAreaText(event.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-lf-muted md:col-span-2">
        <input
          type="checkbox"
          className="accent-lf-clay"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Active for new matched requests
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-full bg-lf-clay px-4 text-sm font-semibold text-lf-sand transition-colors hover:bg-lf-clay-strong disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save builder profile"}
      </button>
    </form>
  );
}
