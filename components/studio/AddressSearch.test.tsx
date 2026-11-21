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
    expect(input).toHaveAttribute("placeholder", "123 Main St, City, ST…");
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

  it("suppresses all suggestion sources for signed-out visitors", async () => {
    // Guests must never spend metered suggestion quota (browser Places or
    // /api/suggest), so they get no dropdown. They are still pointed at the
    // free-text Search button rather than an account wall: the parcel context
    // resolves that path on the keyless chain under the guest allowance.
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={vi.fn()} />);

    await user.type(screen.getByLabelText("Search property address"), "456 Pine St");
    // Wait out the 300ms suggestion debounce before asserting nothing fired.
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/type a full address/i);
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it("forwards a signed-out visitor's free-text address to the consumer", async () => {
    // The guest's whole path is the Search button. If this stopped forwarding,
    // the free first lookup would silently do nothing.
    const user = userEvent.setup();
    const onSubmitText = vi.fn();
    vi.stubGlobal("fetch", vi.fn());

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={onSubmitText} />);

    await user.type(
      screen.getByLabelText("Search property address"),
      "456 Pine St, Austin, TX",
    );
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(onSubmitText).toHaveBeenCalledWith("456 Pine St, Austin, TX");
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

  it("selects active suggestion when Tab is pressed", async () => {
    signIn();
    const user = userEvent.setup();
    const onSubmitText = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          suggestions: ["123 Maple St, Seattle, WA, USA", "456 Pine St, Denver, CO, USA"],
        }),
      }),
    );

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={onSubmitText} />);
    const input = screen.getByLabelText("Search property address");
    await user.type(input, "Maple");

    await screen.findByRole("option", { name: /123 Maple St/i }, { timeout: 2000 });

    // Navigate to the first suggestion and press Tab
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Tab}");

    expect(onSubmitText).toHaveBeenCalledWith("123 Maple St, Seattle, WA, USA");
  });

  it("does not accept a suggestion from an edited query before the list refreshes", async () => {
    signIn();
    const user = userEvent.setup();
    const onSubmitText = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ suggestions: ["123 Maple St, Seattle, WA, USA"] }),
      }),
    );

    render(<AddressSearch onSelect={vi.fn()} onSubmitText={onSubmitText} />);
    const input = screen.getByLabelText("Search property address");
    await user.type(input, "Maple");
    await screen.findByRole("option", { name: /123 Maple St/i }, { timeout: 2000 });
    await user.keyboard("{ArrowDown}");

    // Edit the query and leave before the 300 ms refresh: the highlighted
    // suggestion belongs to "Maple", so it must not replace "Maple Ave".
    await user.type(input, " Ave");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Tab}");
    expect(onSubmitText).not.toHaveBeenCalled();
    expect(input).toHaveValue("Maple Ave");

    // Enter on the stale list searches the edited text instead.
    input.focus();
    await user.keyboard("{Enter}");
    expect(onSubmitText).toHaveBeenCalledTimes(1);
    expect(onSubmitText).toHaveBeenCalledWith("Maple Ave");
  });

  it("automatically picks top suggestion on submit when onSubmitText is omitted", async () => {
    signIn();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_PLACES_KEY", `AIza${"B".repeat(35)}`);
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const fetchFieldsMock = vi.fn().mockResolvedValue(undefined);
    const placeMock = {
      location: {
        lat: () => 32.7157,
        lng: () => -117.1611,
      },
      formattedAddress: "555 Elm St, San Diego, CA, USA",
      fetchFields: fetchFieldsMock,
    };
    const placePredictionMock = {
      text: { text: "555 Elm St, San Diego, CA, USA" },
      toPlace: () => placeMock,
    };
    (globalThis as unknown as { google: unknown }).google = {
      maps: {
        places: {
          AutocompleteSessionToken: vi.fn(),
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: vi.fn().mockResolvedValue({
              suggestions: [{ placePrediction: placePredictionMock }],
            }),
          },
        },
      },
    };
    vi.mocked(importLibrary).mockResolvedValue(undefined as never);

    render(<AddressSearch onSelect={onSelect} />);
    const input = screen.getByLabelText("Search property address");
    await user.type(input, "555 Elm");

    await screen.findByRole("option", { name: /555 Elm St/i }, { timeout: 2000 });

    // Click search button without pressing ArrowDown (activeIndex === -1)
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(fetchFieldsMock).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledWith({
      lat: 32.7157,
      lng: -117.1611,
      formattedAddress: "555 Elm St, San Diego, CA, USA",
    });
  });

  it("fires onQueryChange on typing and clearing, and renders privacy note when enabled", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(<AddressSearch onSelect={vi.fn()} onQueryChange={onQueryChange} showPrivacyNote />);

    expect(
      screen.getByText(
        /We only use your address to fetch lot geometry and zoning rules\. We don't save your address or contact you unless you create an account\./i,
      ),
    ).toBeInTheDocument();

    const input = screen.getByLabelText("Search property address");
    await user.type(input, "512");
    expect(onQueryChange).toHaveBeenLastCalledWith("512");

    await user.clear(input);
    expect(onQueryChange).toHaveBeenLastCalledWith("");
  });
});
