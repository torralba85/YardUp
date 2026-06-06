"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, CircleCheck, Clock3, Hammer } from "lucide-react";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  formatCompactCurrency,
  formatCurrency,
  getParcelById,
  parcelPresets,
  type ADUConfig,
  type FinancialAssumptions,
} from "@/lib/feasibility";
import { buildReportCsv, buildReportText, downloadBlob } from "@/lib/report";
import {
  parseScenarioParams,
  serializeScenarioParams,
} from "@/lib/scenario-url";
import {
  createSavedScenarioStore,
  type SavedScenario,
} from "@/lib/saved-scenarios";
import { useAuth } from "@/lib/auth-context";
import { getMatchedBuilders } from "@/lib/marketplace";
import {
  createConnectionRequest,
  fetchActiveBuilders,
} from "@/lib/marketplace-firestore";
import {
  fetchSavedScenarios,
  saveSavedScenario,
  deleteSavedScenario,
} from "@/lib/scenarios-firestore";
import { ParcelProvider, useParcel } from "@/lib/parcel-context";
import AppShell from "./studio/AppShell";
import AerialView from "./studio/AerialView";
import FeasibilityInspector from "./studio/FeasibilityInspector";
import MetricsSummary from "./studio/MetricsSummary";
import ReportPreview from "./studio/ReportPreview";
import BuilderLeadPanel, {
  type BuilderLeadSubmitInput,
} from "./studio/BuilderLeadPanel";
import type { FeasibilityResult } from "./studio/types";
import PermitGuidePanel from "./studio/PermitGuidePanel";
import InspirationGalleryPanel from "./studio/InspirationGalleryPanel";
import { configForFootprint } from "@/lib/feasibility";
import { useCountUp } from "./studio/use-count-up";

const ParcelScene = dynamic(() => import("./ParcelScene"), {
  ssr: false,
  loading: () => (
    <div
      className="relative h-full min-h-[460px] overflow-hidden bg-lf-espresso"
      aria-label="Loading parcel scene"
      role="status"
    >
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 18%, rgba(242,229,213,0.07), transparent 38%), linear-gradient(150deg, rgba(89,42,15,0.45) 0%, rgba(38,19,7,0.95) 60%)",
        }}
      />
      <div className="absolute left-5 bottom-5 right-5 flex flex-col gap-3">
        <div className="h-3 w-32 animate-pulse rounded bg-lf-taupe/15" />
        <div className="h-2.5 w-56 animate-pulse rounded bg-lf-taupe/10" />
      </div>
    </div>
  ),
});

export default function FeasibilityStudio() {
  const initialPreset = parcelPresets[0];
  return (
    <ParcelProvider initialPreset={initialPreset}>
      <FeasibilityStudioInner />
    </ParcelProvider>
  );
}

