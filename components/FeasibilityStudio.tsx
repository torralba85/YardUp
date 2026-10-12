"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  parcelPresets,
  type ADUConfig,
  type FinancialAssumptions,
} from "@/lib/feasibility";
import { buildReportCsv, buildReportHtml, downloadBlob } from "@/lib/report";
import { AIRequestError, requestProjectBrief } from "@/lib/ai-api";
import type { AIProjectBriefResponse } from "@/lib/ai-types";
import {
  buildAIProjectBriefInput,
  createAIProjectBriefKey,
} from "@/lib/ai-project-brief";
import {
  isNonDefaultScenario,
  mergeScenarioPartial,
  parseScenarioParams,
  serializeScenarioParams,
} from "@/lib/scenario-url";
import { useRadioGroup } from "@/components/ui/useRadioGroup";
import {
  defaultPose,
  isValidAduConfig,
  isValidFinancialAssumptions,
  isValidPose,
} from "@/lib/scenario-design";
import type { Pose2D } from "@/lib/scene-model";
import { calculateScenarioFeasibility, restoreScenario, type ProjectBriefState } from "@/lib/scenario-restoration";
import type { SavedScenario } from "@/lib/saved-scenarios";
import { useAuth } from "@/lib/auth-context";
import { AuthModal, type AuthModalCloseReason } from "@/components/auth/AuthModal";
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
import { certificateKey } from "@/lib/certificate-key";
import { CHECKOUT_CANCELLED, CHECKOUT_RETURN_PARAM } from "@/lib/checkout-return";
import { Select } from "@/components/ui/Field";
import ParcelDataNotice from "./studio/ParcelDataNotice";
import { useCertificateRecovery, type CertificateGrant } from "@/lib/certificate-recovery";
import StudioShell from "./studio/StudioShell";
import AerialView from "./studio/AerialView";
import AddressSearch, { type AddressSearchResult } from "./studio/AddressSearch";
import FeasibilityInspector from "./studio/FeasibilityInspector";
import ReportPreview from "./studio/ReportPreview";
import CertificatePanel from "./studio/CertificatePanel";
import BuildersPanel from "./studio/BuildersPanel";
import BuilderLeadPanel, {
  type BuilderLeadSubmitInput,
} from "./studio/BuilderLeadPanel";
import PermitGuidePanel from "./studio/PermitGuidePanel";
import InspirationGalleryPanel from "./studio/InspirationGalleryPanel";
import BeforeAfterBoard from "./studio/BeforeAfterBoard";
import {
  configForInspirationItem,
  type InspirationItem,
} from "@/lib/inspiration-data";
import { useMediaQuery } from "@/lib/use-media-query";
import MobileHeader from "./studio/mobile/MobileHeader";
import MobileJourney from "./studio/mobile/journey/MobileJourney";
import FindStep from "./studio/mobile/journey/FindStep";
import EarnStep from "./studio/mobile/journey/EarnStep";
import ShapeStep from "./studio/mobile/journey/ShapeStep";
import CheckStep from "./studio/mobile/journey/CheckStep";
import ActStep from "./studio/mobile/journey/ActStep";
import FineTuneDrawer from "./studio/mobile/journey/FineTuneDrawer";
import {
  deriveJourneySteps,
  prevJourneyStep,
  type MobileJourneyStep,
} from "@/lib/mobile-journey";
import { useJourneyHistory } from "@/lib/use-journey-history";
// ── Redesign: guided-spine studio ───────────────────────────────────────────
import FeasibilityVerdictBand from "./studio/FeasibilityVerdictBand";
import ConstraintsPanel from "./studio/ConstraintsPanel";
import { Button } from "./ui/Button";
import { MoneyFigure } from "./ui/MoneyFigure";
import { Skeleton } from "./ui/Skeleton";
import { STUDIO_STEPS, deriveStepStates, type StudioStep } from "@/lib/studio-steps";
import { ArrowRight, ImageOff, Search } from "lucide-react";
import { summarizeFeasibility } from "@/lib/feasibility-verdict";
import {
  trackFeasibilityResultViewed,
  trackAduDesignCommitted,
  trackScenarioSaved,
  trackReportOpened,
  trackBuilderConnectionSubmitted,
  mapFeasibilityVerdict,
  mapParcelSource,
  getLotSizeBucket,
  getAduSqftBucket,
  getBuilderMatchBucket,
  extractStateCode,
  type AuthPromptSource,
} from "@/lib/analytics/events";

import { getSplatSceneForParcel } from "@/lib/splat-registry";
import SplatCalibrationPanel from "./studio/SplatCalibrationPanel";
import type { SplatTransform } from "@/lib/splat-scene";
import type { SplatLayerStatus } from "./studio/GaussianSplatLayer";

/** The scene render modes users can switch between via {@link SceneViewToggle}. */
type SceneViewMode = "3d" | "scan" | "aerial" | "neighborhood";

const CesiumNeighborhoodView = dynamic(() => import("./studio/CesiumNeighborhoodView"), {
  ssr: false,
});

