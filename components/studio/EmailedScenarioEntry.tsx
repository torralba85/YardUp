"use client";

import { useEffect, useState } from "react";
import FeasibilityStudio from "@/components/FeasibilityStudio";
import { parseEmailScenario } from "@/lib/scenario-email";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { stashInitialParcel } from "@/lib/parcel-handoff";
import { Button } from "@/components/ui/Button";

/** Resolve a shared snapshot before mounting Studio so guest limits/auth remounts never replace the lot. */
export default function EmailedScenarioEntry({ token }: { token: string }) {
  const [scenario, setScenario] = useState<SavedScenario | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/studio/scenario-link/${token}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Your layout could not be opened.");
        const parsed = parseEmailScenario(data.scenario);
        if (!parsed?.liveParcel) throw new Error("Your layout could not be opened.");
        if (controller.signal.aborted) return;
        stashInitialParcel(parsed.liveParcel);
        setScenario(parsed);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Your layout could not be opened.");
      }
    })();
    return () => controller.abort();
  }, [attempt, token]);
  if (scenario) return <FeasibilityStudio initialScenario={scenario} />;
  return <div className="flex min-h-[70dvh] items-center justify-center bg-lot-chalk p-6 text-lot-ink"><div className="max-w-md space-y-4"><p role={error ? "alert" : "status"}>{error || "Opening your saved 3D lot layout…"}</p>{error && <Button onClick={() => { setError(""); setAttempt((n) => n + 1); }}>Try again</Button>}</div></div>;
}