function FeasibilityStudioInner() {
  const { user } = useAuth();
  const { parcel: liveParcel, parcelMode } = useParcel();
  const [parcelId, setParcelId] = useState(parcelPresets[0].id);
  const [config, setConfig] = useState<ADUConfig>(defaultAduConfig);
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(
    defaultFinancialAssumptions,
  );
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("studio");
  const [reportAutoFocus, setReportAutoFocus] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [savingScenario, setSavingScenario] = useState(false);
  const [builderLeadOpen, setBuilderLeadOpen] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

  // Load saved scenarios: Firestore for authenticated users, localStorage for guests
  useEffect(() => {
    let cancelled = false;
    if (user) {
      fetchSavedScenarios(user.uid).then((scenarios) => {
        if (!cancelled) setSavedScenarios(scenarios);
      }).catch(() => {
        if (!cancelled) setSavedScenarios([]);
      });
    } else if (typeof window !== "undefined") {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setSavedScenarios(createSavedScenarioStore(window.localStorage).list());
        }
      });
    }
    return () => { cancelled = true; };
  }, [user]);

  const presetParcel = getParcelById(parcelId);
  // Use live parcel data when available, otherwise the preset
  const activeParcel = parcelMode === "live" ? liveParcel : presetParcel;
  const expectedRent = "expectedRent" in activeParcel ? activeParcel.expectedRent : undefined;
  const result = useMemo(
    () => calculateFeasibility(activeParcel, config, assumptions, expectedRent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assumptions, config, activeParcel],
  );
  const isCompliant = result.zoningStatus === "Compliant";

  // Deliberate post-hydration sync from URL: server renders defaults so the
  // static HTML matches first client paint; we then apply URL state once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const parsed = parseScenarioParams(params);
    if (parsed.parcelId) setParcelId(parsed.parcelId);
    if (parsed.config) setConfig(parsed.config);
    if (parsed.assumptions) setAssumptions(parsed.assumptions);
    setHydratedFromUrl(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydratedFromUrl || typeof window === "undefined") return;
    const serialized = serializeScenarioParams({ parcelId, config, assumptions });
    const next = `${window.location.pathname}?${serialized}`;
    window.history.replaceState(null, "", next);
  }, [assumptions, config, hydratedFromUrl, parcelId]);

  function resetScenario() {
    setParcelId(parcelPresets[0].id);
    setConfig(defaultAduConfig);
    setAssumptions(defaultFinancialAssumptions);
    setReportOpen(false);
    setBuilderLeadOpen(false);
    setActiveNav("studio");
    setReportAutoFocus(false);
  }

  function handleNavigate(id: string) {
    setActiveNav(id);
    if (id === "export") {
      setReportOpen(true);
    }
  }

  function handleGenerateReport() {
    setReportOpen(true);
    setReportAutoFocus(true);
  }

  async function handleSaveScenario() {
    if (typeof window === "undefined") return;
    if (savingScenario) return;

    const entry = {
      name: `${activeParcel.address} - ${config.footprint} sf`,
      parcelId,
      config,
      assumptions,
    };

    setSavingScenario(true);
    setSaveNotice(null);
    try {
      if (user) {
        const created = await saveSavedScenario(user.uid, entry);
        setSavedScenarios((prev) => [created, ...prev]);
      } else {
        const store = createSavedScenarioStore(window.localStorage);
        store.save(entry);
        setSavedScenarios(store.list());
      }
      setSaveNotice("Saved");
    } catch {
      setSaveNotice("Save failed");
    } finally {
      setSavingScenario(false);
      setTimeout(() => setSaveNotice(null), 2000);
    }
  }

  function handleLoadScenario(id: string) {
    if (typeof window === "undefined") return;
    let scenario: SavedScenario | undefined;
    if (user) {
      scenario = savedScenarios.find((s) => s.id === id);
    } else {
      const store = createSavedScenarioStore(window.localStorage);
      scenario = store.load(id);
    }
    if (!scenario) return;
    setParcelId(scenario.parcelId);
    setConfig(scenario.config);
    setAssumptions(scenario.assumptions);
  }

  async function handleDeleteScenario(id: string) {
    if (typeof window === "undefined") return;
    try {
      if (user) {
        await deleteSavedScenario(user.uid, id);
        setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
      } else {
        const store = createSavedScenarioStore(window.localStorage);
        store.remove(id);
        setSavedScenarios(store.list());
      }
    } catch {
      setDeleteNotice("Delete failed");
      setTimeout(() => setDeleteNotice(null), 2000);
    }
  }

  async function handleShareLink() {
    if (typeof window === "undefined") return;
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      setShareNotice("Link copied");
    } catch {
      setShareNotice(href);
    }
    setTimeout(() => setShareNotice(null), 2500);
  }

  async function handleBuilderLeadSubmit(input: BuilderLeadSubmitInput) {
    if (!user) {
      throw new Error("Sign in before connecting with builders.");
    }

    const builders = await fetchActiveBuilders();
    const matchedBuilders = getMatchedBuilders(
      builders,
      `${input.snapshot.parcelCity}, ${input.snapshot.parcelState}`,
    );

    if (matchedBuilders.length === 0) {
      throw new Error("No local builders are registered for this area yet.");
    }

    await createConnectionRequest({
      ownerUid: user.uid,
      ownerContact: input.contact,
      snapshot: input.snapshot,
      matchedBuilderIds: matchedBuilders.map((builder) => builder.id),
    });

    return { matchedCount: matchedBuilders.length };
  }

  function downloadReport() {
    const text = buildReportText({ parcel: activeParcel, config, result });
    downloadBlob("lotfoundry-concept-feasibility-report.txt", text, "text/plain");
  }

  function exportCsv() {
    const csv = buildReportCsv({ parcel: activeParcel, config, result });
    downloadBlob("lotfoundry-concept-feasibility-report.csv", csv, "text/csv");
  }

  return (
    <AppShell
      activeNav={activeNav}
      parcelAddress={activeParcel.address}
      parcelCity={activeParcel.city}
      onNavigate={handleNavigate}
      onReset={resetScenario}
      savedScenarios={savedScenarios}
      onLoadScenario={handleLoadScenario}
      onDeleteScenario={handleDeleteScenario}
      deleteNotice={deleteNotice}
    >
      <div className="flex flex-col lg:flex-1 lg:min-h-0 xl:flex-row">
        <section
          aria-label="Parcel massing scene"
          className="lf-entrance relative min-h-[440px] md:min-h-[480px] flex-1 overflow-hidden border-b border-lf-hairline bg-lf-espresso xl:min-h-0 xl:border-b-0 xl:border-r"
        >
          <IncomeLens result={result} isCompliant={isCompliant} />
          {parcelMode === "live" && "lat" in activeParcel ? (
            <AerialView
              parcel={activeParcel as import("@/lib/parcel-types").LiveParcelData}
              config={config}
              isCompliant={isCompliant}
            />
          ) : (
            <ParcelScene
              parcel={presetParcel}
              config={config}
              result={result}
              isCompliant={isCompliant}
            />
          )}
        </section>

        {activeNav === "guide" ? (
          <PermitGuidePanel address={activeParcel.address} />
        ) : activeNav === "inspiration" ? (
          <InspirationGalleryPanel
            onApply={(item) => {
              const baseConfig = configForFootprint(item.sqft, config);
              setConfig({
                ...baseConfig,
                width: item.width,
                length: item.length,
                roof: item.roof,
                finish: item.finish,
              });
              setActiveNav("studio");
            }}
          />
        ) : (
          <FeasibilityInspector
            parcelId={parcelId}
            config={config}
            assumptions={assumptions}
            result={result}
            onParcelChange={setParcelId}
            onConfigChange={setConfig}
            onAssumptionsChange={setAssumptions}
            onReset={resetScenario}
            onGenerateReport={handleGenerateReport}
            onSaveScenario={handleSaveScenario}
            savingScenario={savingScenario}
            saveNotice={saveNotice}
          />
        )}
      </div>

      <div className="lf-entrance lf-entrance-delay-1">
        <MetricsSummary result={result} />
      </div>
      {reportOpen && (
        <ReportPreview
          parcelName={`${activeParcel.address}, ${activeParcel.city}`}
          result={result}
          onClose={() => setReportOpen(false)}
          onDownload={downloadReport}
          onExportCsv={exportCsv}
          onShare={handleShareLink}
          onConnectBuilders={() => setBuilderLeadOpen(true)}
          shareNotice={shareNotice}
          autoFocus={reportAutoFocus}
        />
      )}
      <BuilderLeadPanel
        open={builderLeadOpen}
        userDefaults={{
          name: user?.displayName || "",
          email: user?.email || "",
        }}
        parcelKey={parcelId}
        parcel={activeParcel}
        config={config}
        assumptions={assumptions}
        result={result}
        onClose={() => setBuilderLeadOpen(false)}
        onSubmit={handleBuilderLeadSubmit}
      />
    </AppShell>
  );
}

