import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeAddressQuery, peekAddressQuery, stashAddressQuery } from "./address-handoff";

describe("address-handoff", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  it("round-trips a stashed address to the consumer", () => {
    stashAddressQuery("456 Pine St, Denver, CO");
    expect(consumeAddressQuery()).toBe("456 Pine St, Denver, CO");
  });

  it("consumes the address exactly once", () => {
    stashAddressQuery("456 Pine St, Denver, CO");
    expect(consumeAddressQuery()).toBe("456 Pine St, Denver, CO");
    expect(consumeAddressQuery()).toBeNull();
  });

  it("trims surrounding whitespace before stashing", () => {
    stashAddressQuery("   456 Pine St   ");
    expect(consumeAddressQuery()).toBe("456 Pine St");
  });

  it("returns null when nothing has been stashed", () => {
    expect(consumeAddressQuery()).toBeNull();
  });

  it("clears any previously stashed address when given empty input", () => {
    stashAddressQuery("456 Pine St");
    stashAddressQuery("   ");
    expect(consumeAddressQuery()).toBeNull();
  });

  it("leaves nothing readable in storage after consuming", () => {
    stashAddressQuery("456 Pine St");
    consumeAddressQuery();
    // No raw address should linger anywhere in session storage.
    const dump = JSON.stringify({ ...window.sessionStorage });
    expect(dump).not.toContain("456 Pine St");
  });

  it("peeks at the stashed address without consuming it", () => {
    stashAddressQuery("456 Pine St, Denver, CO");
    expect(peekAddressQuery()).toBe("456 Pine St, Denver, CO");
    // Peeking must not consume — the studio's hydration effect still needs it.
    expect(consumeAddressQuery()).toBe("456 Pine St, Denver, CO");
  });

  it("peek returns null when nothing is stashed", () => {
    expect(peekAddressQuery()).toBeNull();
  });

  it("peek degrades to null when sessionStorage reads throw", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    expect(peekAddressQuery()).toBeNull();
  });

  // jsdom's Storage methods can't be intercepted via vi.spyOn(window.sessionStorage, …),
  // so replace the whole object with vi.stubGlobal to actually exercise the throw path.
  it("degrades to null when sessionStorage reads throw", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    expect(consumeAddressQuery()).toBeNull();
  });

  it("does not throw when sessionStorage writes throw", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage blocked");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    });
    expect(() => stashAddressQuery("456 Pine St")).not.toThrow();
  });
});
