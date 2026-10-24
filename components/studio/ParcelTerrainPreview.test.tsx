import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ParcelTerrainPreview from "./ParcelTerrainPreview";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import { FT_PER_DEG_LAT } from "@/lib/parcel-geometry";
import { createTerrainGrid, FEET_PER_METER, type ParcelTerrain } from "@/lib/parcel-terrain";
import type { LiveParcelData } from "@/lib/parcel-types";

const renderer = vi.hoisted(() => ({ webgl: true, fails: false }));
vi.mock("@react-three/fiber", () => ({
  Canvas: () => {
    if (renderer.fails) throw new Error("Error creating WebGL context.");
    return <div data-testid="canvas-stub" />;
  },
}));
vi.mock("@react-three/drei", () => ({ Line: () => null, OrbitControls: () => null }));
vi.mock("./AduArchitecture", () => ({ AduArchitecture: () => null }));
vi.mock("@/lib/webgl", () => ({ isWebGLAvailable: () => renderer.webgl }));

function parcel(offset = 0): LiveParcelData {
  return { ...parcelPresets[0], address: `Terrain test ${offset}`, lat: 37, lng: -122 + offset, source: "county-gis", state: "CA", zip: "94103", zoning: "Unverified", boundaryGeoJson: { type: "Polygon", coordinates: [[[-122.001 + offset, 37], [-122 + offset, 37], [-122 + offset, 37.001], [-122.001 + offset, 37.001], [-122.001 + offset, 37]]] } };
}
/** A rectangular parcel of the given east-west width and north-south depth, centred on 37°N. */
function sized(widthFt: number, depthFt: number, offset: number): LiveParcelData {
  const halfLat = depthFt / 2 / FT_PER_DEG_LAT, halfLng = widthFt / 2 / (FT_PER_DEG_LAT * Math.cos(37 * Math.PI / 180));
  const [west, east, south, north] = [-122 + offset - halfLng, -122 + offset + halfLng, 37 - halfLat, 37 + halfLat];
  return { ...parcel(offset), boundaryGeoJson: { type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] } };
}
function data(p: LiveParcelData): ParcelTerrain {
  const grid = createTerrainGrid(p.boundaryGeoJson)!;
  return { grid, elevations: grid.points.map((point) => (100 + point.x * 0.1) / FEET_PER_METER), source: "USGS 3DEP", verticalDatum: "NAVD88", resolutionMeters: 1, acquiredYears: [2023], fetchedAt: "2026-10-22" };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); renderer.webgl = true; renderer.fails = false; });

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

  it("reaches fitting headings past ones that leave the sampled ground", async () => {
    // A 25 × 40 ft ADU fits a 100 × 35 ft patch only within 15° of a quarter turn.
    const p = sized(100, 35, 0.04);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data(p) }));
    render(<ParcelTerrainPreview parcel={p} config={{ ...defaultAduConfig, width: 25, length: 40 }} />);
    const relief = await screen.findByTestId("terrain-footprint-relief");
    expect(relief).toHaveAttribute("aria-live", "polite");
    expect(relief).toHaveAttribute("aria-atomic", "true");
    expect(relief).toHaveTextContent("ground change beneath this ADU");
    expect(screen.getByText(/90° rotation/)).toBeInTheDocument();
    const rotate = screen.getByRole("button", { name: "Rotate 15°" });
    fireEvent.click(rotate);
    expect(relief).toHaveTextContent("ground change beneath this ADU");
    fireEvent.click(rotate);
    expect(relief).toHaveTextContent("ADU extends beyond the sampled ground");
    expect(screen.getByText(/120° rotation/)).toBeInTheDocument();
    for (let i = 0; i < 9; i++) fireEvent.click(rotate);
    expect(screen.getByText(/255° rotation/)).toBeInTheDocument();
    expect(relief).toHaveTextContent("ground change beneath this ADU");
    fireEvent.click(screen.getByRole("button", { name: "Reset position" }));
    expect(screen.getByText(/90° rotation/)).toBeInTheDocument();
  });

  it("lets a rotated ADU that leaves the sampled ground step back inside", async () => {
    const p = sized(66, 66, 0.05);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data(p) }));
    render(<ParcelTerrainPreview parcel={p} config={defaultAduConfig} />);
    const relief = await screen.findByTestId("terrain-footprint-relief");
    const east = screen.getByRole("button", { name: "Move ADU east" });
    for (let i = 0; i < 4; i++) fireEvent.click(east);
    expect(relief).toHaveTextContent("ground change beneath this ADU");
    fireEvent.click(screen.getByRole("button", { name: "Rotate 15°" }));
    expect(relief).toHaveTextContent("ADU extends beyond the sampled ground");
    fireEvent.click(east);
    expect(screen.getByRole("status")).toHaveTextContent("Keep the whole ADU inside the sampled ground area.");
    fireEvent.click(screen.getByRole("button", { name: "Move ADU west" }));
    expect(relief).toHaveTextContent("ground change beneath this ADU");
    expect(screen.getByText(/15° rotation/)).toBeInTheDocument();
  });

  it("explains a browser without WebGL instead of requesting elevations", () => {
    renderer.webgl = false;
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<ParcelTerrainPreview parcel={parcel(0.06)} config={defaultAduConfig} />);
    expect(screen.getByRole("status")).toHaveTextContent("Terrain preview needs WebGL");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps a renderer failure inside the terrain preview", async () => {
    renderer.fails = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const p = parcel(0.07);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data(p) }));
    render(<ParcelTerrainPreview parcel={p} config={defaultAduConfig} />);
    expect(await screen.findByText(/Terrain preview needs WebGL/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Terrain preview" })).toBeInTheDocument();
  });
});