function IncomeLens({
  result,
  isCompliant,
}: {
  result: FeasibilityResult;
  isCompliant: boolean;
}) {
  const rent = useCountUp(result.monthlyRent);
  const noi = useCountUp(result.annualNoi);
  return (
    <div className="pointer-events-none absolute left-4 right-16 top-4 z-30 max-w-[760px] rounded-md border border-lf-taupe/25 bg-lf-espresso/90 p-4 text-lf-sand-2 shadow-lg sm:left-5 sm:right-auto sm:min-w-[520px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-lf-taupe">
            ADU income potential
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-lf-sand tabular-nums sm:text-5xl sm:leading-[0.95] md:text-6xl">
            {formatCurrency(rent)}
            <span className="ml-2 font-sans text-base font-medium tracking-normal text-lf-sand/70 pl-1.5">/ mo rent</span>
          </h2>
          {/* Gold-leaf value hairline mirrors the MetricsSummary lead cells. */}
          <span aria-hidden className="mt-2 block h-px w-16 bg-lf-amber" />
        </div>
        <div
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            isCompliant
              ? "border-lf-forest bg-lf-forest text-lf-sand"
              : "border-lf-clay bg-lf-clay text-lf-sand"
          }`}
        >
          {result.zoningStatus}
        </div>
      </div>

      <div className="mt-4 hidden sm:grid sm:gap-2 sm:grid-cols-3">
        <LensFact
          icon={BadgeDollarSign}
          label="Annual NOI"
          value={formatCurrency(noi)}
          fontClass="font-display text-white text-2xl"
        />
        <LensFact
          icon={Clock3}
          label="Payback"
          value={`${result.paybackYears} yrs`}
          fontClass="font-display text-white text-2xl"
        />
        <LensFact
          icon={Hammer}
          label="Build range"
          value={`${formatCompactCurrency(result.costLow)}-${formatCompactCurrency(result.costHigh)}`}
          fontClass="font-mono text-base mt-1.5 text-lf-sand-2"
        />
      </div>

      <div className="mt-3 hidden items-start gap-2 text-xs leading-5 text-lf-taupe sm:flex">
        <CircleCheck size={15} className="mt-0.5 shrink-0 text-lf-clay" />
        Estimate updates as you change parcel, size, finish, and rent assumptions.
      </div>
    </div>
  );
}

function LensFact({
  icon: Icon,
  label,
  value,
  fontClass = "font-display text-white text-xl",
}: {
  icon: typeof BadgeDollarSign;
  label: string;
  value: string;
  fontClass?: string;
}) {
  return (
    <div className="rounded-md border border-lf-taupe/15 bg-lf-sand-2/[0.08] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-lf-taupe">
        <Icon size={14} />
        {label}
      </div>
      <div className={`mt-1 font-semibold tracking-tight ${fontClass}`}>{value}</div>
    </div>
  );
}
