"use client";

import Link from "next/link";
import { useRef } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import styles from "./lot-more/LotMoreLanding.module.css";

/**
 * Landing header account control.
 *
 * Guests get the `Sign in` link and nothing else: the member destinations only
 * appear once Firebase has resolved a real session, so the landing never
 * advertises a Studio or builder dashboard the visitor cannot open. A stale
 * session hint lands here too, and resolves to the same guest link.
 */
export function MemberNav() {
  const { user, profile, loading, logout } = useAuth();
  const details = useRef<HTMLDetailsElement>(null);
  if (loading) return <span className={styles.signIn} role="status" aria-label="Loading account">…</span>;
  if (!user) return <Link href="/login" prefetch={false} className={styles.signIn}>Sign in</Link>;

  return (
    <details ref={details} className={styles.memberNav} onKeyDown={(event) => {
      if (event.key === "Escape" && details.current) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    }}>
      <summary className={styles.signIn}>Account</summary>
      <nav aria-label="Member navigation" className={styles.memberPanel} onClick={() => {
        if (details.current) details.current.open = false;
      }}>
        <Link href="/studio" prefetch={false}>Open Studio</Link>
        {profile?.role === "builder" && <Link href="/builder" prefetch={false}>Builder dashboard</Link>}
        <Link href="/settings" prefetch={false}>Settings</Link>
        <Link href="/help" prefetch={false}>Get help</Link>
        <button type="button" onClick={() => void logout()}>Sign out</button>
      </nav>
    </details>
  );
}

/**
 * Client-only auth island: the public route remains outside the Firebase
 * layout, and the landing mounts this only for a browser that has signed in
 * before (see `lib/member-session-hint.ts`), so a signed-out visit never pays
 * for the SDK this provider pulls in.
 */
export default function LandingMemberNav() {
  return <AuthProvider><MemberNav /></AuthProvider>;
}
