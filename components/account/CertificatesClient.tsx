"use client";

import { BrandLockup } from "@/components/ui/BrandLockup";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Bezel } from "@/components/ui/Bezel";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { AccountMenu } from "@/components/account/AccountMenu";
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
      <div className="mx-auto max-w-3xl px-4 py-20 text-center" aria-busy="true">
        <p className="lf-body-sm text-lf-muted">Loading your certificates…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-lf-sand text-lf-espresso">
        <header className="border-b border-lf-hairline bg-lf-card">
          <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="shrink-0" aria-label="LotFoundry home">
              <BrandLockup className="h-7 w-auto" />
            </Link>
            <Link
              href="/studio"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-lf-clay-ink"
            >
              Open studio
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[3px] border border-lf-hairline bg-lf-card">
            <Award className="h-6 w-6 text-lf-clay-ink" />
          </div>
          <h1 className="lf-section-heading mt-6">Certificates of Feasibility</h1>
          <p className="lf-body-sm mt-3 text-lf-muted">
            Sign in to view, download, and open unlocked certificates for your properties.
          </p>
          <div className="mt-8">
            <Link
              href="/login?next=/certificates"
              className="inline-flex h-11 w-full items-center justify-center rounded-[3px] bg-lf-clay px-5 text-sm font-semibold text-lf-primary-label"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/signup?next=/certificates"
              className="text-sm font-medium text-lf-clay-ink"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-lf-sand text-lf-espresso">
      <header className="border-b border-lf-hairline bg-lf-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="LotFoundry home">
            <BrandLockup className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/studio"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-lf-clay-ink hover:underline"
            >
              Open 3D Studio
            </Link>
            <AccountMenu
              displayName={displayName}
              roleLabel={roleLabel}
              onSignOut={() => void logout()}
              tone="light"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="border-b border-lf-hairline pb-6">
          <p className="lf-kicker-dense text-lf-muted">RECORDS · UNLOCKED PROPERTIES</p>
          <h1 className="lf-section-heading mt-2">Certificates of Feasibility</h1>
          <p className="lf-body-sm mt-2 max-w-2xl text-lf-muted">
            Official feasibility records and verified property analyses unlocked for your lots.
            Every certificate remains unlocked permanently and can be reopened in the 3D Studio anytime.
          </p>
        </div>

        {certsLoading ? (
          <div className="space-y-4 py-12" role="status" aria-busy="true">
            <span className="sr-only">Loading certificates…</span>
            <Skeleton className="h-32 border border-lf-hairline" />
            <Skeleton className="h-32 border border-lf-hairline" />
          </div>
        ) : error ? (
          <div className="my-8 rounded-none border border-lf-brick/40 bg-lf-brick-soft p-6 text-center">
            <p role="alert" className="flex items-center justify-center gap-2 text-sm text-lf-brick">
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
          <div className="my-10 rounded-none border border-dashed border-lf-hairline bg-lf-card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[3px] border border-lf-hairline bg-lf-sand">
              <ShieldCheck className="h-7 w-7 text-lf-muted" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-lf-espresso">
              No certificates unlocked yet
            </h2>
            <p className="lf-body-sm mx-auto mt-2 max-w-md text-lf-muted">
              When you evaluate a property in the 3D Studio and unlock its Certificate of
              Feasibility, it will appear here. Certificates include property records, zoning
              conformance, site fit analysis, and AI project briefs.
            </p>
            <div className="mt-6">
              <Link
                href="/studio"
                className="inline-flex min-h-11 items-center justify-center rounded-[3px] bg-lf-clay px-6 text-sm font-semibold text-lf-primary-label"
              >
                Explore 3D Studio
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <p className="lf-kicker-dense text-lf-muted">
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
                          <span className="text-xs text-lf-muted">
                            {formatDate(cert.createdAt)}
                          </span>
                          {cert.demo && (
                            <span className="rounded-none bg-lf-sand-2 px-1.5 py-0.5 text-[11px] font-medium text-lf-muted">
                              Demo
                            </span>
                          )}
                        </div>

                        <div>
                          <h2 className="text-lg font-semibold text-lf-espresso">
                            {title}
                          </h2>
                          {subtitle && (
                            <p className="lf-body-sm text-lf-muted">{subtitle}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-1 text-xs text-lf-muted">
                          <span className="tabular-nums">ID: #{cert.certKey}</span>
                          <span>·</span>
                          <span>Amount: {formatPrice(cert.amount)}</span>
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