const ParcelScene = dynamic(() => import("./ParcelScene"), {
  ssr: false,
  loading: () => (
    <div
      className="relative h-full min-h-[460px] overflow-hidden bg-lot-ink"
      aria-label="Loading parcel scene"
      role="status"
    >
      <div className="absolute inset-0 motion-safe:animate-pulse bg-lot-ink/40" />
      <div className="absolute left-5 bottom-5 right-5 flex flex-col gap-3">
        <Skeleton className="h-3 w-32 bg-lot-stone/15" />
        <Skeleton className="h-2.5 w-56 bg-lot-stone/10" />
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
 *
 * @param demoChosen - The visitor already picked the demo lot in the URL before
 *   the studio opened (the native app's onboarding), so the mobile journey
 *   starts at the Earn reveal instead of asking them to find a lot again.
 */
export default function FeasibilityStudio({ demoChosen = false, nativeShell = false }: { demoChosen?: boolean; nativeShell?: boolean } = {}) {
  const initialPreset = parcelPresets[0];
  return (
    <ParcelProvider initialPreset={initialPreset}>
      <FeasibilityStudioInner demoChosen={demoChosen} nativeShell={nativeShell} />
    </ParcelProvider>
  );
}

function FeasibilityStudioInner({ demoChosen, nativeShell }: { demoChosen: boolean; nativeShell: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const {
    parcel: liveParcel,
    parcelMode,
    parcelError,
    parcelLoading,
    selectionVersion,
    authRequired,
    clearAuthRequired,
    searchParcel,
    searchByAddress,
    resetToPreset,
    restoreLiveParcel,
  } = useParcel();
  const [parcelId, setParcelId] = useState(parcelPresets[0].id);
  const [config, setConfig] = useState<ADUConfig>(defaultAduConfig);
  const [poseState,setPoseState] = useState({key:parcelPresets[0].id,pose:defaultPose(parcelPresets[0],defaultAduConfig)});
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(
    defaultFinancialAssumptions,
  );
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);
  const [pendingAddressQuery, setPendingAddressQuery] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  // Guided spine: one active step drives the whole desktop studio (replaces the
  // old activeNav + studioTab two-navigation matrix).
  const [activeStep, setActiveStep] = useState<StudioStep>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.has("cert") || p.get("step") === "certificate") return "certificate";
    }
    return "feasibility";
  });
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
  const [authPrompt, setAuthPrompt] = useState<{
    open: boolean;
    source: AuthPromptSource;
    resumeSave: boolean;
  } | null>(null);

  const [generatedConcepts, setGeneratedConcepts] = useState<InspirationItem[]>([]);
  const [activeConcept, setActiveConcept] = useState<InspirationItem | null>(null);
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [styleMatchKey, setStyleMatchKey] = useState(0);
  const [projectBriefState, setProjectBriefState] = useState<ProjectBriefState | null>(null);
  const projectBriefRequestRef = useRef<{
    key: string;
    id: symbol;
    promise: Promise<AIProjectBriefResponse>;
  } | null>(null);

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

  const activeStyleMatchConcept = useMemo(() => {
    if (activeConcept?.isStyleMatched) {
      return {
        styleName: activeConcept.style,
        matchPercentage: activeConcept.matchPercentage ?? 85,
        traits: activeConcept.traits ?? [],
        conceptUrl: activeConcept.imagePath,
        photoUrl: activeConcept.photoUrl,
      };
    }
    const matched = generatedConcepts.find((c) => c.isStyleMatched);
    if (matched) {
      return {
        styleName: matched.style,
        matchPercentage: matched.matchPercentage ?? 85,
        traits: matched.traits ?? [],
        conceptUrl: matched.imagePath,
        photoUrl: matched.photoUrl,
      };
    }
    return null;
  }, [activeConcept, generatedConcepts]);

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
  // The 3D scene renders the active parcel's rectangle, so a live address
  // search re-proportions the lot instead of keeping the demo preset's dims.
  // (Estimated wizard parcels borrow their base preset's dimensions, so they
  // render identically to before.)
  const sceneParcel = activeParcel;
  const sceneKey = parcelMode === "preset" ? parcelId : `${activeParcel.address}|${activeParcel.city}`;
  const pose = poseState.key===sceneKey ? poseState.pose : defaultPose(activeParcel,config);
  if(poseState.key!==sceneKey) setPoseState({key:sceneKey,pose});
  const commitPose=useCallback((next:Pose2D)=>{ if(isValidPose(next)) setPoseState({key:sceneKey,pose:next}); },[sceneKey]);
  // Only a geocoded (Regrid/fallback) parcel has real lat/lng for AerialView's
  // satellite imagery — demo presets and wizard estimates never do.
  const aerialAvailable = parcelMode === "live" && "lat" in activeParcel;
  // User-controlled scene mode. Seeded once to the conceptual 3D model and
  // never auto-switched afterward —
  // this replaces the old data-driven auto-switch with an explicit toggle.
  const [viewMode, setViewMode] = useState<SceneViewMode>("3d");
  const parcelPresetId = parcelMode === "preset" && "id" in activeParcel ? activeParcel.id : undefined;
  const splatScene = useMemo(() => getSplatSceneForParcel(parcelPresetId), [parcelPresetId]);
  const [userCalibration, setUserCalibration] = useState<{ id: string; transform: SplatTransform } | null>(null);
  const [splatOnly, setSplatOnly] = useState(false);
  // Scan calibration is an internal alignment tool, never shown to public
  // visitors. Opt in per build with NEXT_PUBLIC_SCAN_CALIBRATION=true.
  const scanCalibrationEnabled = process.env.NEXT_PUBLIC_SCAN_CALIBRATION === "true";
  const [showCalibration, setShowCalibration] = useState(false);
  const [scanStatus, setScanStatus] = useState<SplatLayerStatus>({ state: "loading" });
  const calibrationTrigger = useRef<HTMLButtonElement>(null);
  const onScanStatus = useCallback((status: SplatLayerStatus) => setScanStatus(status), []);
  function changeViewMode(mode: SceneViewMode) {
    if (mode === viewMode) return;
    setShowCalibration(false);
    setSplatOnly(false);
    if (mode === "scan") setScanStatus({ state: "loading" });
    setViewMode(mode);
  }
  function closeCalibration() {
    setShowCalibration(false);
    requestAnimationFrame(() => calibrationTrigger.current?.focus());
  }

  const effectiveViewMode: SceneViewMode = viewMode === "scan" && !splatScene ? "3d" : viewMode;
  const activeSplatTransform = splatScene
    ? userCalibration?.id === splatScene.id
      ? userCalibration.transform
      : splatScene.transform
    : undefined;
  const result = useMemo(
    () => calculateScenarioFeasibility(activeParcel, config, assumptions, pose),
    [assumptions, config, activeParcel, pose],
  );
  const isCompliant = result.zoningStatus === "Compliant";
  const projectBriefInput = useMemo(
    () => buildAIProjectBriefInput({ parcel: activeParcel, result, config }),
    [activeParcel, config, result],
  );
  const projectBriefKey = useMemo(
    () => createAIProjectBriefKey({ parcel: activeParcel, result, config }),
    [activeParcel, config, result],
  );
  const projectBriefResponse =
    projectBriefState?.key === projectBriefKey ? projectBriefState.data : null;
  // Only the complete tier is recorded into the certificate and its exports;
  // the preview tier exists solely to sell that unlock in the rail panel.
  const projectBrief =
    projectBriefResponse?.tier === "full" ? projectBriefResponse.brief : null;
  const projectBriefSavedAt = projectBrief ? projectBriefState?.savedAt ?? null : null;
  const projectBriefPreview =
    projectBriefResponse?.tier === "preview" ? projectBriefResponse.preview : null;
  const projectBriefLoading =
    projectBriefState?.key === projectBriefKey ? projectBriefState.loading : false;
  const projectBriefError =
    projectBriefState?.key === projectBriefKey ? projectBriefState.error : null;

  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  // The handed-off address once consumed from session storage. `undefined`
  // means "not consumed yet". A ref (not module state) so it survives Strict
  // Mode's dev-only remount — the second effects pass finds session storage
  // already emptied by the first — while still resetting on a real refresh or
  // back-navigation, which must not re-run the search.
  const incomingAddressRef = useRef<string | null | undefined>(undefined);
  const incomingCertRef = useRef<string | null>(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("cert")?.trim() ?? null
      : null,
  );

  // ── Mobile five-reveal journey (find → earn → shape → check → act) ──────
  // Separate from the desktop StudioStep spine by design (issue #130). An
  // already-resolved parcel (signed-in handoff) starts at the Earn reveal.
  const [journeyStep, setJourneyStep] = useState<MobileJourneyStep>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.has("cert") || p.get("step") === "certificate") return "act";
    }
    return parcelMode !== "preset" || demoChosen ? "earn" : "find";
  });
  // A demo lot counts as the find decision only once the user commits to it.
  const [demoCommitted, setDemoCommitted] = useState(demoChosen);
  // Whether the find decision has been made — an address resolved (live or
  // estimated) or a demo lot explicitly committed to. Shared by the journey
  // rail's reachability derivation below and the restore guard just below so
  // the two cannot drift out of agreement with each other.
  const found = parcelMode !== "preset" || demoCommitted;

  // Session-history mirror so the Android back gesture steps back through the
  // journey instead of exiting the TWA. All ~13 setJourneyStep call sites stay
  // untouched — the hook observes the resulting state instead. Disabled on
  // desktop (`enabled: !isDesktop`): desktop never renders the journey and
  // must not observe any of this hook's side effects either — a live address
  // search still flips `journeyStep` from "find" to "earn" behind the scenes
  // (the render-phase adjustment below is not itself gated to mobile), and an
  // enabled hook would push a history entry desktop's own Back button would
  // then have to silently consume, with no visible change, before it could
  // actually leave /studio.
  //
  // A step restored by a back/forward press is only applied when it is a
  // completed ("done") step relative to where the journey currently stands —
  // deliberately narrower than "not locked". JourneyRail only ever makes
  // "done" chips clickable (forward travel always happens through each
  // screen's one primary action, never the rail), so tapping an earlier done
  // chip pushes a *new* forward entry, leaving the step the user tapped away
  // from still sitting ahead of it in the stack. Relative to the new
  // position, that abandoned step reads as merely "upcoming" (found is true,
  // so nothing is "locked"), and "upcoming" is reachable going forward but
  // must never become reachable via Back. Do not relax this back to "not
  // locked" — that reopens exactly this hole.
  const handleJourneyRestore = useCallback(
    (restored: MobileJourneyStep) => {
      const restoredState = deriveJourneySteps(journeyStep, { found }).find(
        (candidate) => candidate.id === restored,
      )?.state;
      if (restoredState !== "done") return;
      setJourneyStep(restored);
    },
    [journeyStep, found],
  );
  const journeyHistory = useJourneyHistory(journeyStep, handleJourneyRestore, !isDesktop);

  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  // Render-phase adjustment (not an effect): the money reveal must appear
  // immediately after address resolution, so a parcel-mode change while on
  // Find advances the journey to Earn in the same pass.
  const [prevParcelMode, setPrevParcelMode] = useState(parcelMode);
  if (parcelMode !== prevParcelMode) {
    setPrevParcelMode(parcelMode);
    if (parcelMode !== "preset" && journeyStep === "find") {
      setJourneyStep("earn");
    }
  }

  // Deliberate post-hydration sync from URL: server renders defaults so the
  // static HTML matches first client paint; we then apply URL state once.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const parsed = parseScenarioParams(params);
    const merged = mergeScenarioPartial(parsed);
    setParcelId(merged.parcelId);
    setConfig(merged.config);
    setPoseState({key:merged.parcelId,pose:merged.pose ?? defaultPose(getParcelById(merged.parcelId),merged.config)});
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
    // Certificate Recovery owns its Address handoff after observing the Grant.
    // Starting an ordinary lookup here would abandon that return as a new selection.
    if (incomingAddress && !incomingCertRef.current) {
      setPendingAddressQuery(incomingAddress);
    }
    // A restored or shared non-default scenario proves the find decision was
    // already made — start the mobile journey at the Earn reveal instead of
    // the onboarding plate. A pending address handoff owns its own advance
    // (the parcel-mode render adjustment fires when the search resolves).
    if (!incomingAddress && isNonDefaultScenario(parsed)) {
      setDemoCommitted(true);
      setJourneyStep((step) => (step === "find" ? "earn" : step));
    }

    const certParam = incomingCertRef.current ?? params.get("cert");
    const stepParam = params.get("step");
    if (certParam || stepParam === "certificate") {
      setActiveStep("certificate");
      setDemoCommitted(true);
      setJourneyStep("act");
      if (certParam) {
        const matchingPreset = parcelPresets.find(
          (p) => certificateKey(p) === certParam || p.id === certParam,
        );
        if (matchingPreset) {
          setParcelId(matchingPreset.id);
          resetToPreset(matchingPreset);
        }
      }
    }
    setHydratedFromUrl(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const restoreCertificateParcel = useCallback(async (grant: CertificateGrant, expectedSelectionVersion: number) => {
    if (parcelMode !== "preset") return;
    if (grant.parcelData) restoreLiveParcel(grant.parcelData, expectedSelectionVersion);
    else if (grant.address) await searchByAddress(grant.address, expectedSelectionVersion);
  }, [parcelMode, restoreLiveParcel, searchByAddress]);
  const certificateRecovery = useCertificateRecovery({
    uid: user?.uid,
    certKey: certificateKey(activeParcel),
    ready: hydratedFromUrl && !authLoading,
    hydrated: hydratedFromUrl,
    onRestore: restoreCertificateParcel,
    selectionVersion,
  });

  useEffect(() => {
    if (!hydratedFromUrl || typeof window === "undefined") return;
    // `serializeScenarioParams` throws on an invalid scenario, which is right for
    // an explicit share action but fatal here: this effect runs on every state
    // change, so a single out-of-range value took down the whole studio through
    // the error boundary rather than just failing to update the URL. Keeping the
    // address bar stale is the correct degradation — the studio stays usable.
    if (!isValidAduConfig(config) || !isValidFinancialAssumptions(assumptions) || !isValidPose(pose)) {
      return;
    }
    const serialized = serializeScenarioParams({ parcelId, config, assumptions, pose, version:2, heightConvention:"wall" });
    const currentParams = new URLSearchParams(window.location.search);
    const certParam = currentParams.get("cert");
    // Certificate Recovery consumes the one-shot return markers after capture.
    const checkoutCancelled = currentParams.get(CHECKOUT_RETURN_PARAM) === CHECKOUT_CANCELLED;
    const nextQuery = [
      serialized,
      ...(certParam ? [`cert=${encodeURIComponent(certParam)}`] : []),
      ...(checkoutCancelled ? [`${CHECKOUT_RETURN_PARAM}=${CHECKOUT_CANCELLED}`] : []),
    ].join("&");
    const next = `${window.location.pathname}?${nextQuery}`;
    // Preserve the current entry's state — never pass `null` here. This
    // effect only means to rewrite the URL; a null state would also erase
    // the journey hook's lfJourneyStep key (use-journey-history.ts) and
    // Next.js's own router state on this entry, since replaceState's first
    // argument replaces the whole state object, not just the URL.
    window.history.replaceState(window.history.state, "", next);
  }, [assumptions, config, hydratedFromUrl, parcelId, pose]);

  // Track feasibility result review once per parcel context when reached
  const reviewedParcelsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const isReviewed = isDesktop ? activeStep !== "lot" : journeyStep !== "find";
    if (!isReviewed) return;

    const parcelKey = `${parcelMode}_${activeParcel.address}_${activeParcel.city}`;
    if (reviewedParcelsRef.current.has(parcelKey)) return;
    reviewedParcelsRef.current.add(parcelKey);

    const summary = summarizeFeasibility(activeParcel, result, config, result.placement);
    const feasibility_status = mapFeasibilityVerdict(summary.verdict);
    const parcel_source = "source" in activeParcel && typeof activeParcel.source === "string"
      ? mapParcelSource(activeParcel.source)
      : parcelMode === "preset"
        ? "preset"
        : "unknown";
    const lot_size_bucket = getLotSizeBucket(activeParcel.lotArea);
    const adu_sqft_bucket = getAduSqftBucket(config.footprint);
    const state_code = extractStateCode(activeParcel);

    trackFeasibilityResultViewed({
      parcel_mode: parcelMode,
      parcel_source,
      feasibility_status,
      lot_size_bucket,
      adu_sqft_bucket,
      auth_state: user ? "signed_in" : "guest",
      state_code,
    });
  }, [activeStep, journeyStep, isDesktop, activeParcel, parcelMode, result, config, user]);

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
    if (!window.confirm("Reset this project? Unsaved changes to your lot, design and assumptions will be discarded.")) return;
    resetToPreset(parcelPresets[0]);
    setParcelId(parcelPresets[0].id);
    setConfig(defaultAduConfig);
    setPoseState({key:parcelPresets[0].id,pose:defaultPose(parcelPresets[0],defaultAduConfig)});
    setAssumptions(defaultFinancialAssumptions);
    setReportOpen(false);
    setBuilderLeadOpen(false);
    setActiveStep("lot");
    setJourneyStep("find");
    journeyHistory.reset();
    setDemoCommitted(false);
    setFineTuneOpen(false);
    setReportAutoFocus(false);
    setProjectBriefState(null);
  }

  function handleStepSelect(id: StudioStep) {
    if (activeStep === "design" && (id === "certificate" || id === "builders")) {
      const summary = summarizeFeasibility(activeParcel, result, config, result.placement);
      trackAduDesignCommitted({
        adu_sqft_bucket: getAduSqftBucket(config.footprint),
        roof_style: config.roof,
        finish: config.finish,
        feasibility_status: mapFeasibilityVerdict(summary.verdict),
      });
    }
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

  function handleGenerateReport(projectBriefUnavailableError?: string) {
    if (projectBriefUnavailableError) {
      setProjectBriefState((current) => ({
        key: projectBriefKey,
        data: current?.key === projectBriefKey ? current.data : null,
        loading: false,
        error: projectBriefUnavailableError,
      }));
    }
    const summary = summarizeFeasibility(activeParcel, result, config, result.placement);
    trackReportOpened({
      feasibility_status: mapFeasibilityVerdict(summary.verdict),
      has_ai_brief: Boolean(projectBrief),
      auth_state: user ? "signed_in" : "guest",
    });
    setReportOpen(true);
    setReportAutoFocus(true);
  }

  const handleGenerateProjectBrief = useCallback(
    (idToken: string): Promise<AIProjectBriefResponse> => {
      const existingRequest = projectBriefRequestRef.current;
      if (existingRequest?.key === projectBriefKey) return existingRequest.promise;

      const requestKey = projectBriefKey;
      const requestInput = projectBriefInput;
      const existingData = projectBriefState?.key === requestKey ? projectBriefState.data : null;
      const savedAt = projectBriefState?.key === requestKey ? projectBriefState.savedAt : undefined;
      setProjectBriefState({ key: requestKey, data: existingData, loading: true, error: null, savedAt });

      const requestId = Symbol("project-brief-request");
      const promise = requestProjectBrief(requestInput, idToken)
        .then((data) => {
          if (projectBriefRequestRef.current?.id === requestId) {
            setProjectBriefState((current) => current?.key === requestKey
              ? { key: requestKey, data, loading: false, error: null } : current);
          }
          return data;
        })
        .catch((err: unknown) => {
          const message =
            err instanceof AIRequestError
              ? err.userMessage
              : "Property notes are unavailable right now. Please try again.";
          if (projectBriefRequestRef.current?.id === requestId) {
            setProjectBriefState((current) => current?.key === requestKey
              ? { key: requestKey, data: existingData, loading: false, error: message, savedAt } : current);
          }
          throw err;
        })
        .finally(() => {
          if (projectBriefRequestRef.current?.id === requestId) {
            projectBriefRequestRef.current = null;
          }
        });

      projectBriefRequestRef.current = { key: requestKey, id: requestId, promise };
      return promise;
    },
    [projectBriefInput, projectBriefKey, projectBriefState],
  );

  const handleRetryProjectBrief = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      await handleGenerateProjectBrief(idToken);
    } catch {
      // Error state is captured inside handleGenerateProjectBrief
    }
  }, [handleGenerateProjectBrief, user]);

  const openSignup = useCallback(
    (source: AuthPromptSource, resumeSave = false) => {
      setAuthPrompt({ open: true, source, resumeSave });
    },
    [],
  );

  async function handleSaveScenario(authenticatedUid?: string) {
    if (typeof window === "undefined") return;
    if (savingScenario) return;
    const userId = authenticatedUid ?? user?.uid;
    if (!userId) {
      setSaveNotice("Create a free account to save");
      openSignup("save_scenario", true);
      return;
    }

    const entry: Omit<SavedScenario, "id" | "createdAt"> = {
      version:2, heightConvention:"wall", pose,
      name: `${activeParcel.address} - ${config.footprint} sf`,
      parcelId,
      config,
      assumptions,
    };
    if (
      parcelMode === "live" &&
      "source" in activeParcel &&
      (activeParcel.source === "regrid" ||
        activeParcel.source === "county-gis" ||
        activeParcel.source === "fallback")
    ) {
      entry.liveParcel = activeParcel;
    }
    if (projectBrief) {
      entry.projectBrief = projectBrief;
    }
    if (activeStyleMatchConcept) {
      entry.styleMatchConcept = activeStyleMatchConcept;
    }

    setSavingScenario(true);
    setSaveNotice(null);
    try {
      const created = await saveSavedScenario(userId, entry);
      setSavedScenarios((prev) => [created, ...prev]);
      setSaveNotice("Saved");
      const summary = summarizeFeasibility(activeParcel, result, config, result.placement);
      trackScenarioSaved({
        parcel_mode: parcelMode,
        feasibility_status: mapFeasibilityVerdict(summary.verdict),
      });
    } catch {
      setSaveNotice("Save failed");
    } finally {
      setSavingScenario(false);
      setTimeout(() => setSaveNotice(null), 2000);
    }
  }

  const guestLimitPromptActive = authRequired && !user;
  const visibleAuthPrompt =
    authPrompt ??
    (guestLimitPromptActive
      ? { open: true, source: "guest_limit" as const, resumeSave: false }
      : null);

  function handleStudioAuthenticated(authenticatedUser: { uid: string }) {
    if (visibleAuthPrompt?.resumeSave) {
      void handleSaveScenario(authenticatedUser.uid);
    }
    setAuthPrompt(null);
  }

  const handleStudioAuthClose = useCallback(
    (reason: AuthModalCloseReason) => {
      if (reason === "dismissed" && guestLimitPromptActive) {
        clearAuthRequired();
      }
      setAuthPrompt(null);
    },
    [clearAuthRequired, guestLimitPromptActive],
  );

  function handleLoadScenario(id: string) {
    if (typeof window === "undefined") return;
    if (!user) return;
    const scenario = savedScenarios.find((s) => s.id === id);
    if (!scenario) return;
    const restored = restoreScenario(scenario);
    // A request started for the previous study cannot overwrite this saved snapshot.
    projectBriefRequestRef.current = null;
    if (restored.liveParcel) restoreLiveParcel(restored.liveParcel);
    else resetToPreset(restored.preset);
    setParcelId(restored.parcelId);
    setConfig(restored.config);
    setPoseState({ key: restored.poseKey, pose: restored.pose });
    setAssumptions(restored.assumptions);
    setProjectBriefState(restored.briefState);
    setGeneratedConcepts(restored.concept ? [restored.concept] : []);
    setActiveConcept(restored.concept);
    setIsBoardOpen(false);
  }

  async function handleDeleteScenario(id: string) {
    if (typeof window === "undefined") return;
    if (!user) return;
    const name = savedScenarios.find((scenario) => scenario.id === id)?.name ?? "this concept";
    if (!window.confirm(`Delete saved concept “${name}”? This cannot be undone.`)) return;
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

    const summary = summarizeFeasibility(activeParcel, result, config, result.placement);
    trackBuilderConnectionSubmitted({
      builder_match_bucket: getBuilderMatchBucket(matchedBuilders.length),
      feasibility_status: mapFeasibilityVerdict(summary.verdict),
      adu_sqft_bucket: getAduSqftBucket(config.footprint),
      state_code: extractStateCode({ state: input.snapshot.parcelState, city: input.snapshot.parcelCity }),
    });

    return { matchedCount: matchedBuilders.length };
  }

  function downloadReport() {
    const html = buildReportHtml({
      parcel: activeParcel,
      config,
      result,
      projectBrief: projectBrief ?? undefined,
      projectBriefSavedAt,
      styleMatchConcept: activeStyleMatchConcept,
    });
    downloadBlob("lotfoundry-certificate-of-feasibility.html", html, "text/html");
  }

  function exportCsv() {
    const csv = buildReportCsv({
      parcel: activeParcel,
      config,
      result,
      projectBrief: projectBrief ?? undefined,
      projectBriefSavedAt,
      styleMatchConcept: activeStyleMatchConcept,
    });
    downloadBlob("lotfoundry-concept-feasibility-report.csv", csv, "text/csv");
  }

  const sceneNode =
    effectiveViewMode === "neighborhood" ? (
      <CesiumNeighborhoodView
        parcel={activeParcel}
        config={config}
        pose={pose}
        placement={result.placement}
        onReturnToModel={() => setViewMode("3d")}
      />
    ) : effectiveViewMode === "aerial" ? (
      aerialAvailable ? (
        <AerialView
          parcel={activeParcel as import("@/lib/parcel-types").LiveParcelData}
          config={config}
          pose={pose}
          onReturnToModel={()=>setViewMode("3d")}
          isCompliant={isCompliant}
        />
      ) : (
        <div
          role="status"
          className="flex h-full flex-col items-center justify-center gap-3 bg-lot-ink p-8 text-center"
        >
          <ImageOff size={28} className="text-lot-stone-on-dark" aria-hidden="true" />
          <p className="lf-body max-w-[28ch] text-lot-stone-on-dark">
            Aerial view requires a real address. Search your address from the Lot step to see satellite imagery.
          </p>
          <Button variant="secondary" onClick={()=>setViewMode("3d")}>Return to 3D model</Button>
          <Button variant="secondary" onClick={()=>{setJourneyStep("find");handleChangeAddress();}}>Search an address</Button>
        </div>
      )
    ) : (
      <div className="relative flex h-full w-full min-h-0 flex-col">
        {effectiveViewMode === "scan" && splatScene && (
          <div className="shrink-0 border-b border-lot-line bg-lot-chalk px-3 py-2 text-xs text-lot-ink">
            <p>{splatScene.captureLabel}. Visual context only; placement uses the estimated model.</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
              <p role="status" aria-live="polite">
                {scanStatus.state === "loading" ? "Loading sample scan…" : scanStatus.state === "error"
                  ? "Scan unavailable. Return to the 3D model to continue."
                  : "Sample scan loaded. Alignment and source scale are unverified."}
              </p>
              <Button size="xs" variant="secondary" onClick={() => changeViewMode("3d")}>Return to 3D model</Button>
            </div>
          </div>
        )}
        <div className="relative min-h-0 flex-1">
        <ParcelScene
          parcel={sceneParcel}
          config={config}
          isCompliant={isCompliant}
          remainingCapacity={result.remainingCapacity}
          flowLayout={!isDesktop}
          pose={pose}
          onPoseCommit={commitPose}
          scanMode={effectiveViewMode === "scan"}
          splatScene={splatScene}
          scanTransform={activeSplatTransform}
          splatOnly={splatOnly}
          onScanStatus={onScanStatus}
        />
        {scanCalibrationEnabled && effectiveViewMode === "scan" && splatScene && activeSplatTransform && (
          <div className={`absolute right-0 top-0 z-(--z-index-scene) max-h-full max-w-full ${showCalibration ? "w-full overflow-y-auto overscroll-contain sm:w-80 md:w-96" : "p-3"}`}>
            {showCalibration ? (
              <SplatCalibrationPanel
                scene={splatScene}
                transform={activeSplatTransform}
                onChangeTransform={(next) => setUserCalibration({ id: splatScene.id, transform: next })}
                onResetTransform={() => setUserCalibration(null)}
                splatOnly={splatOnly}
                onToggleSplatOnly={setSplatOnly}
                onClose={closeCalibration}
              />
            ) : (
              <Button
                type="button"
                size="xs"
                variant="secondary"
                ref={calibrationTrigger}
                aria-expanded={false}
                onClick={() => setShowCalibration(true)}
              >
                Calibrate Scan
              </Button>
            )}
          </div>
        )}
        </div>
      </div>
    );

  if (!isDesktop) {
    // The five-reveal journey (issue #130): one decision and one payoff per
    // screen, with the advanced inspector behind an optional fine-tune drawer.
    const journeySteps = deriveJourneySteps(journeyStep, { found });
    const previousStep = prevJourneyStep(journeyStep);
    const mobileParcelName = `${activeParcel.address}, ${activeParcel.city}`;

    let stepContent: ReactNode;
    if (journeyStep === "find") {
      stepContent = (
        <FindStep
          onSelect={(found) => searchParcel(found.lat, found.lng, found.formattedAddress)}
          onSubmitText={(query) => searchByAddress(query)}
          parcelLoading={parcelLoading}
          parcelError={parcelError}
          selectedPresetId={parcelMode === "preset" ? parcelId : null}
          onPresetSelect={handleMobilePresetSelect}
          onReveal={() => {
            setDemoCommitted(true);
            setJourneyStep("earn");
          }}
        />
      );
    } else if (journeyStep === "earn") {
      stepContent = (
        <EarnStep
          parcelNotice={<ParcelDataNotice parcel={activeParcel} />}
          parcelName={mobileParcelName}
          result={result}
          estimated={parcelMode !== "live"}
          onContinue={() => setJourneyStep("shape")}
        />
      );
    } else if (journeyStep === "shape") {
      stepContent = (
        <ShapeStep
          config={config}
          onConfigChange={setConfig}
          result={result}
          scene={
            <SceneViewport
              sceneNode={sceneNode}
              viewMode={effectiveViewMode}
              onViewModeChange={changeViewMode}
              flowLayout
            />
          }
          onFineTune={() => setFineTuneOpen(true)}
          onContinue={() => {
            const summary = summarizeFeasibility(activeParcel, result, config, result.placement);
            trackAduDesignCommitted({
              adu_sqft_bucket: getAduSqftBucket(config.footprint),
              roof_style: config.roof,
              finish: config.finish,
              feasibility_status: mapFeasibilityVerdict(summary.verdict),
            });
            setJourneyStep("check");
          }}
        />
      );
    } else if (journeyStep === "check") {
      stepContent = (
        <CheckStep
          parcel={activeParcel}
          result={result}
          config={config}
          onFineTune={() => setFineTuneOpen(true)}
          onContinue={() => setJourneyStep("act")}
          onCreateAccount={!user ? () => openSignup("post_result") : undefined}
        />
      );
    } else {
      // The connect form takes over the Act screen as a focused destination —
      // never content appended below the journey.
      stepContent = builderLeadOpen ? (
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
        <ActStep
          parcelName={mobileParcelName}
          certificate={
            <CertificatePanel
              recovery={certificateRecovery}
              parcel={activeParcel}
              result={result}
              parcelName={mobileParcelName}
              eyebrow="Certificate of Feasibility"
              onOpenCertificate={handleGenerateReport}
              projectBrief={projectBrief}
              projectBriefSavedAt={projectBriefSavedAt}
              projectBriefPreview={projectBriefPreview}
              projectBriefLoading={projectBriefLoading}
              projectBriefError={projectBriefError}
              onGenerateProjectBrief={handleGenerateProjectBrief}
            />
          }
          onSaveScenario={() => void handleSaveScenario()}
          savingScenario={savingScenario}
          saveNotice={saveNotice}
          onShare={() => void handleShareLink()}
          shareNotice={shareNotice}
          onConnectBuilders={() => setBuilderLeadOpen(true)}
        />
      );
    }

    return (
      <>
        <MobileJourney
          pageScroll={!nativeShell}
          header={
            <MobileHeader
              address={activeParcel.address}
              estimated={parcelMode === "estimated"}
              onReset={resetScenario}
            />
          }
          steps={journeySteps}
          onBack={previousStep ? () => window.history.back() : undefined}
          onStepSelect={setJourneyStep}
        >
          {stepContent}
        </MobileJourney>
        <FineTuneDrawer open={fineTuneOpen} onClose={() => setFineTuneOpen(false)}>
          <FeasibilityInspector
            initialStep={2}
            parcelId={parcelId}
            config={config}
            assumptions={assumptions}
            result={result}
            onParcelChange={setParcelId}
            onConfigChange={setConfig}
            onAssumptionsChange={setAssumptions}
            onReset={resetScenario}
            onGenerateReport={() => {
              setFineTuneOpen(false);
              setJourneyStep("act");
            }}
            onSaveScenario={handleSaveScenario}
            savingScenario={savingScenario}
            saveNotice={saveNotice}
          />
        </FineTuneDrawer>
        {reportOpen && (
          <ReportPreview
            parcel={activeParcel}
            parcelName={mobileParcelName}
            result={result}
            projectBrief={projectBrief}
              projectBriefSavedAt={projectBriefSavedAt}
            projectBriefLoading={projectBriefLoading}
            projectBriefError={projectBriefError}
            styleMatchConcept={activeStyleMatchConcept}
            onRetryProjectBrief={user ? handleRetryProjectBrief : undefined}
            onClose={() => setReportOpen(false)}
            onDownload={downloadReport}
            onExportCsv={exportCsv}
            onShare={handleShareLink}
            onConnectBuilders={() => {
              // The connect form lives on the Act screen — close the report
              // and land there with the form open.
              setReportOpen(false);
              setJourneyStep("act");
              setBuilderLeadOpen(true);
            }}
            shareNotice={shareNotice}
            autoFocus={reportAutoFocus}
          />
        )}
        <AuthModal
          isOpen={visibleAuthPrompt?.open === true}
          initialMode="sign-up"
          analyticsSurface="studio"
          analyticsSource={visibleAuthPrompt?.source ?? "unknown"}
          onAuthenticated={handleStudioAuthenticated}
          onClose={handleStudioAuthClose}
        />
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
  // Project context follows the lot step; detailed figures open on demand.
  const showsVerdictBand = activeStep !== "lot";

  return (
    <>
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
            onCreateAccount={!user ? () => openSignup("post_result") : undefined}
          />
        )}

        {activeStep === "lot" ? (
          <LotStep
            parcelNotice={<ParcelDataNotice parcel={activeParcel} />}
            parcelId={parcelId}
            onPresetChange={(id) => {
              setParcelId(id);
              resetToPreset(parcelPresets.find((preset) => preset.id === id) ?? parcelPresets[0]);
            }}
            sceneNode={sceneNode}
            viewMode={effectiveViewMode}
            onViewModeChange={changeViewMode}
            hasScan={Boolean(splatScene)}
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
              <SceneSection
                sceneNode={sceneNode}
                viewMode={effectiveViewMode}
                onViewModeChange={changeViewMode}
                hasScan={Boolean(splatScene)}
              />
              <ConstraintsPanel
                parcel={activeParcel}
                result={result}
                config={config}
                assumptions={assumptions}
                onAssumptionsChange={setAssumptions}
                onViewCertificate={() => setActiveStep("certificate")}
                projectBriefResponse={projectBriefResponse}
                projectBriefLoading={projectBriefLoading}
                projectBriefError={projectBriefError}
                onGenerateProjectBrief={handleGenerateProjectBrief}
                addressFocusSignal={addressFocusSignal}
              />
            </div>
            <PermitGuidePanel address={parcelName} />
          </>
        ) : activeStep === "design" ? (
          <>
            <div className="lf-studio-pane flex flex-col lg:flex-row">
              <SceneSection
                sceneNode={sceneNode}
                viewMode={effectiveViewMode}
                onViewModeChange={changeViewMode}
                hasScan={Boolean(splatScene)}
              />
              <FeasibilityInspector
                designOnly
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
            <details className="group border-t border-lot-line bg-lot-chalk">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between px-6 text-sm font-semibold text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">
                Browse designs
                <span aria-hidden="true" className="group-open:rotate-45">+</span>
              </summary>
              <InspirationGalleryPanel
                parcel={activeParcel}
                config={config}
                generatedConcepts={generatedConcepts}
                onGenerationComplete={handleGenerationComplete}
                onViewComparison={handleViewComparison}
                styleMatchKey={styleMatchKey}
                onApply={(item) => setConfig(configForInspirationItem(item, config))}
              />
            </details>
          </>
        ) : activeStep === "certificate" ? (
          <CertificatePanel
              recovery={certificateRecovery}
            parcel={activeParcel}
            result={result}
            parcelName={parcelName}
            onOpenCertificate={handleGenerateReport}
            projectBrief={projectBrief}
              projectBriefSavedAt={projectBriefSavedAt}
            projectBriefPreview={projectBriefPreview}
            projectBriefLoading={projectBriefLoading}
            projectBriefError={projectBriefError}
            onGenerateProjectBrief={handleGenerateProjectBrief}
          />
        ) : (
          <BuildersPanel
            parcelCity={activeParcel.city}
            feasibilityStatus={mapFeasibilityVerdict(result.zoningStatus)}
            onConnect={() => setBuilderLeadOpen(true)}
          />
        )}
      </section>

      {reportOpen && (
        <ReportPreview
          parcel={activeParcel}
          parcelName={parcelName}
          result={result}
          projectBrief={projectBrief}
              projectBriefSavedAt={projectBriefSavedAt}
          projectBriefLoading={projectBriefLoading}
          projectBriefError={projectBriefError}
          styleMatchConcept={activeStyleMatchConcept}
          onRetryProjectBrief={user ? handleRetryProjectBrief : undefined}
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
    <AuthModal
      isOpen={authPrompt?.open === true}
      initialMode="sign-up"
      analyticsSurface="studio"
      analyticsSource={authPrompt?.source ?? "unknown"}
      onClose={handleStudioAuthClose}
    />
    </>
  );
}

/** Canvas viewport shared by desktop and mobile studio layouts. */
function SceneViewport({
  sceneNode,
  viewMode,
  onViewModeChange,
  hasScan = false,
  flowLayout = false,
}: {
  sceneNode: React.ReactNode;
  viewMode: SceneViewMode;
  onViewModeChange: (mode: SceneViewMode) => void;
  hasScan?: boolean;
  flowLayout?: boolean;
}) {
  return (
    <div data-testid="scene-viewport" className={`relative flex min-h-0 flex-1 flex-col ${flowLayout ? (viewMode === "3d" || viewMode === "scan" ? "h-auto" : "h-[58dvh] min-h-[500px]") : "h-full"}`}>
      <SceneViewToggle mode={viewMode} onChange={onViewModeChange} hasScan={hasScan} />
      <div className="min-h-0 flex-1">{sceneNode}</div>
    </div>
  );
}

/** Shared parcel-scene panel used by the working studio steps. */
function SceneSection({
  sceneNode,
  viewMode,
  onViewModeChange,
  hasScan = false,
}: {
  sceneNode: React.ReactNode;
  viewMode: SceneViewMode;
  onViewModeChange: (mode: SceneViewMode) => void;
  hasScan?: boolean;
}) {
  return (
    <section
      aria-label="Parcel massing scene"
      className="lf-entrance flex min-h-[440px] flex-1 flex-col overflow-y-auto border-b border-lot-line bg-lot-ink md:min-h-[480px] lg:min-h-0 lg:border-b-0 lg:border-r"
    >
      <SceneViewport
        sceneNode={sceneNode}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        hasScan={hasScan}
      />
    </section>
  );
}

/** Floating 3D/Aerial lens switch kept visually inside the parcel canvas. */
function SceneViewToggle({
  mode,
  onChange,
  hasScan = false,
}: {
  mode: SceneViewMode;
  onChange: (mode: SceneViewMode) => void;
  hasScan?: boolean;
}) {
  const options: SceneViewMode[] = ["3d"];
  if (hasScan) options.push("scan");
  options.push("neighborhood", "aerial");

  const { groupProps, getRadioProps } = useRadioGroup({
    value: mode,
    onChange,
    values: options,
  });

  return (
    <div
      className="pointer-events-auto flex flex-wrap shrink-0 items-center gap-1 border-b border-lot-line bg-lot-chalk px-2 py-1"
      aria-label="Parcel view"
      {...groupProps}
    >
      <Button
        type="button"
        size="xs"
        variant={mode === "3d" ? "selected" : "ghost"}
        {...getRadioProps("3d")}
        className={`h-11 px-3.5 focus-visible:ring-offset-lot-chalk ${
          mode === "3d" ? "" : "text-lot-ink hover:bg-lot-stone-soft"
        }`}
      >
        3D model
      </Button>
      {hasScan && (
        <Button
          type="button"
          size="xs"
          variant={mode === "scan" ? "selected" : "ghost"}
          {...getRadioProps("scan")}
          className={`h-11 px-3.5 focus-visible:ring-offset-lot-chalk ${
            mode === "scan" ? "" : "text-lot-ink hover:bg-lot-stone-soft"
          }`}
        >
          Scan{" "}
          <span className="ml-1 rounded-control bg-lot-ink px-1 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-lot-chalk">
            Beta
          </span>
        </Button>
      )}
      <Button
        type="button"
        size="xs"
        variant={mode === "neighborhood" ? "selected" : "ghost"}
        {...getRadioProps("neighborhood")}
        className={`h-11 px-3.5 focus-visible:ring-offset-lot-chalk ${
          mode === "neighborhood" ? "" : "text-lot-ink hover:bg-lot-stone-soft"
        }`}
      >
        Neighborhood
      </Button>
      <Button
        type="button"
        size="xs"
        variant={mode === "aerial" ? "selected" : "ghost"}
        {...getRadioProps("aerial")}
        className={`h-11 px-3.5 focus-visible:ring-offset-lot-chalk ${
          mode === "aerial" ? "" : "text-lot-ink hover:bg-lot-stone-soft"
        }`}
      >
        Aerial
      </Button>
    </div>
  );
}

/** Props for {@link LotStep}. */
interface LotStepProps {
  parcelNotice?: ReactNode;
  parcelId: string;
  onPresetChange: (id: string) => void;
  sceneNode: React.ReactNode;
  viewMode: SceneViewMode;
  onViewModeChange: (mode: SceneViewMode) => void;
  hasScan?: boolean;
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
  parcelNotice,
  parcelId,
  onPresetChange,
  sceneNode,
  viewMode,
  onViewModeChange,
  hasScan = false,
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
      <div className="border-b border-lot-line bg-lot-chalk px-6 py-8 lg:px-10">
        <p className="lf-kicker text-lot-orange-ink">Step 1 · Your Lot</p>
        <h2 className="lf-section-heading mt-2 text-lot-ink">Start with your address.</h2>
        <p className="lf-body mt-2 max-w-[60ch] text-lot-stone">
          We&rsquo;ll check available parcel records and market rents. Local zoning and setbacks may need confirmation.
        </p>
        <div className="mt-5 max-w-xl">
          <AddressSearch onSelect={onSelect} onSubmitText={onSubmitText} autoFocusSignal={addressFocusSignal} />
          {parcelLoading && (
            <div className="mt-2 flex items-center gap-2 rounded-none border border-lot-line bg-lot-surface px-3 py-2 text-xs text-lot-stone">
              <span className="block h-3.5 w-3.5 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange" />
              Looking up property data…
            </div>
          )}
          {parcelError && (
            <div
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-none border border-status-blocked/40 bg-status-blocked-soft p-3 text-xs text-status-blocked"
            >
              <Search size={14} className="mt-0.5 shrink-0" />
              {parcelError}
            </div>
          )}
        </div>
        <details className="mt-4 max-w-xl border-y border-lot-line">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lot-orange-ink">Try a sample property</summary>
          <label className="block pb-4 text-sm text-lot-stone">
            Sample Property
            <Select value={parcelId} onChange={(event) => onPresetChange(event.target.value)} className="mt-2 block">
              {parcelPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} ({preset.lotArea.toLocaleString()} sf)</option>)}
            </Select>
          </label>
        </details>
        {parcelNotice}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {hasParcel && <div>
              <p className="lf-kicker-dense text-lot-stone">If built</p>
              <MoneyFigure value={monthlyRent} animate size="inline" tone="onLight" className="mt-0.5" />
            </div>}
            <Button variant="commit" rightIcon={<ArrowRight size={16} />} onClick={onContinue}>
              Continue to Rules &amp; Fit
            </Button>
          </div>
      </div>
      <SceneSection sceneNode={sceneNode} viewMode={viewMode} onViewModeChange={onViewModeChange} hasScan={hasScan} />
    </div>
  );
}
