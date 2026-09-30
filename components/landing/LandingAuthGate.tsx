"use client";

import { useEffect, useRef, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import type { AuthPromptSource } from "@/lib/analytics/events";

/** Props for {@link LandingAuthGate}. */
export interface LandingAuthGateProps {
  /** Called once, when a signed-in user is confirmed. */
  onAuthenticated: () => void;
  /** Called when the visitor dismisses the auth modal without signing in. */
  onDismiss: () => void;
  /** Mode to show when a session is not already present. */
  initialMode?: "sign-in" | "sign-up";
  /** Bounded reason for the prompt, used by conversion analytics and copy. */
  analyticsSource?: AuthPromptSource;
}

/**
 * Inner gate, rendered beneath its own {@link AuthProvider}.
 *
 * Resolves the current session, then either reports an authenticated visitor
 * upward or shows the appropriate auth modal. Renders nothing while Firebase is still
 * resolving, so a signed-in visitor never sees the modal flash.
 */
function Gate({
  onAuthenticated,
  onDismiss,
  initialMode = "sign-in",
  analyticsSource = "account_control",
}: LandingAuthGateProps) {
  const firedRef = useRef(false);
  // `AuthModal` closes itself on a *successful* sign-in, not just on cancel.
  // This gate owns the `AuthProvider` the modal reads from, so forwarding that
  // close to `onDismiss` would unmount the provider before
  // `onAuthStateChanged` delivers the new user — the visitor would sign in,
  // watch the modal vanish, and never be handed to the studio. Hide the modal
  // instead and stay mounted until the session actually lands.
  const [awaitingSession, setAwaitingSession] = useState(false);

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

  if (loading || user || awaitingSession) {
    return null;
  }

  return (
    <AuthModal
      isOpen
      initialMode={initialMode}
      analyticsSurface="landing"
      analyticsSource={analyticsSource}
      onClose={(reason) => {
        if (reason === "signed-in") {
          setAwaitingSession(true);
          return;
        }
        onDismiss();
      }}
    />
  );
}

/**
 * Sign-in gate for the marketing landing page, mounted only after a visitor
 * submits an address.
 *
 * The landing sits outside the `(firebase)` route group. This component owns
 * its provider and uses `next/dynamic` with `ssr: false` to keep authentication
 * out of prerender. The separate member navigation also resolves Firebase
 * client-side so returning members see their actual session on the landing.
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
