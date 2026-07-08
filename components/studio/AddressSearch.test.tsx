import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AddressSearch from "./AddressSearch";
import { importLibrary } from "@googlemaps/js-api-loader";

vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AddressSearch", () => {
  it("keeps the embedded Search button nested inside the rounded-full input", () => {
    // Regression: the input is a 44px (h-11) `rounded-full` pill, so its border
    // curves inward at the top/bottom-right. A 32px (h-8) button pinned 6px
    // (right-1.5) from the edge pokes its rounded corners past that curve. The
    // button must stay shorter than the input and inset far enough to nest
    // concentrically — jsdom can't measure layout, so guard the class tokens.
    render(<AddressSearch onSelect={vi.fn()} onSubmitText={vi.fn()} />);

    const button = screen.getByRole("button", { name: /search/i });
    expect(button.className).toContain("h-7");
    expect(button.className).toContain("right-2.5");
    expect(button.className).not.toContain("h-8");
    expect(button.className).not.toMatch(/right-1\.5\b/);
  });

  it("submits typed addresses through the free-text search path", async () => {
    const user = userEvent.setup();
    const onSubmitText = vi.fn();

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={onSubmitText} />);

    await user.type(
      screen.getByLabelText("Search property address"),
      "456 Pine St, Denver, CO",
    );
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(onSubmitText).toHaveBeenCalledWith("456 Pine St, Denver, CO");
  });

  it("shows server-backed suggestions while typing and searches the picked one", async () => {
    const user = userEvent.setup();
    const onSubmitText = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          suggestions: ["456 Pine St, Denver, CO, USA"],
        }),
      }),
    );

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={onSubmitText} />);

    await user.type(
      screen.getByLabelText("Search property address"),
      "456 Pine",
    );

    const option = await screen.findByRole(
      "option",
      { name: /456 Pine St, Denver, CO, USA/ },
      { timeout: 2000 },
    );
    await user.click(option);

    expect(onSubmitText).toHaveBeenCalledWith("456 Pine St, Denver, CO, USA");
  });

  it("falls back to server suggestions when the configured key is malformed", async () => {
    // A mangled deploy-time key (e.g. "-") must not disable autocomplete
    // entirely — the component should behave as if no key were configured.
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_PLACES_KEY", "-");
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: ["789 Oak Ave, Austin, TX, USA"] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={vi.fn()} />);

    await user.type(screen.getByLabelText("Search property address"), "789 Oak");

    await screen.findByRole(
      "option",
      { name: /789 Oak Ave, Austin, TX, USA/ },
      { timeout: 2000 },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/suggest"),
      expect.anything(),
    );
  });

  it("falls back to server suggestions when the Places library fails to load", async () => {
    // Well-formed key, but Google rejects it (InvalidKey, referrer block, …):
    // importLibrary rejects and the server path must take over.
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_PLACES_KEY", `AIza${"A".repeat(35)}`);
    vi.mocked(importLibrary).mockRejectedValue(new Error("InvalidKey"));
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: ["12 Cedar Ln, Portland, OR, USA"] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={vi.fn()} />);

    await user.type(screen.getByLabelText("Search property address"), "12 Cedar");

    await screen.findByRole(
      "option",
      { name: /12 Cedar Ln, Portland, OR, USA/ },
      { timeout: 2000 },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/suggest"),
      expect.anything(),
    );
  });
});
