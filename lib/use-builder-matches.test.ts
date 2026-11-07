import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BuilderDirectoryProfile } from "@/lib/marketplace-types";

const fetchActiveBuilders = vi.fn<() => Promise<BuilderDirectoryProfile[]>>();
vi.mock("@/lib/marketplace-firestore", () => ({
  fetchActiveBuilders: () => fetchActiveBuilders(),
}));

import { useBuilderMatches } from "./use-builder-matches";

function builder(id: string, city: string, state: string): BuilderDirectoryProfile {
  return {
    id,
    companyName: `Builder ${id}`,
    active: true,
    licensed: true,
    serviceAreas: [{ scope: "city", city, state, key: `${city.toLowerCase()}-${state.toLowerCase()}` }],
  };
}

const sanDiego = { city: "San Diego, CA 92117", state: "CA" };

describe("useBuilderMatches", () => {
  beforeEach(() => {
    fetchActiveBuilders.mockReset();
  });

  it("reports guests without reading the directory", () => {
    const { result } = renderHook(() => useBuilderMatches(false, sanDiego, true));
    expect(result.current).toEqual({ status: "guest" });
    expect(fetchActiveBuilders).not.toHaveBeenCalled();
  });

  it("does not read the directory while the form is closed", () => {
    renderHook(() => useBuilderMatches(true, sanDiego, false));
    expect(fetchActiveBuilders).not.toHaveBeenCalled();
  });

  it("counts the builders who serve the parcel", async () => {
    fetchActiveBuilders.mockResolvedValue([
      builder("a", "San Diego", "CA"),
      builder("b", "San Diego", "CA"),
      builder("c", "Austin", "TX"),
    ]);
    const { result } = renderHook(() => useBuilderMatches(true, sanDiego, true));

    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current).toEqual({ status: "ready", count: 2 }));
  });

  it("reports zero when nobody serves the parcel", async () => {
    fetchActiveBuilders.mockResolvedValue([builder("c", "Austin", "TX")]);
    const { result } = renderHook(() => useBuilderMatches(true, sanDiego, true));
    await waitFor(() => expect(result.current).toEqual({ status: "ready", count: 0 }));
  });

  it("reports a failed directory read as an error, not as zero builders", async () => {
    fetchActiveBuilders.mockRejectedValue(new Error("Unable to load the builder network."));
    const { result } = renderHook(() => useBuilderMatches(true, sanDiego, true));
    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("goes back to loading when the parcel changes", async () => {
    fetchActiveBuilders.mockResolvedValue([builder("a", "San Diego", "CA")]);
    const { result, rerender } = renderHook(
      ({ location }) => useBuilderMatches(true, location, true),
      { initialProps: { location: sanDiego } },
    );
    await waitFor(() => expect(result.current).toEqual({ status: "ready", count: 1 }));

    fetchActiveBuilders.mockReturnValue(new Promise(() => undefined));
    rerender({ location: { city: "Austin, TX 78701", state: "TX" } });
    expect(result.current).toEqual({ status: "loading" });
  });
});
