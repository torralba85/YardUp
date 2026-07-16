"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { DeleteAccountButton } from "@/components/studio/DeleteAccountButton";

const LINK_CLASS =
  "font-medium text-lf-clay underline decoration-lf-clay/40 underline-offset-4 hover:text-lf-mahogany";

/**
 * Interactive half of the public `/delete-account` resource. Signed-in users
 * complete deletion right here with the standard two-step confirmation;
 * signed-out visitors get sign-in and password-reset paths so the flow never
 * requires reinstalling an app.
 */
export function DeleteAccountPageClient() {
  const { user, profile, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) {
    return (
      <div role="status" aria-label="Checking your session" className="py-2">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-11 w-48 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="lf-body text-lf-muted">
          Sign in to delete your account. Deleting requires proving it&rsquo;s your
          account — that&rsquo;s the only step.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setAuthOpen(true)}>Sign in to continue</Button>
          <Link href="/forgot-password" className={LINK_CLASS}>
            Forgot your password?
          </Link>
        </div>
        <p className="lf-body-sm text-lf-muted">
          Can&rsquo;t access your sign-in email anymore? Contact{" "}
          <a href="mailto:support@lotfoundry.com" className={LINK_CLASS}>
            support@lotfoundry.com
          </a>{" "}
          from any address and we&rsquo;ll verify ownership another way.
        </p>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="lf-body text-lf-muted">
        You are signed in as{" "}
        <span className="font-mono text-sm text-lf-espresso">
          {profile?.email || user.email}
        </span>
        . Deleting is immediate and permanent.
      </p>
      <DeleteAccountButton surface="light" />
    </div>
  );
}
