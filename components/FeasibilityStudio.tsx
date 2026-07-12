"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { consumeAddressQuery, peekAddressQuery } from "@/lib/address-handoff";
import StudioShell from "./studio/StudioShell";
import AerialView from "./studio/AerialView";
import AddressSearch, { type AddressSearchResult } from "./studio/AddressSearch";
import FeasibilityInspector from "./studio/FeasibilityInspector";
import MetricsSummary from "./studio/MetricsSummary";
import ReportPreview from "./studio/ReportPreview";
import CertificatePanel from "./studio/CertificatePanel";
import BuildersPanel from "./studio/BuildersPanel";
import BuilderLeadPanel, {
  type BuilderLeadSubmitInput,
} from "./studio/BuilderLeadPanel";
import PermitGuidePanel from "./studio/PermitGuidePanel";
import InspirationGalleryPanel from "./studio/InspirationGalleryPanel";
import BeforeAfterBoard from "./studio/BeforeAfterBoard";
import type { InspirationItem } from "@/lib/inspiration-data";
import { configForFootprint } from "@/lib/feasibility";
import { useMediaQuery } from "@/lib/use-media-query";
import { markWizardSeen, shouldShowWizard } from "@/lib/wizard-state";
import MobileStudio from "./studio/mobile/MobileStudio";
import MobileHeader from "./studio/mobile/MobileHeader";
import PeekMetrics from "./studio/mobile/PeekMetrics";
import WizardFlow from "./studio/mobile/WizardFlow";
// ── Redesign: guided-spine studio ───────────────────────────────────────────
import FeasibilityVerdictBand from "./studio/FeasibilityVerdictBand";
import ConstraintsPanel from "./studio/ConstraintsPanel";
import { Button } from "./ui/Button";
import { MoneyFigure } from "./ui/MoneyFigure";
import { STUDIO_STEPS, deriveStepStates, type StudioStep } from "@/lib/studio-steps";
import { ArrowRight, ImageOff, Search } from "lucide-react";

/** The two scene render modes users can switch between via {@link SceneViewToggle}. */
type SceneViewMode = "3d" | "aerial";

