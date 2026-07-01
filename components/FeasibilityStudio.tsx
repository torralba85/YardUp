"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
  type ADUConfig,
  type FinancialAssumptions,
} from "@/lib/feasibility";
import { buildReportCsv, buildReportHtml, downloadBlob } from "@/lib/report";
import {
  mergeScenarioPartial,
  parseScenarioParams,
  serializeScenarioParams,
} from "@/lib/scenario-url";
import type { SavedScenario } from "@/lib/saved-scenarios";
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
import { consumeAddressQuery } from "@/lib/address-handoff";
import AppShell from "./studio/AppShell";
import AerialView from "./studio/AerialView";
import FeasibilityInspector from "./studio/FeasibilityInspector";
import MetricsSummary from "./studio/MetricsSummary";
import ReportPreview from "./studio/ReportPreview";
import EstimateSummaryPanel from "./studio/EstimateSummaryPanel";
import BuilderLeadPanel, {
  type BuilderLeadSubmitInput,
} from "./studio/BuilderLeadPanel";
import PermitGuidePanel from "./studio/PermitGuidePanel";
import InspirationGalleryPanel from "./studio/InspirationGalleryPanel";
import AIPropertyInsightsPanel from "./studio/AIPropertyInsightsPanel";
import BeforeAfterBoard from "./studio/BeforeAfterBoard";
import type { InspirationItem } from "@/lib/inspiration-data";
import { configForFootprint } from "@/lib/feasibility";
import { useMediaQuery } from "@/lib/use-media-query";
import { markWizardSeen, shouldShowWizard } from "@/lib/wizard-state";
import MobileStudio from "./studio/mobile/MobileStudio";
import MobileHeader from "./studio/mobile/MobileHeader";
import PeekMetrics from "./studio/mobile/PeekMetrics";
import WizardFlow from "./studio/mobile/WizardFlow";
// ── Redesign: feasibility-verdict-led studio ────────────────────────────────
import FeasibilityVerdictBand from "./studio/FeasibilityVerdictBand";
import ConstraintsPanel from "./studio/ConstraintsPanel";
import StudioTabBar, { type StudioTab } from "./studio/StudioTabBar";

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

/**
 * Top-level studio orchestrator. Owns the active parcel/config/assumptions
 * state, keeps it in sync with the shareable URL ({@link parseScenarioParams} /
 * {@link serializeScenarioParams}), runs {@link calculateFeasibility} on every
 * change, and wires up reports, saved scenarios, and the connect-with-builders
 * flow. Renders the desktop {@link AppShell} or the mobile studio shell.
 */
export default function FeasibilityStudio() {
  const initialPreset = parcelPresets[0];
  return (
    <ParcelProvider initialPreset={initialPreset}>
      <FeasibilityStudioInner />
    </ParcelProvider>
  );
}

