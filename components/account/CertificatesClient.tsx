"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Award, ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { claimCertificatesByEmail } from "@/lib/certificate-checkout";
import { formatDollars } from "@/lib/intl-format";
import { Button } from "@/components/ui/Button";
import { Bezel } from "@/components/ui/Bezel";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { AccountMenu } from "@/components/account/AccountMenu";
import { SiteHeader } from "@/components/legal/SiteHeader";
import { PRIMARY_CTA_LABEL } from "@/lib/site-nav";
import {
  useUserPurchasedCertificates,
  formatCertKeyFallback,
  formatCertificateLocality,
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
  return formatDollars(Math.round(cents / 100));
}

export function CertificatesClient() {
  const { user, profile, loading: authLoading, logout, refreshProfile, sendVerification } = useAuth();
  const { certificates, loading: certsLoading, error, refresh } =
    useUserPurchasedCertificates(user?.uid);
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [checkingRecovery, setCheckingRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const claimedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !user.emailVerified) return;
    if (claimedUidRef.current === user.uid) return;
    claimedUidRef.current = user.uid;
    let cancelled = false;
    void (async () => {
      try {
        // Forced: a token minted before email verification still says
        // email_verified=false, and the claim route rejects it.
        const idToken = await user.getIdToken(true);
        const outcome = await claimCertificatesByEmail(idToken);
        if (!cancelled && (outcome.claimedCertKeys.length > 0 || outcome.alreadyOwnedCertKeys.length > 0)) {
          setRecoveredCount(outcome.claimedCertKeys.length);
          refresh();
        }
      } catch {
        if (!cancelled) setRecoveryError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, refresh, user, user?.emailVerified, recoveryAttempt]);

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
              className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink motion-safe:transition-colors hover:text-lot-ink hover:underline"
            >
              {PRIMARY_CTA_LABEL}
            </Link>
          }
        />

        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control border border-lot-line bg-lot-chalk">
            <Award className="h-6 w-6 text-lot-orange-ink" aria-hidden="true" />
          </div>
          <h1 className="lf-panel-heading mt-6 text-2xl sm:text-3xl">Certificates of Feasibility</h1>
          <p className="lf-body-sm mt-3 text-lot-ink">
            Sign in to view, download, and reopen unlocked certificates for your properties.
          </p>
          <p className="mt-3 border border-lot-line bg-lot-surface px-4 py-3 text-left text-xs leading-5 text-lot-ink">
            Purchased a certificate as a guest? Sign in or create a free account using the same email address from checkout and verify it to claim your certificate.
          </p>
          <div className="mt-6">
            <Link
              href="/login?next=/certificates"
              className="inline-flex h-11 w-full items-center justify-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-ink hover:bg-lot-orange-hover"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/signup?next=/certificates"
              className="inline-flex min-h-11 items-center text-sm font-medium text-lot-orange-ink underline underline-offset-4 hover:text-lot-ink"
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
              {PRIMARY_CTA_LABEL}
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
          <h1 className="lf-panel-heading mt-2 text-2xl sm:text-3xl">Certificates of Feasibility</h1>
          <p className="lf-body-sm mt-2 max-w-2xl text-lot-stone">
            Official feasibility records and verified property analyses unlocked for your lots.
            Every certificate remains unlocked permanently and can be reopened in the 3D Studio anytime.
          </p>
        </div>

        {recoveryError && (
          <div className="mt-6 border border-lot-line p-4">
            <p role="alert" className="text-sm text-lot-ink">Could not check for guest purchases. Your existing certificates are still available.</p>
            <Button type="button" variant="secondary" size="xs" className="mt-2" onClick={() => {
              claimedUidRef.current = null;
              setRecoveryError(false);
              setRecoveryAttempt((attempt) => attempt + 1);
            }}>Retry guest purchase recovery</Button>
          </div>
        )}

        {recoveredCount > 0 && (
          <p
            role="status"
            className="mt-6 rounded-none border border-status-eligible/30 bg-status-eligible-soft px-4 py-3 text-sm text-status-eligible"
          >
            Recovered {recoveredCount} guest {recoveredCount === 1 ? "certificate" : "certificates"} linked to your verified email.
          </p>
        )}

        {!certsLoading && !user.emailVerified && (
          <div className="mt-6 rounded-none border border-lot-line bg-lot-surface px-4 py-3 text-xs leading-5 text-lot-ink">
            <p>
              Purchased as a guest? Verify your email address ({user.email}) to recover any certificates bought with the same email.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {typeof sendVerification === "function" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  loading={verificationSending}
                  onClick={() => {
                    setVerificationSending(true);
                    setVerificationError(null);
                    void sendVerification()
                      .then(() => setVerificationSent(true))
                      .catch(() =>
                        setVerificationError("Could not send verification email. Try again."),
                      )
                      .finally(() => setVerificationSending(false));
                  }}
                >
                  {verificationSending
                    ? "Sending…"
                    : verificationSent
                      ? "Verification email sent"
                      : "Resend verification email"}
                </Button>
              )}
              {typeof refreshProfile === "function" && (
                <Button
                  type="button"
                  variant="commit"
                  size="xs"
                  loading={checkingRecovery}
                  onClick={() => {
                    setCheckingRecovery(true);
                    claimedUidRef.current = null;
                    void refreshProfile().finally(() => setCheckingRecovery(false));
                  }}
                >
                  I&apos;ve verified — check again
                </Button>
              )}
            </div>
            {verificationSent && (
              <p role="status" aria-live="polite" className="mt-2 text-xs text-status-eligible">
                Verification email sent. Check your inbox, then verify again.
              </p>
            )}
            {verificationError && (
              <p role="alert" className="mt-2 text-xs text-status-blocked">
                {verificationError}
              </p>
            )}
          </div>
        )}

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
              <ShieldCheck className="h-7 w-7 text-lot-stone" aria-hidden="true" />
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
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-lot-orange px-6 text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:bg-lot-orange-hover"
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
                  formatCertificateLocality(cert.city, cert.state, cert.zip) ?? fallback.subtitle;

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

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-lot-stone">
                          <span className="break-all tabular-nums" translate="no">
                            ID: #{cert.certKey}
                          </span>
                          <span aria-hidden="true">·</span>
                          {/* A $0 grant is an agent-pass certificate, not a sale. */}
                          <span>{cert.amount === 0 ? "Complimentary" : <>Amount: {formatPrice(cert.amount)}</>}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                        <Link
                          href={buildStudioUrlForCertificate(cert)}
                          prefetch={false}
                          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-lot-ink px-[19px] py-3 text-sm font-bold text-lot-chalk motion-safe:transition hover:bg-lot-ink-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 sm:w-auto"
                        >
                          Open in 3D Studio
                          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </Link>
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
