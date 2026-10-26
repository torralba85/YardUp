"use client";

import { useEffect, useState } from "react";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";
import { fetchUnlockedContact } from "@/lib/marketplace-firestore";
import { migrateSavedScenario, type SavedScenario } from "@/lib/saved-scenarios";
import { stashInitialParcel } from "@/lib/parcel-handoff";

/** Firestore permits this read only for the owner or a builder holding an unlock. */
export default function LeadScenarioEntry({ requestId }: { requestId: string }) {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [state, setState] = useState<{ key: string; scenario?: SavedScenario; error?: string } | null>(null);
  const key = `${user?.uid ?? "guest"}:${requestId}`;
  useEffect(() => {
    if (!user || loading || state?.key === key) return;
    let cancelled = false;
    void fetchUnlockedContact(requestId).then(contact => {
      const raw = contact?.snapshot.studioScenarioJson;
      const scenario = raw ? migrateSavedScenario(JSON.parse(raw)) : null;
      if (!scenario) throw new Error("This request has no saved layout.");
      if (!cancelled) {
        if (scenario.liveParcel) stashInitialParcel(scenario.liveParcel);
        setState({ key, scenario });
      }
    }).catch(() => {
      if (!cancelled) setState({ key, error: "This layout is unavailable. Sign in with the account that owns or has unlocked this request." });
    });
    return () => { cancelled = true; };
  }, [user, loading, requestId, key, state]);
  if (user && state?.key === key && state.scenario) return <FeasibilityStudio key={key} initialScenario={state.scenario} demoChosen={!state.scenario.liveParcel} />;
  return <div className="flex min-h-[70dvh] items-center justify-center bg-lot-chalk p-6 text-lot-ink"><div className="max-w-md space-y-4">
    <p role={state?.key === key && state.error ? "alert" : "status"}>{!user && !loading ? "Sign in to open this shared builder layout." : state?.key === key && state.error ? state.error : "Opening the shared layout…"}</p>
    {!user && !loading && <Button onClick={() => setAuthOpen(true)}>Sign in</Button>}
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
  </div></div>;
}
