import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AerialView from "./AerialView";
import { defaultAduConfig } from "@/lib/feasibility";
import type { LiveParcelData } from "@/lib/parcel-types";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null }) }));

const parcel: LiveParcelData = {
  address: "Public test address", city: "Seattle, WA", state: "WA", zip: "98115",
  lat: 47.69, lng: -122.31, source: "fallback", zoning: "Unknown",
  boundaryGeoJson: null, lotArea: 5000, lotWidth: 40, lotLength: 125,
  existingHouseSqft: 0, maxLotCoveragePercent: 40, setbacks: { front: 20, rear: 20, side: 5 },
};

function draw(input = parcel) {
  return render(<AerialView parcel={input} config={defaultAduConfig} pose={{ x: 0, z: 0, rotationDeg: 0 }} isCompliant />);
}

describe("aerial context honesty", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, headers: new Headers(), blob: async () => new Blob(["image"]),
    }));
    vi.stubGlobal("URL", class extends URL {
      static createObjectURL = vi.fn(() => "blob:aerial-test");
      static revokeObjectURL = vi.fn();
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not invent house, ADU or setback locations for a missing boundary", async () => {
    const { container } = draw();
    await screen.findByAltText("Satellite context near Public test address");
    expect(screen.getByText(/Imagery is context only/)).toBeInTheDocument();
    expect(screen.getByText(/Parcel boundary unavailable/)).toBeInTheDocument();
    expect(container.querySelectorAll("svg polygon")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/EXISTING HOUSE|PROPOSED ADU|Rear Setback|Front Setback/);
    expect(screen.getByLabelText("Zoning designation, not approval")).toHaveTextContent("Unknown");
    expect(screen.queryByLabelText("Zoning status: Compliant")).not.toBeInTheDocument();
  });

  it("shows a recorded boundary without fabricating a house or geographic ADU pose", async () => {
    const { container } = draw({ ...parcel, source: "county-gis", boundaryGeoJson: {
      type: "Polygon", coordinates: [[[-122.31, 47.69], [-122.3099, 47.69], [-122.3099, 47.6901], [-122.31, 47.69]]],
    } });
    await screen.findByAltText("Satellite context near Public test address");
    await waitFor(() => expect(container.querySelectorAll("svg polygon")).toHaveLength(2));
    expect(screen.getByText(/published GIS boundary, not a survey/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/EXISTING HOUSE|PROPOSED ADU|Rear Setback|Front Setback/);
  });

  it("does not assert geographic geometry on the provider's fallback grid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, headers: new Headers({ "X-Aerial-Fallback": "true" }), blob: async () => new Blob(["grid"]) } as Response);
    const { container } = draw();
    await screen.findByText("Aerial imagery unavailable");
    expect(container.querySelectorAll("svg polygon")).toHaveLength(0);
    expect(screen.getByText(/Satellite detail is unavailable/)).toHaveTextContent("Use the 3D model for conceptual placement");
  });

  it("keeps wrapped provider credits and context in separate normal-flow footer rows", async () => {
    const credit = "Imagery: Esri, Maxar, Earthstar Geographics, and the GIS User Community";
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, headers: new Headers({ "X-Aerial-Attribution": credit }), blob: async () => new Blob(["image"]),
    } as Response);
    draw();
    const attribution = await screen.findByText(credit);
    const context = screen.getByText(/Imagery is context only/).closest('[role="note"]')!;
    const footer = screen.getByLabelText("Aerial context and imagery credits");
    expect(footer).toContainElement(attribution);
    expect(footer).toContainElement(context as HTMLElement);
    expect(context).not.toHaveClass("absolute");
    expect(attribution).not.toHaveClass("absolute");
    expect(footer).not.toHaveClass("absolute");
  });

  it("does not crop embedded Google logo or credit pixels", async () => {
    draw();
    const image = await screen.findByAltText("Satellite context near Public test address");
    expect(image).toHaveClass("object-contain");
    expect(image).not.toHaveClass("object-cover");
  });

  it("renders a visible spinner and loading label while aerial imagery is loading", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    draw();
    expect(screen.getByRole("status")).toHaveTextContent("Loading satellite context…");
  });
});