function FeasibilityStudioInner() {
  const { user, loading: authLoading } = useAuth();
  const { parcel: liveParcel, parcelMode, parcelError, searchParcel, searchByAddress, resetToPreset, restoreLiveParcel } = useParcel();
  const [parcelId, setParcelId] = useState(parcelPresets[0].id);
  const [config, setConfig] = useState<ADUConfig>(defaultAduConfig);
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(
    defaultFinancialAssumptions,
  );
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const [pendingAddressQuery, setPendingAddressQuery] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("studio");
  // Redesign: in-studio tabs (Feasibility / Massing / Certificate).
  const [studioTab, setStudioTab] = useState<StudioTab>("feasibility");
  // Bumped by the sidebar "Change address" action to focus the studio search.
  const [addressFocusSignal, setAddressFocusSignal] = useState(0);
  const [reportAutoFocus, setReportAutoFocus] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [savingScenario, setSavingScenario] = useState(false);
  const [builderLeadOpen, setBuilderLeadOpen] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);

  const [generatedConcepts, setGeneratedConcepts] = useState<InspirationItem[]>([]);
  const [activeConcept, setActiveConcept] = useState<InspirationItem | null>(null);
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [styleMatchKey, setStyleMatchKey] = useState(0);

  const handleGenerationComplete = (concept: {
    photoUrl: string;
    conceptUrl: string;
    styleName: string;
    matchPercentage: number;
    traits: string[];
  }) => {
    const newConcept: InspirationItem = {
      id: `style-match-${Date.now()}`,
      title: `Matched ${concept.styleName} Concept`,
      style: concept.styleName,
      sqft: 600,
      width: 20,
      length: 30,
      roof: "gable",
      finish: "lap",
      tags: ["style-matched", concept.styleName.toLowerCase()],
      summary: `A custom ADU concept style-matched to your home (${concept.matchPercentage}% match).`,
      budgetBand: "$250k - $400k",
      imagePath: concept.conceptUrl,
      isStyleMatched: true,
      photoUrl: concept.photoUrl,
      matchPercentage: concept.matchPercentage,
      traits: concept.traits,
      isAttached: false,
    };
    setGeneratedConcepts((prev) => [newConcept, ...prev]);
    setActiveConcept(newConcept);
    setIsBoardOpen(true);
  };

  const handleToggleAttach = (id: string) => {
    setGeneratedConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isAttached: !c.isAttached } : c))
    );
    setActiveConcept((prev) =>
      prev && prev.id === id ? { ...prev, isAttached: !prev.isAttached } : prev
    );
  };

  const handleRecast = () => {
    setIsBoardOpen(false);
    setStyleMatchKey((prev) => prev + 1);
  };

  const handleDeleteConcept = (id: string) => {
    setGeneratedConcepts((prev) => prev.filter((c) => c.id !== id));
    if (activeConcept?.id === id) {
      setActiveConcept(null);
      setIsBoardOpen(false);
    }
    setStyleMatchKey((prev) => prev + 1);
  };

  const handleViewComparison = (item: InspirationItem) => {
    setActiveConcept(item);
    setIsBoardOpen(true);
  };

  // Load saved scenarios only for authenticated users. Guests should never see
  // or persist prior address state.
  useEffect(() => {
    let cancelled = false;
    if (user) {
      fetchSavedScenarios(user.uid).then((scenarios) => {
        if (!cancelled) setSavedScenarios(scenarios);
      }).catch(() => {
        if (!cancelled) setSavedScenarios([]);
      });
    } else {
      Promise.resolve().then(() => {
        if (!cancelled) setSavedScenarios([]);
      });
    }
    return () => { cancelled = true; };
  }, [user]);

  const presetParcel = getParcelById(parcelId);
  // Context parcel covers both live (Regrid) and estimated (wizard) modes.
  const activeParcel = parcelMode === "preset" ? presetParcel : liveParcel;
  // Estimated parcels have no 3D geometry of their own — render the base
  // preset's lot in the scene while the metrics use the estimated parcel.
  const sceneParcel =
    parcelMode === "estimated" && "basePresetId" in activeParcel
      ? getParcelById(activeParcel.basePresetId)
      : presetParcel;
  const expectedRent = "expectedRent" in activeParcel ? activeParcel.expectedRent : undefined;
  const result = useMemo(
    () => calculateFeasibility(activeParcel, config, assumptions, expectedRent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assumptions, config, activeParcel],
  );
  const isCompliant = result.zoningStatus === "Compliant";

  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const [wizardOpen, setWizardOpen] = useState(false);

  // First-run wizard decision — mount-only, before the URL-write effect adds
  // scenario params, mirroring the existing post-hydration URL sync pattern.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return; // desktop never sees the wizard
    const hasUrlScenario = window.location.search.length > 1;
    setWizardOpen(shouldShowWizard({ hasUrlScenario, storage: window.localStorage }));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleWizardComplete(nextConfig?: ADUConfig) {
    if (nextConfig) setConfig(nextConfig);
    markWizardSeen(window.localStorage);
    setWizardOpen(false);
  }

  // Deliberate post-hydration sync from URL: server renders defaults so the
  // static HTML matches first client paint; we then apply URL state once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const merged = mergeScenarioPartial(parseScenarioParams(params));
    setParcelId(merged.parcelId);
    setConfig(merged.config);
    setAssumptions(merged.assumptions);
    // Landing-hero handoff: the hero stashes the typed address in session
    // storage (never the URL, to keep a guest's address out of history, the
    // Referer header, and analytics). Consume it once here; fall back to a
    // ?q= param so direct /studio?q=<address> links still trigger a search.
    // The auth-gated effect below runs the actual search.
    const incomingAddress = consumeAddressQuery() ?? params.get("q")?.trim();
    if (incomingAddress) {
      setPendingAddressQuery(incomingAddress);
    }
    setHydratedFromUrl(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Run the handed-off address search only after Firebase auth resolves —
  // at mount `user` is still null even for signed-in users, so searching
  // immediately would drop the ID token and 401 against the parcel APIs.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authLoading || !pendingAddressQuery) return;
    void searchByAddress(pendingAddressQuery);
    setPendingAddressQuery(null);
  }, [authLoading, pendingAddressQuery, searchByAddress]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydratedFromUrl || typeof window === "undefined") return;
    const serialized = serializeScenarioParams({ parcelId, config, assumptions });
    const next = `${window.location.pathname}?${serialized}`;
    window.history.replaceState(null, "", next);
  }, [assumptions, config, hydratedFromUrl, parcelId]);

  function resetScenario() {
    resetToPreset(parcelPresets[0]);
    setParcelId(parcelPresets[0].id);
    setConfig(defaultAduConfig);
    setAssumptions(defaultFinancialAssumptions);
    setReportOpen(false);
    setBuilderLeadOpen(false);
    setActiveNav("studio");
    setStudioTab("feasibility");
    setReportAutoFocus(false);
  }

  function handleNavigate(id: string) {
    setActiveNav(id);
    if (id === "export") {
      setReportOpen(true);
    }
  }

  // Route to the address search from anywhere in the shell: land on the
  // Feasibility tab (where the search lives) and focus it.
  function handleChangeAddress() {
    setActiveNav("studio");
    setStudioTab("feasibility");
    setAddressFocusSignal((n) => n + 1);
  }

  function handleGenerateReport() {
    setReportOpen(true);
    setReportAutoFocus(true);
  }

  async function handleSaveScenario() {
    if (typeof window === "undefined") return;
    if (savingScenario) return;
    if (!user) {
      setSaveNotice("Sign in to save");
      setTimeout(() => setSaveNotice(null), 2000);
      return;
    }

    const entry: Omit<SavedScenario, "id" | "createdAt"> = {
      name: `${activeParcel.address} - ${config.footprint} sf`,
      parcelId,
      config,
      assumptions,
    };
    if (
      parcelMode === "live" &&
      "source" in activeParcel &&
      (activeParcel.source === "regrid" || activeParcel.source === "fallback")
    ) {
      entry.liveParcel = activeParcel;
    }

    setSavingScenario(true);
    setSaveNotice(null);
    try {
      const created = await saveSavedScenario(user.uid, entry);
      setSavedScenarios((prev) => [created, ...prev]);
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
    if (!user) return;
    const scenario = savedScenarios.find((s) => s.id === id);
    if (!scenario) return;
    if (scenario.liveParcel) {
      restoreLiveParcel(scenario.liveParcel);
    } else {
      const preset = getParcelById(scenario.parcelId);
      resetToPreset(preset);
    }
    setParcelId(scenario.parcelId);
    setConfig(scenario.config);
    setAssumptions(scenario.assumptions);
  }

  async function handleDeleteScenario(id: string) {
    if (typeof window === "undefined") return;
    if (!user) return;
    try {
      await deleteSavedScenario(user.uid, id);
      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
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
    const html = buildReportHtml({ parcel: activeParcel, config, result });
    downloadBlob("lotfoundry-certificate-of-feasibility.html", html, "text/html");
  }

  function exportCsv() {
    const csv = buildReportCsv({ parcel: activeParcel, config, result });
    downloadBlob("lotfoundry-concept-feasibility-report.csv", csv, "text/csv");
  }

  const sceneNode =
    parcelMode === "live" && "lat" in activeParcel ? (
      <AerialView
        parcel={activeParcel as import("@/lib/parcel-types").LiveParcelData}
        config={config}
        isCompliant={isCompliant}
      />
    ) : (
      <ParcelScene
        parcel={sceneParcel}
        config={config}
        isCompliant={isCompliant}
      />
    );

  if (!isDesktop) {
    // The wizard replaces the studio rather than overlaying it: the studio's
    // always-open vaul sheet is a modal Radix dialog that would aria-hide and
    // focus-trap anything rendered outside it (including the wizard).
    if (wizardOpen) {
      return <WizardFlow onComplete={handleWizardComplete} />;
    }
    return (
      <>
        <MobileStudio
          header={
            <MobileHeader
              address={activeParcel.address}
              estimated={parcelMode === "estimated"}
              onReset={resetScenario}
            />
          }
          scene={<div className="h-full">{sceneNode}</div>}
          peek={
            <PeekMetrics
              result={result}
              config={config}
              estimated={parcelMode === "estimated"}
              parcelError={parcelError}
              onRetry={
                "lat" in activeParcel
                  ? () => void searchParcel(activeParcel.lat, activeParcel.lng, activeParcel.address)
                  : undefined
              }
            />
          }
          controls={
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
          }
          sections={
            <>
              <MetricsSummary result={result} />
              <EstimateSummaryPanel
                parcelName={`${activeParcel.address}, ${activeParcel.city}`}
                result={result}
                onGenerateReport={handleGenerateReport}
              />
              <PermitGuidePanel address={`${activeParcel.address}, ${activeParcel.city}`} />
              <AIPropertyInsightsPanel
                key={`${activeParcel.address}-${config.footprint}-${config.width}x${config.length}-${config.roof}-${config.finish}`}
                parcel={activeParcel}
                result={result}
                config={config}
              />
              <InspirationGalleryPanel
                generatedConcepts={generatedConcepts}
                onGenerationComplete={handleGenerationComplete}
                onViewComparison={handleViewComparison}
                styleMatchKey={styleMatchKey}
                onApply={(item) => {
                  const baseConfig = configForFootprint(item.sqft, config);
                  setConfig({
                    ...baseConfig,
                    width: item.width,
                    length: item.length,
                    roof: item.roof,
                    finish: item.finish,
                  });
                }}
              />
            </>
          }
        />
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
      </>
    );
  }

  const parcelName = `${activeParcel.address}, ${activeParcel.city}`;
  // Hide the metrics strip only on the Certificate tab, which carries its own
  // summary. Every other view keeps it (matches prior behavior).
  const showMetrics = !(activeNav === "studio" && studioTab === "certificate");

  return (
    <AppShell
      activeNav={activeNav}
      parcelAddress={activeParcel.address}
      parcelCity={activeParcel.city}
      onNavigate={handleNavigate}
      onReset={resetScenario}
      onChangeAddress={handleChangeAddress}
      savedScenarios={savedScenarios}
      onLoadScenario={handleLoadScenario}
      onDeleteScenario={handleDeleteScenario}
      deleteNotice={deleteNotice}
    >
      {activeNav === "guide" ? (
        <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
          <SceneSection sceneNode={sceneNode} />
          <PermitGuidePanel address={parcelName} />
        </div>
      ) : activeNav === "inspiration" ? (
        <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
          <SceneSection sceneNode={sceneNode} />
          <InspirationGalleryPanel
            generatedConcepts={generatedConcepts}
            onGenerationComplete={handleGenerationComplete}
            onViewComparison={handleViewComparison}
            styleMatchKey={styleMatchKey}
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
              setStudioTab("massing");
            }}
          />
        </div>
      ) : activeNav === "summary" ? (
        <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
          <SceneSection sceneNode={sceneNode} />
          <EstimateSummaryPanel
            parcelName={parcelName}
            result={result}
            onGenerateReport={handleGenerateReport}
          />
        </div>
      ) : (
        // ── Redesigned "Feasibility Studio" view ────────────────────────────
        <div className="flex min-h-0 flex-1 flex-col">
          <h2 className="sr-only">Feasibility Studio</h2>
          <FeasibilityVerdictBand
            parcel={activeParcel}
            result={result}
            config={config}
            eyebrow={activeParcel.city}
          />
          <StudioTabBar active={studioTab} onChange={setStudioTab} />

          {studioTab === "certificate" ? (
            <EstimateSummaryPanel
              parcelName={parcelName}
              result={result}
              onGenerateReport={handleGenerateReport}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <SceneSection sceneNode={sceneNode} />
              {studioTab === "massing" ? (
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
              ) : (
                <ConstraintsPanel
                  parcel={activeParcel}
                  result={result}
                  config={config}
                  assumptions={assumptions}
                  onAssumptionsChange={setAssumptions}
                  onViewCertificate={() => setStudioTab("certificate")}
                  addressFocusSignal={addressFocusSignal}
                />
              )}
            </div>
          )}
        </div>
      )}

      {showMetrics && (
        <div className="lf-entrance lf-entrance-delay-1">
          <MetricsSummary result={result} />
        </div>
      )}
      {reportOpen && (
        <ReportPreview
          parcelName={parcelName}
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
      {activeConcept && (
        <BeforeAfterBoard
          isOpen={isBoardOpen}
          onClose={() => setIsBoardOpen(false)}
          beforePhotoUrl={activeConcept.photoUrl || ""}
          afterConceptUrl={activeConcept.imagePath}
          styleName={activeConcept.style}
          matchPercentage={activeConcept.matchPercentage || 91}
          styleTraits={activeConcept.traits || []}
          lotSizeInfo={`${activeParcel.lotArea ? activeParcel.lotArea.toLocaleString() : "5,200"} sf lot`}
          isAttached={!!activeConcept.isAttached}
          onToggleAttach={() => handleToggleAttach(activeConcept.id)}
          onRecast={handleRecast}
          onDelete={() => handleDeleteConcept(activeConcept.id)}
        />
      )}
    </AppShell>
  );
}

/** Shared parcel-scene panel used by every desktop view. */
function SceneSection({ sceneNode }: { sceneNode: React.ReactNode }) {
  return (
    <section
      aria-label="Parcel massing scene"
      className="lf-entrance relative min-h-[440px] flex-1 overflow-hidden border-b border-lf-hairline bg-lf-espresso md:min-h-[480px] lg:min-h-0 lg:border-b-0 lg:border-r"
    >
      {sceneNode}
    </section>
  );
}
