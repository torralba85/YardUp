"use client";

import { useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";

/** Props for {@link LandingAuthGate}. */
export interface LandingAuthGateProps {
  /** Called once, when a signed-in user is confirmed. */
  onAuthenticated: () => void;
  /** Called when the visitor dismisses the sign-in modal without signing in. */
  onDismiss: () => void;
}

/**
 * Inner gate, rendered beneath its own {@link AuthProvider}.
 *
 * Resolves the current session, then either reports an authenticated visitor
 * upward or shows the sign-in modal. Renders nothing while Firebase is still
 * resolving, so a signed-in visitor never sees the modal flash.
 */
function Gate({ onAuthenticated, onDismiss }: LandingAuthGateProps) {
  const firedRef = useRef(false);

  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || firedRef.current) {
      return;
    }
    // Latch: `onAuthenticated` navigates, and the provider can re-render with
    // a fresh profile before the route changes. Fire the handoff exactly once.
    firedRef.current = true;
    onAuthenticated();
  }, [loading, user, onAuthenticated]);

  if (loading || user) {
    return null;
  }

  return <AuthModal isOpen onClose={onDismiss} />;
}

/**
 * Sign-in gate for the marketing landing page, mounted only after a visitor
 * submits an address.
 *
 * The landing page sits outside the `(firebase)` route group precisely so it
 * never ships the ~479 KB Firebase client SDK (see `app/(firebase)/layout.tsx`).
 * This component carries its own {@link AuthProvider} and is loaded through
 * `next/dynamic` with `ssr: false`, so both the provider and the SDK stay out
 * of the landing bundle and out of the prerender until the visitor acts.
 *
 * @param props - The {@link LandingAuthGateProps}.
 */
export default function LandingAuthGate(props: LandingAuthGateProps) {
  return (
    <AuthProvider>
      <Gate {...props} />
    </AuthProvider>
  );
}