const ParcelScene = dynamic(() => import("./ParcelScene"), {
  ssr: false,
  loading: () => (
    <div
      className="relative h-full min-h-[460px] overflow-hidden bg-lf-espresso"
      aria-label="Loading parcel scene"
      role="status"
    >
      <div className="absolute inset-0 animate-pulse bg-lf-mahogany/40" />
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
 * flow. Renders the desktop {@link StudioShell} spine or the mobile studio shell.
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
  const { parcel: liveParcel, parcelMode, parcelError, parcelLoading, searchParcel, searchByAddress, resetToPreset, restoreLiveParcel } = useParcel();
  const [parcelId, setParcelId] = useState(parcelPresets[0].id);
  const [config, setConfig] = useState<ADUConfig>(defaultAduConfig);
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(
    defaultFinancialAssumptions,
  );
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const [pendingAddressQuery, setPendingAddressQuery] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  // Guided spine: one active step drives the whole desktop studio (replaces the
  // old activeNav + studioTab two-navigation matrix).
  const [activeStep, setActiveStep] = useState<StudioStep>("feasibility");
  // Focus target for the active step body — moved to on step change so keyboard
  // and screen-reader users land on the new content, not back at the rail.
  const stepBodyRef = useRef<HTMLDivElement | null>(null);
  // Bumped by the "Change address" action to focus the studio search.
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
  // Only a geocoded (Regrid/fallback) parcel has real lat/lng for AerialView's
  // satellite imagery — demo presets and wizard estimates never do.
  const aerialAvailable = parcelMode === "live" && "lat" in activeParcel;
  // User-controlled scene mode. Seeded once from today's default (aerial for an
  // already-geocoded parcel, 3D otherwise) but never auto-switched afterward —
  // this replaces the old data-driven auto-switch with an explicit toggle.
  const [viewMode, setViewMode] = useState<SceneViewMode>(() =>
    aerialAvailable ? "aerial" : "3d",
  );
  const expectedRent = "expectedRent" in activeParcel ? activeParcel.expectedRent : undefined;
  const result = useMemo(
    () => calculateFeasibility(activeParcel, config, assumptions, expectedRent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assumptions, config, activeParcel],
  );
  const isCompliant = result.zoningStatus === "Compliant";

  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const [wizardOpen, setWizardOpen] = useState(false);
  // The handed-off address once consumed from session storage. `undefined`
  // means "not consumed yet". A ref (not module state) so it survives Strict
  // Mode's dev-only remount — the second effects pass finds session storage
  // already emptied by the first, and without this memo the wizard gate below
  // would wrongly conclude no handoff is pending — while still resetting on a
  // real refresh or back-navigation, which must not re-run the search.
  const incomingAddressRef = useRef<string | null | undefined>(undefined);

  // First-run wizard decision — mount-only, before the URL-write effect adds
  // scenario params, mirroring the existing post-hydration URL sync pattern.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return; // desktop never sees the wizard
    const hasUrlScenario = window.location.search.length > 1;
    setWizardOpen(
      shouldShowWizard({
        hasUrlScenario,
        // A landing handoff is about to run its own search — the wizard must
        // yield or it would ask for the address the visitor already typed.
        // Peek, don't consume: the hydration effect below still needs it. On a
        // Strict Mode re-run storage is already consumed, so also honor the
        // ref the hydration effect filled on the first pass.
        hasPendingAddress:
          peekAddressQuery() !== null || incomingAddressRef.current != null,
        // The signed-in blank-slate gate hands off an already-resolved live
        // parcel before this component mounts — the wizard must yield to it
        // too, or it re-asks for an address that's already been found (and a
        // Skip tap would reset the resolved parcel back to a demo lot).
        hasResolvedParcel: parcelMode === "live",
        storage: window.localStorage,
      }),
    );
    // Mount-only by design (see comment above); parcelMode is read once to
    // reflect whatever ParcelProvider initialized from, not on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // The auth-gated effect below runs the actual search. Consume only once
    // per component instance: on a Strict Mode re-run the ref replays the
    // value that the first pass already removed from storage.
    if (incomingAddressRef.current === undefined) {
      incomingAddressRef.current = consumeAddressQuery() ?? params.get("q")?.trim() ?? null;
    }
    const incomingAddress = incomingAddressRef.current;
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

  // Managed focus: when the active step changes, move focus to the new step's
  // body so keyboard/screen-reader users follow the navigation instead of being
  // stranded in the rail. Skipped on the initial mount (no prior step to leave).
  const didMountStep = useRef(false);
  useEffect(() => {
    if (!didMountStep.current) {
      didMountStep.current = true;
      return;
    }
    stepBodyRef.current?.focus();
  }, [activeStep]);

  function resetScenario() {
    resetToPreset(parcelPresets[0]);
    setParcelId(parcelPresets[0].id);
    setConfig(defaultAduConfig);
    setAssumptions(defaultFinancialAssumptions);
    setReportOpen(false);
    setBuilderLeadOpen(false);
    setActiveStep("lot");
    setReportAutoFocus(false);
  }

  function handleStepSelect(id: StudioStep) {
    setActiveStep(id);
  }

  function handleMobilePresetSelect(presetId: string) {
    const preset = getParcelById(presetId);
    resetToPreset(preset);
    setParcelId(preset.id);
  }

  // Route to the address search from anywhere: land on the "Your Lot" step
  // (where the search leads) and focus it.
  function handleChangeAddress() {
    setActiveStep("lot");
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
    viewMode === "aerial" ? (
      aerialAvailable ? (
        <AerialView
          parcel={activeParcel as import("@/lib/parcel-types").LiveParcelData}
          config={config}
          isCompliant={isCompliant}
        />
      ) : (
        <div
          role="status"
          className="flex h-full flex-col items-center justify-center gap-3 bg-lf-espresso p-8 text-center"
        >
          <ImageOff size={28} className="text-lf-taupe" aria-hidden="true" />
          <p className="lf-body max-w-[28ch] text-lf-taupe">
            Aerial view requires a real address. Search your address from the Lot step to see satellite imagery.
          </p>
        </div>
      )
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
    const mobileSteps = deriveStepStates(activeStep, { hasParcel: true });
    const mobileStepLabel = STUDIO_STEPS.find((step) => step.id === activeStep)?.label ?? "Studio";
    const mobileParcelName = `${activeParcel.address}, ${activeParcel.city}`;
    // Step-scoped sheet content: the full sheet shows only the active step's
    // panels rather than stacking every panel at once (the old mobile overload).
    let mobileControls: ReactNode;
    let mobileSections: ReactNode = null;
    if (activeStep === "lot") {
      mobileControls = (
        <div className="pt-1">
          <p className="lf-kicker pb-2 text-lf-clay">Your lot</p>
          <AddressSearch
            onSelect={(found) => searchParcel(found.lat, found.lng, found.formattedAddress)}
            onSubmitText={(query) => searchByAddress(query)}
            autoFocusSignal={addressFocusSignal}
          />
          <p className="mt-2 text-xs text-lf-muted">
            Search your address to pull parcel, zoning, and local rents.
          </p>
          <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-lf-muted">
            Or use a demo lot
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Demo lots">
            {parcelPresets.map((preset) => {
              const selected = parcelMode === "preset" && parcelId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleMobilePresetSelect(preset.id)}
                  aria-pressed={selected}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-2 ${
                    selected
                      ? "border-lf-clay bg-lf-taupe-soft text-lf-espresso"
                      : "border-lf-hairline bg-lf-card text-lf-muted hover:border-lf-taupe hover:bg-lf-sand-2"
                  }`}
                >
                  {preset.city.split(",")[0]}
                </button>
              );
            })}
          </div>
        </div>
      );
    } else if (activeStep === "feasibility") {
      mobileControls = (
        <ConstraintsPanel
          parcel={activeParcel}
          result={result}
          config={config}
          assumptions={assumptions}
          onAssumptionsChange={setAssumptions}
          onViewCertificate={() => setActiveStep("certificate")}
          addressFocusSignal={addressFocusSignal}
        />
      );
      mobileSections = (
        <>
          <PermitGuidePanel address={mobileParcelName} />
          <MetricsSummary result={result} />
        </>
      );
    } else if (activeStep === "design") {
      mobileControls = (
        <FeasibilityInspector
          parcelId={parcelId}
          config={config}
          assumptions={assumptions}
          result={result}
          onParcelChange={setParcelId}
          onConfigChange={setConfig}
          onAssumptionsChange={setAssumptions}
          onReset={resetScenario}
          onGenerateReport={() => setActiveStep("certificate")}
          onSaveScenario={handleSaveScenario}
          savingScenario={savingScenario}
          saveNotice={saveNotice}
        />
      );
      mobileSections = (
        <>
          <InspirationGalleryPanel
            parcel={activeParcel}
            config={config}
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
          <MetricsSummary result={result} />
        </>
      );
    } else if (activeStep === "certificate") {
      mobileControls = (
        <CertificatePanel
          parcel={activeParcel}
          result={result}
          parcelName={mobileParcelName}
          onOpenCertificate={handleGenerateReport}
        />
      );
    } else {
      // The connect form must render inside the sheet: the mobile shell is a
      // fixed h-dvh viewport, so a panel mounted after it is unreachable.
      mobileControls = builderLeadOpen ? (
        <BuilderLeadPanel
          open
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
      ) : (
        <BuildersPanel parcelCity={activeParcel.city} onConnect={() => setBuilderLeadOpen(true)} />
      );
    }
    return (
      <>
        <MobileStudio
          steps={mobileSteps}
          onStepSelect={(id) => handleStepSelect(id as StudioStep)}
          activeStepLabel={mobileStepLabel}
          activeStepId={activeStep}
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
          controls={mobileControls}
          sections={mobileSections}
        />
        {reportOpen && (
          <ReportPreview
            parcelName={`${activeParcel.address}, ${activeParcel.city}`}
            result={result}
            onClose={() => setReportOpen(false)}
            onDownload={downloadReport}
            onExportCsv={exportCsv}
            onShare={handleShareLink}
            onConnectBuilders={() => {
              // The form lives on the Builders step's sheet — close the report
              // and land there with the form open.
              setReportOpen(false);
              setActiveStep("builders");
              setBuilderLeadOpen(true);
            }}
            shareNotice={shareNotice}
            autoFocus={reportAutoFocus}
          />
        )}
      </>
    );
  }

  const parcelName = `${activeParcel.address}, ${activeParcel.city}`;
  // Whether the user has resolved their own address (live Regrid / wizard
  // estimate) vs. the default demo preset — drives the "Your Lot" value teaser.
  const parcelResolved = parcelMode !== "preset";
  // P1 keeps the whole journey explorable on any loaded lot (presets included);
  // the paid preconditions (certificate purchase, builder charge) are enforced
  // at those actions in later phases, not as navigation locks.
  const steps = deriveStepStates(activeStep, { hasParcel: true });
  const currentStepMeta = STUDIO_STEPS.find((s) => s.id === activeStep)!;
  // The income band leads steps 2–5; the "Your Lot" step leads with the search
  // itself. Metrics support only the two working steps, not every screen.
  const showsVerdictBand = activeStep !== "lot";
  const showsMetrics = activeStep === "feasibility" || activeStep === "design";

  return (
    <StudioShell
      steps={steps}
      onStepSelect={handleStepSelect}
      parcelAddress={activeParcel.address}
      parcelCity={activeParcel.city}
      onChangeAddress={handleChangeAddress}
      onReset={resetScenario}
      savedScenarios={savedScenarios}
      onLoadScenario={handleLoadScenario}
      onDeleteScenario={handleDeleteScenario}
      deleteNotice={deleteNotice}
    >
      <section
        ref={stepBodyRef}
        tabIndex={-1}
        aria-label={currentStepMeta.label}
        className="flex flex-1 flex-col outline-none"
      >
        {showsVerdictBand && (
          <FeasibilityVerdictBand
            parcel={activeParcel}
            result={result}
            config={config}
            eyebrow={activeParcel.city}
          />
        )}

        {activeStep === "lot" ? (
          <LotStep
            sceneNode={sceneNode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasParcel={parcelResolved}
            monthlyRent={result.monthlyRent}
            addressFocusSignal={addressFocusSignal}
            parcelLoading={parcelLoading}
            parcelError={parcelError}
            onSelect={(found) => searchParcel(found.lat, found.lng, found.formattedAddress)}
            onSubmitText={(query) => searchByAddress(query)}
            onContinue={() => setActiveStep("feasibility")}
          />
        ) : activeStep === "feasibility" ? (
          <>
            <div className="lf-studio-pane flex flex-col lg:flex-row">
              <SceneSection sceneNode={sceneNode} viewMode={viewMode} onViewModeChange={setViewMode} />
              <ConstraintsPanel
                parcel={activeParcel}
                result={result}
                config={config}
                assumptions={assumptions}
                onAssumptionsChange={setAssumptions}
                onViewCertificate={() => setActiveStep("certificate")}
                addressFocusSignal={addressFocusSignal}
              />
            </div>
            <PermitGuidePanel address={parcelName} />
          </>
        ) : activeStep === "design" ? (
          <>
            <div className="lf-studio-pane flex flex-col lg:flex-row">
              <SceneSection sceneNode={sceneNode} viewMode={viewMode} onViewModeChange={setViewMode} />
              <FeasibilityInspector
                parcelId={parcelId}
                config={config}
                assumptions={assumptions}
                result={result}
                onParcelChange={setParcelId}
                onConfigChange={setConfig}
                onAssumptionsChange={setAssumptions}
                onReset={resetScenario}
                onGenerateReport={() => setActiveStep("certificate")}
                onSaveScenario={handleSaveScenario}
                savingScenario={savingScenario}
                saveNotice={saveNotice}
              />
            </div>
            <InspirationGalleryPanel
              parcel={activeParcel}
              config={config}
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
        ) : activeStep === "certificate" ? (
          <CertificatePanel
            parcel={activeParcel}
            result={result}
            parcelName={parcelName}
            onOpenCertificate={handleGenerateReport}
          />
        ) : (
          <BuildersPanel parcelCity={activeParcel.city} onConnect={() => setBuilderLeadOpen(true)} />
        )}

        {showsMetrics && <MetricsSummary result={result} />}
      </section>

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
    </StudioShell>
  );
}

/** Shared parcel-scene panel used by the working studio steps. */
function SceneSection({
  sceneNode,
  viewMode,
  onViewModeChange,
}: {
  sceneNode: React.ReactNode;
  viewMode: SceneViewMode;
  onViewModeChange: (mode: SceneViewMode) => void;
}) {
  return (
    <section
      aria-label="Parcel massing scene"
      className="lf-entrance flex min-h-[440px] flex-1 flex-col overflow-hidden border-b border-lf-hairline bg-lf-espresso md:min-h-[480px] lg:min-h-0 lg:border-b-0 lg:border-r"
    >
      <SceneViewToggle mode={viewMode} onChange={onViewModeChange} />
      <div className="relative min-h-0 flex-1">{sceneNode}</div>
    </section>
  );
}

/** Segmented 3D/Aerial control for the scene panel's header row. */
function SceneViewToggle({
  mode,
  onChange,
}: {
  mode: SceneViewMode;
  onChange: (mode: SceneViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Scene view"
      className="flex shrink-0 items-center justify-end gap-1 border-b border-lf-taupe/25 bg-lf-espresso px-3 py-2"
    >
      <Button
        type="button"
        size="xs"
        variant={mode === "3d" ? "primary" : "ghost"}
        aria-pressed={mode === "3d"}
        onClick={() => onChange("3d")}
        className={mode === "3d" ? undefined : "text-lf-sand-2 hover:bg-lf-sand/10"}
      >
        3D
      </Button>
      <Button
        type="button"
        size="xs"
        variant={mode === "aerial" ? "primary" : "ghost"}
        aria-pressed={mode === "aerial"}
        onClick={() => onChange("aerial")}
        className={mode === "aerial" ? undefined : "text-lf-sand-2 hover:bg-lf-sand/10"}
      >
        Aerial
      </Button>
    </div>
  );
}

/** Props for {@link LotStep}. */
interface LotStepProps {
  sceneNode: React.ReactNode;
  viewMode: SceneViewMode;
  onViewModeChange: (mode: SceneViewMode) => void;
  hasParcel: boolean;
  monthlyRent: number;
  addressFocusSignal: number;
  parcelLoading: boolean;
  parcelError: string | null;
  onSelect: (found: AddressSearchResult) => void;
  onSubmitText: (query: string) => void;
  onContinue: () => void;
}

/**
 * Step 1 — the value hook. The address search leads (survey instrument), the
 * parcel renders below, and once a lot resolves the income figure appears with a
 * one-tap path onward to Feasibility & Rules.
 */
function LotStep({
  sceneNode,
  viewMode,
  onViewModeChange,
  hasParcel,
  monthlyRent,
  addressFocusSignal,
  parcelLoading,
  parcelError,
  onSelect,
  onSubmitText,
  onContinue,
}: LotStepProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-lf-hairline bg-lf-sand px-6 py-8 lg:px-10">
        <p className="lf-kicker text-lf-clay">Step 1 · Your Lot</p>
        <h2 className="lf-section-heading mt-2 text-lf-espresso">Start with your address.</h2>
        <p className="lf-body mt-2 max-w-[60ch] text-lf-muted">
          We&rsquo;ll pull your parcel, local zoning, and market rents to show what an ADU could add to your property.
        </p>
        <div className="mt-5 max-w-xl">
          <AddressSearch onSelect={onSelect} onSubmitText={onSubmitText} autoFocusSignal={addressFocusSignal} />
          {parcelLoading && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-lf-hairline bg-lf-sand-2 px-3 py-2 text-xs text-lf-muted">
              <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-lf-hairline border-t-lf-clay" />
              Looking up parcel data…
            </div>
          )}
          {parcelError && (
            <div
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-lg border border-lf-brick/40 bg-lf-brick/10 p-3 text-xs text-lf-brick"
            >
              <Search size={14} className="mt-0.5 shrink-0" />
              {parcelError}
            </div>
          )}
        </div>
        {hasParcel && (
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="lf-kicker-dense text-lf-muted">If built</p>
              <MoneyFigure value={monthlyRent} animate size="inline" tone="forest" className="mt-0.5" />
            </div>
            <Button variant="commit" rightIcon={<ArrowRight size={16} />} onClick={onContinue}>
              See what it could earn
            </Button>
          </div>
        )}
      </div>
      <SceneSection sceneNode={sceneNode} viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  );
}
