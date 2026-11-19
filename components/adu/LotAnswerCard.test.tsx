import { readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LotAnswerCard } from "./LotAnswerCard";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import { GeocodeError } from "@/lib/geocode-api";
import { ParcelFetchError } from "@/lib/parcel-api";
import { GUEST_LOOKUP_LIMIT, guestLookupsRemaining, resetGuestLookups } from "@/lib/guest-lookup";
import { clearInitialParcel, peekInitialParcel } from "@/lib/parcel-handoff";
import { writeConsent } from "@/lib/analytics/consent";
import { GTAG_READY_EVENT } from "@/lib/analytics/gtag";
import type { LiveParcelData } from "@/lib/parcel-types";

const { pushMock, acquireMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  acquireMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/live-parcel-acquisition", () => ({
  acquireLiveParcel: acquireMock,
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockLandingAuthGate({
      onAuthenticated,
      onDismiss,
      initialMode,
    }: {
      onAuthenticated: () => void;
      onDismiss: () => void;
      initialMode?: "sign-in" | "sign-up";
    }) {
      return (
        <div role="dialog" data-initial-mode={initialMode}>
          <button type="button" onClick={onAuthenticated}>
            Complete sign in
          </button>
          <button type="button" onClick={onDismiss}>
            Dismiss sign in
          </button>
        </div>
      );
    },
}));

function buildLiveParcel(overrides: Partial<LiveParcelData> = {}): LiveParcelData {
  return {
    ...SAMPLE_LIVE_PARCEL,
    marketData: {
      ...SAMPLE_LIVE_PARCEL.marketData,
      rentByBedroom: { ...SAMPLE_LIVE_PARCEL.marketData.rentByBedroom },
    },
    setbacks: { ...SAMPLE_LIVE_PARCEL.setbacks },
    ...overrides,
  };
}

