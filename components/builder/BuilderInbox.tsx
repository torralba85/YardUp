"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleSlash, Hammer, Mail, Phone } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "@/lib/feasibility";
import type { BuilderInboxItem, BuilderProfile } from "@/lib/marketplace-types";

export default function BuilderInbox({
  profile,
  items,
  onRespond,
}: {
  profile: BuilderProfile;
  items: BuilderInboxItem[];
  onRespond: (requestId: string, status: "interested" | "not-a-fit") => Promise<void>;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function respond(requestId: string, status: "interested" | "not-a-fit") {
    setPendingId(requestId);
    setError(null);
    startTransition(async () => {
      try {
        await onRespond(requestId, status);
      } catch {
        setError("Could not update this request.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="mt-6">
      <div className="rounded-md border border-lf-hairline bg-lf-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">{profile.companyName}</h2>
            <p className="mt-1 text-sm text-lf-muted">
              {profile.serviceAreas.map((area) => `${area.city}, ${area.state}`).join(" | ")}
            </p>
          </div>
          <span className="rounded-md border border-lf-hairline px-2 py-1 text-xs font-semibold text-lf-muted">
            {profile.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-lf-brick/20 bg-lf-brick/5 p-3 text-sm text-lf-brick">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-4 rounded-md border border-lf-hairline bg-lf-card p-6 text-sm text-lf-muted">
          No matched snapshots yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {items.map((item) => (
            <article
              key={item.request.id}
              className="rounded-md border border-lf-hairline bg-lf-card p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-lf-muted">
                    {statusLabel(item.response.status)}
                  </div>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-lf-espresso">
                    {item.request.snapshot.parcelAddress}
                  </h3>
                  <p className="mt-1 text-sm text-lf-muted">
                    {item.request.snapshot.parcelCity}, {item.request.snapshot.parcelState}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(item.request.id, "interested")}
                    disabled={isPending && pendingId === item.request.id}
                    className="flex h-9 items-center gap-1.5 rounded-md bg-lf-mahogany px-3 text-xs font-semibold text-lf-sand transition hover:bg-lf-espresso disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    Interested
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(item.request.id, "not-a-fit")}
                    disabled={isPending && pendingId === item.request.id}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-lf-hairline px-3 text-xs font-semibold text-lf-muted transition hover:bg-lf-sand-2 disabled:opacity-50"
                  >
                    <CircleSlash size={14} />
                    Not a fit
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <Metric label="ADU size" value={`${item.request.snapshot.result.aduSqft.toLocaleString()} sf`} />
                <Metric
                  label="Build range"
                  value={`${formatCompactCurrency(item.request.snapshot.result.costLow)}-${formatCompactCurrency(item.request.snapshot.result.costHigh)}`}
                />
                <Metric label="Monthly rent" value={formatCurrency(item.request.snapshot.result.monthlyRent)} />
                <Metric label="Zoning" value={item.request.snapshot.result.zoningStatus} />
              </div>

              <div className="mt-4 grid gap-4 border-t border-lf-hairline pt-4 text-sm md:grid-cols-2">
                <div>
                  <div className="font-semibold text-lf-espresso">Owner contact</div>
                  <div className="mt-2 space-y-1 text-lf-muted">
                    <div>{item.request.ownerContact.name}</div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} />
                      {item.request.ownerContact.email}
                    </div>
                    {item.request.ownerContact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        {item.request.ownerContact.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-lf-espresso">Project message</div>
                  <p className="mt-2 text-lf-muted">
                    {item.request.ownerContact.message || "No message submitted."}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-lf-muted">
                    <Hammer size={14} />
                    Status: {statusLabel(item.response.status)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-lf-hairline bg-lf-sand-2 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
        {label}
      </div>
      <div className="mt-1 font-semibold text-lf-espresso">{value}</div>
    </div>
  );
}

function statusLabel(status: BuilderInboxItem["response"]["status"]) {
  if (status === "interested") return "Interested";
  if (status === "not-a-fit") return "Not a fit";
  return "New";
}
