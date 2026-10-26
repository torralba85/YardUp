"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { validateEmail } from "@/lib/account-settings";
import { normalizeServiceArea } from "@/lib/marketplace";
import { US_STATE_NAMES } from "@/lib/us-states";
import type { BuilderProfile, ServiceArea } from "@/lib/marketplace-types";

type BuilderProfileInput = Omit<
  BuilderProfile,
  "id" | "ownerUid" | "createdAt" | "updatedAt" | "credits"
>;

/**
 * Form for creating/editing a builder's marketplace profile: company name,
 * contact email, phone, license, structured service areas (normalized via
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
  const [serviceState, setServiceState] = useState("");
  const [serviceScope, setServiceScope] = useState<"city" | "county" | "state">("city");
  const [addedAreas, setAddedAreas] = useState<ServiceArea[]>([]);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [invalidField, setInvalidField] = useState<string | null>(null);
  const fields = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  function invalidate(id: string, message: string) {
    setInvalidField(id);
    setError(message);
    fields.current[id]?.focus();
  }
  function fieldError(id: string) {
    return invalidField === id && error
      ? <span id={`${id}-error`} role="alert" className="mt-1 block text-sm text-status-blocked">{error}</span>
      : null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInvalidField(null);

    const pendingArea = normalizeServiceArea(serviceAreaText, serviceState, serviceScope);
    const hasPending = Boolean(serviceAreaText.trim() || serviceState);
    if (hasPending && (!pendingArea.state || (serviceScope !== "state" && !serviceAreaText.trim()))) {
      invalidate(!pendingArea.state ? "builder-service-state" : "builder-service-areas", "Enter a city or county and select its state.");
      return;
    }
    const serviceAreas = Array.from(new Map([...addedAreas, ...(hasPending ? [pendingArea] : [])].map(area => [area.key, area])).values());

    if (!companyName.trim()) {
      invalidate("builder-company-name", "Enter your company name.");
      return;
    }
    if (validateEmail(contactEmail)) {
      invalidate("builder-contact-email", "Enter a valid contact email.");
      return;
    }
    if (serviceAreas.length === 0 || serviceAreas.length > 25) {
      invalidate(serviceScope === "state" ? "builder-service-state" : "builder-service-areas", "Add 1 to 25 service areas, each with a selected state.");
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
      noValidate
      onSubmit={handleSubmit}
      className="mt-6 grid gap-4 rounded-none border border-lot-line bg-lot-chalk p-4 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <h2 className="lf-panel-heading">Builder profile</h2>
        <p className="lf-body-sm mt-1 text-lot-stone">
          Add your service coverage before receiving matched ADU snapshots.
        </p>
        <p className="lf-caption mt-1 text-lot-stone">* Required</p>
      </div>
      {error && !invalidField && (
        <div role="alert" className="md:col-span-2 text-sm text-status-blocked">
          {error}
        </div>
      )}
      <label htmlFor="builder-company-name" className="lf-body-sm font-medium text-lot-ink">
        <span id="builder-company-name-label">Company name</span> <span aria-hidden="true">*</span>
        <Input
          id="builder-company-name"
          name="builder-company-name"
          ref={(element) => { fields.current["builder-company-name"] = element; }}
          aria-labelledby="builder-company-name-label"
          aria-invalid={invalidField === "builder-company-name"}
          aria-describedby={invalidField === "builder-company-name" ? "builder-company-name-error" : undefined}
          type="text"
          autoComplete="organization"
          className="mt-1 w-full rounded-control border border-lot-stone bg-lot-chalk px-3 py-2 text-base sm:text-sm"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          aria-required="true"
        />
        {fieldError("builder-company-name")}
      </label>
      <label htmlFor="builder-contact-email" className="lf-body-sm font-medium text-lot-ink">
        <span id="builder-contact-email-label">Contact email</span> <span aria-hidden="true">*</span>
        <Input
          id="builder-contact-email"
          name="builder-contact-email"
          ref={(element) => { fields.current["builder-contact-email"] = element; }}
          aria-labelledby="builder-contact-email-label"
          aria-invalid={invalidField === "builder-contact-email"}
          aria-describedby={invalidField === "builder-contact-email" ? "builder-contact-email-error" : undefined}
          type="email"
          autoComplete="email"
          className="mt-1 w-full rounded-control border border-lot-stone bg-lot-chalk px-3 py-2 text-base sm:text-sm"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          aria-required="true"
        />
        {fieldError("builder-contact-email")}
      </label>
      <label htmlFor="builder-phone" className="lf-body-sm font-medium text-lot-ink">
        Phone (optional)
        <Input
          id="builder-phone"
          type="tel"
          autoComplete="tel"
          className="mt-1 w-full rounded-control border border-lot-stone bg-lot-chalk px-3 py-2 text-base sm:text-sm"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>
      <label htmlFor="builder-license" className="lf-body-sm font-medium text-lot-ink">
        License number (optional)
        <Input
          id="builder-license"
          type="text"
          className="mt-1 w-full rounded-control border border-lot-stone bg-lot-chalk px-3 py-2 text-base sm:text-sm"
          value={licenseNumber}
          onChange={(event) => setLicenseNumber(event.target.value)}
        />
      </label>
      <label className="lf-body-sm font-medium text-lot-ink">Coverage type
        <Select value={serviceScope} onChange={event => { setServiceScope(event.target.value as typeof serviceScope); setServiceAreaText(""); }} className="mt-1 text-base sm:text-sm">
          <option value="city">City</option><option value="county">County</option><option value="state">Entire state</option>
        </Select>
      </label>
      <label className="lf-body-sm font-medium text-lot-ink">Service state
        <Select id="builder-service-state" ref={element => { fields.current["builder-service-state"] = element; }} aria-invalid={invalidField === "builder-service-state"} aria-describedby={invalidField === "builder-service-state" ? "builder-service-state-error" : undefined} value={serviceState} onChange={event => setServiceState(event.target.value)} className="mt-1 text-base sm:text-sm">
          <option value="">Select a state</option>
          {Object.entries(US_STATE_NAMES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </Select>
        {fieldError("builder-service-state")}
      </label>
      <label
        htmlFor="builder-service-areas"
        className="lf-body-sm font-medium text-lot-ink md:col-span-2"
      >
        <span id="builder-service-areas-label">Service areas</span>
        <Input
          id="builder-service-areas"
          name="builder-service-areas"
          ref={(element) => { fields.current["builder-service-areas"] = element; }}
          aria-labelledby="builder-service-areas-label"
          aria-invalid={invalidField === "builder-service-areas"}
          aria-describedby={invalidField === "builder-service-areas" ? "builder-service-areas-error" : undefined}
          type="text"
          className="mt-1 w-full rounded-control border border-lot-stone bg-lot-chalk px-3 py-2 text-base sm:text-sm"
          placeholder={serviceScope === "county" ? "Los Angeles" : "Seattle"}
          disabled={serviceScope === "state"}
          value={serviceAreaText}
          onChange={(event) => setServiceAreaText(event.target.value)}
        />
        {fieldError("builder-service-areas")}
      </label>
      <div className="space-y-2 md:col-span-2">
        <p className="text-xs leading-5 text-lot-stone">Select a city, county, or entire state. County coverage includes its communities. Add each area separately.</p>
        <Button type="button" variant="secondary" disabled={!serviceState || (serviceScope !== "state" && !serviceAreaText.trim()) || addedAreas.length >= 25} onClick={() => {
          const area = normalizeServiceArea(serviceAreaText, serviceState, serviceScope);
          setAddedAreas(current => [...current.filter(item => item.key !== area.key), area]);
          setServiceAreaText(""); setServiceState("");
        }}>Add service area</Button>
        <ul className="space-y-1">{addedAreas.map(area => <li key={area.key} className="flex items-center justify-between gap-2 text-sm">
          <span>{area.scope === "state" ? "Entire state" : area.county ? `${area.county} County` : area.city}, {area.state}</span>
          <Button type="button" variant="secondary" size="sm" aria-label={`Remove ${area.county || area.city || area.state}`} onClick={() => setAddedAreas(current => current.filter(item => item.key !== area.key))}>Remove</Button>
        </li>)}</ul>
      </div>
      <label
        htmlFor="builder-active"
        className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-lot-stone md:col-span-2"
      >
        <input
          id="builder-active"
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-lot-ink"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Active for new matched requests
      </label>
      <Button
        type="submit"
        loading={isPending}
        className="min-h-11 rounded-control bg-lot-orange px-4 text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:bg-lot-orange-hover disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save builder profile"}
      </Button>
    </form>
  );
}
