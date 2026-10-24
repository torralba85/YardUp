import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ParcelTerrainPreview from "./ParcelTerrainPreview";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import { createTerrainGrid, FEET_PER_METER, type ParcelTerrain } from "@/lib/parcel-terrain";
import type { LiveParcelData } from "@/lib/parcel-types";

vi.mock("@react-three/fiber", () => ({ Canvas: () => <div data-testid="canvas-stub" /> }));
vi.mock("@react-three/drei", () => ({ Line: () => null, OrbitControls: () => null }));
vi.mock("./AduArchitecture", () => ({ AduArchitecture: () => null }));

function parcel(offset = 0): LiveParcelData {
  return { ...parcelPresets[0], address: `Terrain test ${offset}`, lat: 37, lng: -122 + offset, source: "county-gis", state: "CA", zip: "94103", zoning: "Unverified", boundaryGeoJson: { type: "Polygon", coordinates: [[[-122.001 + offset, 37], [-122 + offset, 37], [-122 + offset, 37.001], [-122.001 + offset, 37.001], [-122.001 + offset, 37]]] } };
}
function data(p: LiveParcelData): ParcelTerrain {
  const grid = createTerrainGrid(p.boundaryGeoJson)!;
  return { grid, elevations: grid.points.map((point) => (100 + point.x * 0.1) / FEET_PER_METER), source: "USGS 3DEP", verticalDatum: "NAVD88", resolutionMeters: 1, acquiredYears: [2023], fetchedAt: "2026-10-22" };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("terrain preview", () => {
  it("never asks for elevations on a demo, fallback or unresolved lookup", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const view = render(<ParcelTerrainPreview parcel={parcelPresets[0]} config={defaultAduConfig} />);
    expect(screen.getByRole("status")).toHaveTextContent("Search a real address");
    view.rerender(<ParcelTerrainPreview parcel={{ ...parcel(), source: "fallback" }} config={defaultAduConfig} />);
    view.rerender(<ParcelTerrainPreview parcel={parcel()} config={defaultAduConfig} pending />);
    expect(screen.getByRole("status")).toHaveTextContent("Resolve your property lookup");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("updates grade under the rotated ADU without requesting new elevations", async () => {
    const p = parcel(0.01);
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => data(p) });
    vi.stubGlobal("fetch", fetcher);
    const view = render(<ParcelTerrainPreview parcel={p} config={{ ...defaultAduConfig, width: 20, length: 40 }} />);
    await waitFor(() => expect(screen.getByTestId("terrain-footprint-relief")).toHaveTextContent("2.0 ft"));
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole("button", { name: "Rotate 15°" }));
    expect(screen.getByTestId("terrain-footprint-relief")).toHaveTextContent("4.0 ft");
    fireEvent.click(screen.getByRole("button", { name: "Move ADU north" }));
    view.rerender(<ParcelTerrainPreview parcel={p} config={{ ...defaultAduConfig, width: 20, length: 30 }} />);
    expect(screen.getByTestId("terrain-footprint-relief")).toHaveTextContent("3.0 ft");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/separate from your saved layout/)).toBeVisible();
  });

  it("ignores a late response from the previously selected parcel", async () => {
    const first = parcel(0.02), second = parcel(0.03);
    let resolveFirst!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockResolvedValueOnce({ ok: false, json: async () => ({ error: "No coverage for the second parcel" }) }));
    const view = render(<ParcelTerrainPreview parcel={first} config={defaultAduConfig} />);
    view.rerender(<ParcelTerrainPreview parcel={second} config={defaultAduConfig} />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No coverage for the second parcel"));
    resolveFirst({ ok: true, json: async () => data(first) });
    await waitFor(() => expect(screen.queryByTestId("terrain-footprint-relief")).not.toBeInTheDocument());
  });
});
