"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Bezel } from "@/components/ui/Bezel";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { AccountMenu } from "@/components/account/AccountMenu";
import { SiteHeader } from "@/components/legal/SiteHeader";
import {
  useUserPurchasedCertificates,
  formatCertKeyFallback,
  buildStudioUrlForCertificate,
} from "@/lib/purchased-certificates";

function formatDate(date: Date | null): string {
  if (!date) return "Recently unlocked";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function CertificatesClient() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logout } = useAuth();
  const { certificates, loading: certsLoading, error, refresh } =
    useUserPurchasedCertificates(user?.uid);

  const displayName = profile?.displayName || profile?.email?.split("@")[0] || "Member";
  const roleLabel = profile?.role === "builder" ? "Builder" : "Lot owner";

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-lot-chalk text-lot-ink">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center" aria-busy="true">
          <p className="lf-body-sm text-lot-stone">Loading your certificates…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-lot-chalk text-lot-ink">
        <SiteHeader
          actions={
            <Link
              href="/studio"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink"
            >
              Open studio
            </Link>
          }
        />

        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control border border-lot-line bg-lot-chalk">
            <Award className="h-6 w-6 text-lot-orange-ink" />
          </div>
          <h1 className="lf-section-heading mt-6">Certificates of Feasibility</h1>
          <p className="lf-body-sm mt-3 text-lot-stone">
            Sign in to view, download, and open unlocked certificates for your properties.
          </p>
          <div className="mt-8">
            <Link
              href="/login?next=/certificates"
              className="inline-flex h-11 w-full items-center justify-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-ink"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/signup?next=/certificates"
              className="text-sm font-medium text-lot-orange-ink"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-lot-chalk text-lot-ink">
      <SiteHeader
        actions={
          <>
            <Link
              href="/studio"
              className="hidden min-h-11 items-center text-sm font-semibold text-lot-orange-ink hover:underline sm:inline-flex"
            >
              Open 3D Studio
            </Link>
            <AccountMenu
              displayName={displayName}
              roleLabel={roleLabel}
              onSignOut={() => void logout()}
              tone="light"
            />
          </>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="border-b border-lot-line pb-6">
          <p className="lf-kicker-dense text-lot-stone">RECORDS · UNLOCKED PROPERTIES</p>
          <h1 className="lf-section-heading mt-2">Certificates of Feasibility</h1>
          <p className="lf-body-sm mt-2 max-w-2xl text-lot-stone">
            Official feasibility records and verified property analyses unlocked for your lots.
            Every certificate remains unlocked permanently and can be reopened in the 3D Studio anytime.
          </p>
        </div>

        {certsLoading ? (
          <div className="space-y-4 py-12" role="status" aria-busy="true">
            <span className="sr-only">Loading certificates…</span>
            <Skeleton className="h-32 border border-lot-line" />
            <Skeleton className="h-32 border border-lot-line" />
          </div>
        ) : error ? (
          <div className="my-8 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-6 text-center">
            <p role="alert" className="flex items-center justify-center gap-2 text-sm text-status-blocked">
              <TriangleAlert size={16} className="shrink-0" aria-hidden="true" />
              {error}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              className="mt-4"
            >
              Try again
            </Button>
          </div>
        ) : certificates.length === 0 ? (
          <div className="my-10 rounded-none border border-dashed border-lot-line bg-lot-chalk p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-control border border-lot-line bg-lot-chalk">
              <ShieldCheck className="h-7 w-7 text-lot-stone" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-lot-ink">
              No certificates unlocked yet
            </h2>
            <p className="lf-body-sm mx-auto mt-2 max-w-md text-lot-stone">
              When you evaluate a property in the 3D Studio and unlock its Certificate of
              Feasibility, it will appear here. Certificates include property records, zoning
              conformance, site fit analysis, and AI project briefs.
            </p>
            <div className="mt-6">
              <Link
                href="/studio"
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-lot-orange px-6 text-sm font-semibold text-lot-ink"
              >
                Explore 3D Studio
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <p className="lf-kicker-dense text-lot-stone">
              {certificates.length} {certificates.length === 1 ? "Certificate" : "Certificates"} Unlocked
            </p>

            <div className="grid gap-6">
              {certificates.map((cert) => {
                const fallback = formatCertKeyFallback(cert.certKey);
                const title = cert.parcelName || cert.address || fallback.title;
                const subtitle =
                  cert.city && cert.state
                    ? `${cert.city}, ${cert.state}${cert.zip ? ` ${cert.zip}` : ""}`
                    : cert.city
                      ? `${cert.city}${cert.zip ? ` ${cert.zip}` : ""}`
                      : fallback.subtitle;

                return (
                  <Bezel key={cert.id}>
                    <div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip status="clear" label="Unlocked" />
                          <span className="text-xs text-lot-stone">
                            {formatDate(cert.createdAt)}
                          </span>
                          {cert.demo && (
                            <span className="rounded-none bg-lot-surface px-1.5 py-0.5 text-[11px] font-medium text-lot-stone">
                              Demo
                            </span>
                          )}
                        </div>

                        <div>
                          <h2 className="text-lg font-semibold text-lot-ink">
                            {title}
                          </h2>
                          {subtitle && (
                            <p className="lf-body-sm text-lot-stone">{subtitle}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-1 text-xs text-lot-stone">
                          <span className="tabular-nums">ID: #{cert.certKey}</span>
                          <span>·</span>
                          {/* A $0 grant is an agent-pass certificate, not a sale. */}
                          <span>{cert.amount === 0 ? "Complimentary" : <>Amount: {formatPrice(cert.amount)}</>}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                          variant="commit"
                          size="md"
                          onClick={() => {
                            const url = buildStudioUrlForCertificate(cert);
                            router.push(url);
                          }}
                          className="w-full sm:w-auto"
                        >
                          Open in 3D Studio
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Bezel>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