describe("LotAnswerCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetGuestLookups();
    clearInitialParcel();
    delete window.gtag;
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    acquireMock.mockResolvedValue(buildLiveParcel());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
  });

  it("stays Firebase-free and only reaches LandingAuthGate via dynamic non-SSR import", () => {
    const source = readFileSync(path.join(__dirname, "LotAnswerCard.tsx"), "utf8");
    for (const specifier of ["@/lib/auth-context", "@/components/auth/AuthModal", "firebase"]) {
      expect(source).not.toMatch(new RegExp(`^import[^;]*["'][^"']*${specifier}`, "m"));
    }
    expect(source).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\("@\/components\/landing\/LandingAuthGate"\)/);
    expect(source).toMatch(/ssr:\s*false/);
  });

  it("answers with a status teaser and keeps lot facts and figures for the Studio and certificate", async () => {
    render(<LotAnswerCard surface="guide" />);

    fireEvent.change(screen.getByLabelText("Your street address"), {
      target: { value: "500 Cedar Ave, San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    const region = await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    expect(region).toHaveTextContent("500 Cedar Ave, San Jose, CA");
    expect(region).toHaveTextContent("Needs Review");
    expect(region).toHaveTextContent(/backyard home fits this lot/);
    expect(region).toHaveTextContent(/Early planning estimates only/);
    expect(screen.getByRole("button", { name: "Open in 3D" })).toBeInTheDocument();
    for (const detail of ["5,600 sq ft", "44′ × 127′", "R-1", "Fits the estimated model", "$2,500", "$266K", "14.2 yrs", "HUD FMR"]) {
      expect(region).not.toHaveTextContent(detail);
    }
    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT - 1);
  });

  it("reports a geometry placement conflict even when coverage alone is compliant", async () => {
    // 15,000 sq ft lot (very low coverage) but only 26 ft wide with 5 ft side setbacks -> 16 ft usable width,
    // which cannot fit the default 20x30 ADU.
    acquireMock.mockResolvedValue(
      buildLiveParcel({
        lotArea: 15000,
        lotWidth: 26,
        lotLength: 576,
        existingHouseSqft: 1000,
        maxLotCoveragePercent: 60,
        setbacks: { front: 20, rear: 20, side: 5 },
      }),
    );
    render(<LotAnswerCard surface="guide" />);

    fireEvent.change(screen.getByLabelText("Your street address"), {
      target: { value: "500 Narrow Lot, San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    const region = await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    // The chip reads evidence-aware scene placement (`describePlacement`), not raw zoningStatus.
    expect(region).toHaveTextContent("Unlikely");
  });

  it("visibly marks estimated dimensions when source is fallback", async () => {
    acquireMock.mockResolvedValue(
      buildLiveParcel({
        source: "fallback",
        zoning: "R-1 (assumed)",
      }),
    );
    render(<LotAnswerCard surface="cost" />);

    fireEvent.change(screen.getByLabelText("Your street address"), {
      target: { value: "500 Cedar Ave, San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    const region = await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    expect(region).toHaveTextContent(/Estimated dimensions/i);
    expect(region).toHaveTextContent(/Exact parcel data unavailable/i);
  });

  it("never presents partial or non-address geocodes as exact properties", async () => {
    const estimated = {
      status: "defaulted" as const, source: { provider: "test", dataset: "estimated lot" },
      retrievedAt: "2026-11-16T00:00:00Z", confidence: "low" as const, warnings: [],
    };
    acquireMock.mockResolvedValue(
      buildLiveParcel({
        dataQuality: {
          version: 1,
          fields: {
            address: estimated, lotArea: estimated, lotDimensions: estimated,
            existingHouseSqft: estimated, maxLotCoveragePercent: estimated,
            setbacks: estimated, zoning: estimated, boundaryGeoJson: estimated,
          },
          providerAttempts: [],
          warnings: [],
          geocode: {
            requestedAddress: "San Jose, CA",
            formattedAddress: "San Jose, Santa Clara County, CA",
            match: {
              provider: "nominatim",
              matchType: "city",
              precision: "locality",
              partialMatch: false,
              components: { city: "San Jose", state: "CA" },
              evidence: {
                status: "observed",
                source: { provider: "OpenStreetMap", dataset: "Nominatim" },
                retrievedAt: "2026-11-16T00:00:00Z",
                confidence: "low",
                warnings: [],
              },
            },
          },
        },
      }),
    );
    render(<LotAnswerCard surface="landing" />);

    fireEvent.change(screen.getByLabelText("Your street address"), {
      target: { value: "San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    const region = await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    expect(region).toHaveTextContent("Approximate area");
    expect(region).toHaveTextContent("Approximate match near San Jose, Santa Clara County, CA");
    expect(region).toHaveTextContent(/not confirmed for an exact street property/i);
    expect(region).not.toHaveTextContent("500 Cedar Ave, San Jose, CA");
  });

  it("handles failure and retry without consuming a guest lookup", async () => {
    acquireMock
      .mockRejectedValueOnce(new GeocodeError("Not found", "We couldn't find that address. Try adding the city and state."))
      .mockRejectedValueOnce(new ParcelFetchError("502", "Parcel data is unavailable for this address. Please try again."))
      .mockResolvedValueOnce(buildLiveParcel());

    render(<LotAnswerCard surface="guide" />);
    fireEvent.change(screen.getByLabelText("Your street address"), {
      target: { value: "500 Cedar Ave, San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't find that address/i);
    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Parcel data is unavailable/i);
    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT - 1);
  });

  it("disables in-flight duplicate lookups, ignores superseded responses, and clears stale results on query change", async () => {
    let resolveFirst!: (parcel: LiveParcelData) => void;
    acquireMock.mockImplementationOnce(
      () => new Promise<LiveParcelData>((resolve) => { resolveFirst = resolve; }),
    );

    render(<LotAnswerCard surface="guide" />);
    const input = screen.getByLabelText("Your street address");
    fireEvent.change(input, { target: { value: "100 First St, San Jose, CA" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    const busyBtn = screen.getByRole("button", { name: "Checking…" });
    expect(busyBtn).toBeDisabled();
    fireEvent.submit(input.closest("form")!);
    expect(acquireMock).toHaveBeenCalledTimes(1);

    // Changing the query clears/supersedes the first in-flight lookup.
    fireEvent.change(input, { target: { value: "200 Second St, San Jose, CA" } });
    await act(async () => {
      resolveFirst(buildLiveParcel({ address: "100 First St" }));
    });
    expect(screen.queryByRole("region", { name: "Inline lot feasibility answer" })).not.toBeInTheDocument();

    acquireMock.mockResolvedValueOnce(buildLiveParcel({ address: "200 Second St" }));
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));
    const region = await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    expect(region).toHaveTextContent("200 Second St");

    // Editing after resolution clears the stale answer immediately.
    fireEvent.change(input, { target: { value: "300 Third St, San Jose, CA" } });
    expect(screen.queryByRole("region", { name: "Inline lot feasibility answer" })).not.toBeInTheDocument();
  });

  it("stashes the parcel on Open in 3D without putting address or coordinates in the URL and emits consent-gated PII-free analytics", async () => {
    writeConsent("denied");
    const gtag = vi.fn();
    window.gtag = gtag;

    const { unmount } = render(<LotAnswerCard surface="quiz" footprint={400} />);
    fireEvent.change(screen.getByLabelText("Your street address"), {
      target: { value: "500 Cedar Ave, San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    expect(gtag).not.toHaveBeenCalled();

    unmount();
    writeConsent("granted");
    delete window.gtag;

    render(<LotAnswerCard surface="quiz" footprint={400} />);
    fireEvent.change(screen.getByLabelText("Your street address"), {
      target: { value: "500 Cedar Ave, San Jose, CA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));

    await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    window.gtag = gtag;
    act(() => {
      window.dispatchEvent(new Event(GTAG_READY_EVENT));
    });

    await waitFor(() =>
      expect(gtag).toHaveBeenCalledWith(
        "event",
        "lot_answer_viewed",
        expect.objectContaining({
          surface: "quiz",
          parcel_source: "regrid",
          feasibility_status: "review_needed",
          lot_size_bucket: "5000_7499",
          adu_sqft_bucket: "400_599",
          lot_quality: "parcel_record",
          state_code: "CA",
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Open in 3D" }));
    expect(peekInitialParcel()).toEqual(buildLiveParcel());
    expect(pushMock).toHaveBeenCalledExactlyOnceWith("/studio?size=400");
    expect(pushMock.mock.calls[0][0]).not.toMatch(/Cedar|500|37\.335|-121\.889/);

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "lot_answer_open_studio",
      expect.objectContaining({
        surface: "quiz",
        parcel_source: "regrid",
        feasibility_status: "review_needed",
        adu_sqft_bucket: "400_599",
      }),
    );

    const payload = JSON.stringify(gtag.mock.calls);
    expect(payload).not.toContain("500 Cedar");
    expect(payload).not.toContain("37.335");
    expect(payload).not.toContain("-121.889");
  });

  it("opens the lazy auth gate after 3 guest lookups and routes signed-in members without stranding", async () => {
    render(<LotAnswerCard surface="guide" />);
    const input = screen.getByLabelText("Your street address");

    for (let i = 1; i <= GUEST_LOOKUP_LIMIT; i += 1) {
      fireEvent.change(input, { target: { value: `${i}00 Cedar Ave, San Jose, CA` } });
      fireEvent.click(screen.getByRole("button", { name: "Check my address" }));
      await screen.findByRole("region", { name: "Inline lot feasibility answer" });
    }
    expect(guestLookupsRemaining()).toBe(0);

    fireEvent.change(input, { target: { value: "400 Cedar Ave, San Jose, CA" } });
    fireEvent.click(screen.getByRole("button", { name: "Check my address" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Complete sign in" }));
    expect(guestLookupsRemaining()).toBe(GUEST_LOOKUP_LIMIT);
    expect(pushMock).toHaveBeenCalledExactlyOnceWith("/studio");
  });
});
