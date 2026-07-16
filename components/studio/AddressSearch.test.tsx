import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AddressSearch from "./AddressSearch";
import { importLibrary } from "@googlemaps/js-api-loader";

vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | { getIdToken: () => Promise<string> },
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mocks.authState,
}));

function signIn() {
  mocks.authState.user = { getIdToken: async () => "token" };
}

beforeEach(() => {
  mocks.authState.user = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AddressSearch", () => {
  it("uses a compact visible placeholder without shortening its accessible name", () => {
    render(<AddressSearch onSelect={vi.fn()} onSubmitText={vi.fn()} />);

    const input = screen.getByLabelText("Search property address");
    expect(input).toHaveAttribute("placeholder", "Search property address…");
  });

  it("keeps the embedded Search button nested inside the rounded-full input", () => {
    // Regression: the input is a 44px (h-11) `rounded-full` pill, so its border
    // curves inward at the top/bottom-right. A 32px (h-8) button pinned 6px
    // (right-1.5) from the edge poked its rounded corners past that curve. The
    // button must stay shorter than the input and inset far enough to nest
    // concentrically. Layout can't be measured in jsdom, so assert the inset +
    // height tokens; full visual coverage lives in the studio Playwright specs.
    render(<AddressSearch onSelect={vi.fn()} onSubmitText={vi.fn()} />);

    const button = screen.getByRole("button", { name: /search/i });
    expect(button.classList.contains("h-7")).toBe(true);
    expect(button.classList.contains("right-2.5")).toBe(true);
    // The exact values that made the button protrude must not come back.
    expect(button.classList.contains("h-8")).toBe(false);
    expect(button.classList.contains("right-1.5")).toBe(false);
    // The 28px visual pill alone is too small a touch target: an invisible
    // ::before overlay must stretch the tappable area to the input's full
    // 44px height (28px + 2×8px) without changing the nested silhouette.
    expect(button.classList.contains("before:absolute")).toBe(true);
    expect(button.classList.contains("before:-inset-y-2")).toBe(true);
    expect(button.classList.contains("before:-inset-x-1")).toBe(true);
    // Anchor to the input's 22px midline, not the form's center: when the
    // no-Places-key helper renders below the input, the form grows taller and
    // a top-1/2 button sinks past the pill's bottom edge.
    expect(button.classList.contains("top-5.5")).toBe(true);
    expect(button.classList.contains("top-1/2")).toBe(false);
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
    signIn();
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
    signIn();
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

  it("shows server-backed suggestions for signed-out visitors", async () => {
    // Guests get rate-limited /api/suggest so address autofill works before
    // sign-in (landing + studio handoff).
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_PLACES_KEY", "");
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        suggestions: ["456 Pine St, Denver, CO, USA"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={vi.fn()} />);

    await user.type(screen.getByLabelText("Search property address"), "456 Pine");

    expect(
      await screen.findByRole(
        "option",
        { name: /456 Pine St, Denver, CO, USA/ },
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/suggest"),
      expect.anything(),
    );
  });

  it("falls back to server suggestions when the Places library fails to load", async () => {
    // Well-formed key, but Google rejects it (InvalidKey, referrer block, …):
    // importLibrary rejects and the server path must take over.
    signIn();
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
