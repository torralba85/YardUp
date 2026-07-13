"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/** A selected address with its resolved coordinates. */
export interface AddressSearchResult {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** The normalized, human-readable address. */
  formattedAddress: string;
}

/** Props for {@link AddressSearch}. */
export interface AddressSearchProps {
  /** Called when the user picks a resolved address from Places. */
  onSelect: (result: AddressSearchResult) => void;
  /**
   * Called when the user submits free text (Enter / Search button) without
   * picking a Places suggestion; the caller geocodes it server-side. This is
   * the path that works with no Google Places key configured.
   */
  onSubmitText?: (query: string) => void;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Whether the input is disabled. */
  disabled?: boolean;
  /**
   * Bump this to imperatively focus the input (e.g. a "Change address" action
   * elsewhere routes here). Ignored on the initial 0 value so the field never
   * steals focus on first paint.
   */
  autoFocusSignal?: number;
}

/**
 * A single dropdown entry, sourced either from the browser Google Places (New)
 * API (carries a {@link google.maps.places.PlacePrediction}) or the server-side
 * `/api/suggest` fallback (text only).
 */
interface AddressSuggestion {
  text: string;
  prediction: google.maps.places.PlacePrediction | null;
}

let initialized = false;

function initGoogleMaps(apiKey: string) {
  if (!initialized) {
    setOptions({ key: apiKey, libraries: ["places"] });
    initialized = true;
  }
}

/**
 * Whether a value plausibly is a Google browser API key (`AIza` + 35 chars).
 * A mangled deploy-time value (seen in production: `-`) must read as "no key",
 * so the server-suggest fallback stays available instead of a dead dropdown.
 */
function looksLikeBrowserKey(value: string | undefined): value is string {
  return typeof value === "string" && /^AIza[\w-]{35}$/.test(value);
}

/**
 * Address search input with a custom, design-system-styled suggestion dropdown.
 *
 * When `NEXT_PUBLIC_GOOGLE_PLACES_KEY` is set it uses the Google Places (New)
 * API (`AutocompleteSuggestion` + `Place.fetchFields`), resolving the picked
 * place to lat/lng + formatted address via {@link onSelect}. Without a key it
 * falls back to debounced server predictions from `/api/suggest`, submitted as
 * free text via {@link onSubmitText}. Both sources render into the same dropdown.
 *
 * Signed-out visitors get neither source: every suggestion/resolve path spends
 * metered Google quota, so guests see a sign-in note and no dropdown. Free-text
 * submits still forward to {@link onSubmitText} so the consumer can gate them
 * (parcel context answers with its own sign-in message).
 *
 * Migrated off the deprecated `google.maps.places.Autocomplete` widget, which
 * Google no longer offers to new Cloud projects.
 */
export default function AddressSearch({
  onSelect,
  onSubmitText,
  placeholder = "Search property address…",
  disabled = false,
  autoFocusSignal,
}: AddressSearchProps) {
  const hasPlacesKey = looksLikeBrowserKey(process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY);
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  // Suppresses the dropdown from re-opening on the just-picked text.
  const selectedValueRef = useRef("");
  // Set only after a Google prediction fully resolves to coordinates. Gates the
  // "don't resubmit" guard in handleSubmit so server picks — and Google picks
  // whose resolve failed — stay retryable.
  const resolvedValueRef = useRef("");
  // One Autocomplete session spans several keystrokes + one fetchFields call,
  // for correct session-based billing; renewed after each selection.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [loading, setLoading] = useState(hasPlacesKey);
  const [placesReady, setPlacesReady] = useState(false);
  // Google accepted the key format but rejected it at runtime (InvalidKey,
  // referrer block, network) — hand autocomplete to the server path instead.
  const [googleFailed, setGoogleFailed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Both sources feed the same dropdown. Google when a key is loaded and
  // working; otherwise the server fallback (needs a free-text handler). Either
  // way suggestions cost metered API quota, so guests get neither source.
  const signedIn = Boolean(user);
  const googleEnabled = hasPlacesKey && placesReady && !googleFailed && !disabled && signedIn;
  const serverEnabled =
    (!hasPlacesKey || googleFailed) && Boolean(onSubmitText) && !disabled && signedIn;
  const dropdownEnabled = googleEnabled || serverEnabled;

  // Imperative focus when an outside action (e.g. sidebar "Change address")
  // routes the user to this field. Guarded so the initial 0 never auto-focuses.
  useEffect(() => {
    if (autoFocusSignal) inputRef.current?.focus();
  }, [autoFocusSignal]);

  // Load the Places (New) library once when a plausible key is configured.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    if (!looksLikeBrowserKey(apiKey)) return;

    initGoogleMaps(apiKey);
    let active = true;
    importLibrary("places")
      .then(() => {
        if (active) setPlacesReady(true);
      })
      .catch((err: unknown) => {
        console.error("[AddressSearch] Failed to load Places API:", err);
        if (active) setGoogleFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Debounced predictions from whichever source is active.
  useEffect(() => {
    if (!dropdownEnabled) return;
    const query = inputValue.trim();
    if (query.length < 3 || query === selectedValueRef.current) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    // The Places (New) API takes no AbortSignal, so a slow Google response can
    // resolve after a newer keystroke (or unmount). This flag lets us drop those
    // stale results instead of letting them overwrite the current list.
    let active = true;
    const timer = setTimeout(async () => {
      try {
        let next: AddressSuggestion[] = [];

        if (googleEnabled) {
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
          let predictions: google.maps.places.AutocompleteSuggestion[];
          try {
            ({ suggestions: predictions } =
              await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input: query,
                includedRegionCodes: ["US"],
                // Geocoded addresses only (no establishments/POIs) — the parcel
                // lookup needs a property address, not a business whose pin sits
                // off the lot. "geocode" is the API's valid address-type token;
                // "address" is rejected and "street_address" returns nothing for
                // partial input (verified against the live Places (New) API).
                includedPrimaryTypes: ["geocode"],
                sessionToken: sessionTokenRef.current,
              }));
          } catch (err) {
            // The library loaded but Google rejects requests (InvalidKey,
            // referrer block). Flip to the server path; the effect re-runs
            // with the same query and repopulates from /api/suggest.
            console.error("[AddressSearch] Google autocomplete failed:", err);
            if (active) setGoogleFailed(true);
            return;
          }
          if (!active) return;
          next = predictions
            .map((s) => s.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => p !== null)
            .map((p) => ({ text: p.text.text, prediction: p }));
        } else {
          const idToken = await user?.getIdToken();
          const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
            cache: "no-store",
            signal: controller.signal,
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
          });
          if (!res.ok) return;
          const data = (await res.json()) as { suggestions?: string[] };
          next = (Array.isArray(data.suggestions) ? data.suggestions : []).map((text) => ({
            text,
            prediction: null,
          }));
        }

        if (!active) return;
        setSuggestions(next);
        setSuggestionsOpen(next.length > 0);
        setActiveIndex(-1);
      } catch {
        // Stale/aborted or failed fetch — keep whatever is already shown.
      }
    }, 300);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [inputValue, dropdownEnabled, googleEnabled, user]);

  async function pickSuggestion(suggestion: AddressSuggestion) {
    selectedValueRef.current = suggestion.text;
    setInputValue(suggestion.text);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveIndex(-1);

    if (suggestion.prediction) {
      try {
        const place = suggestion.prediction.toPlace();
        await place.fetchFields({
          fields: ["location", "formattedAddress"],
          // Close the Autocomplete session on this Place Details call so it bills
          // as part of the cheaper session bundle rather than a standalone
          // request. `sessionToken` is accepted at runtime but missing from the
          // TS typings (https://issuetracker.google.com/issues/395640965), so we
          // spread it in to bypass excess-property checking. Verified live: the
          // call resolves cleanly with the token present.
          ...(sessionTokenRef.current ? { sessionToken: sessionTokenRef.current } : {}),
        });
        // fetchFields concludes the session; start a fresh token next time.
        sessionTokenRef.current = null;
        if (place.location) {
          const formattedAddress = place.formattedAddress ?? suggestion.text;
          selectedValueRef.current = formattedAddress;
          resolvedValueRef.current = formattedAddress;
          setInputValue(formattedAddress);
          onSelect({
            lat: place.location.lat(),
            lng: place.location.lng(),
            formattedAddress,
          });
          return;
        }
      } catch (err) {
        console.error("[AddressSearch] Failed to resolve place:", err);
      }
      // The Google pick didn't resolve to coordinates (fetchFields threw, or no
      // location). Discard the now-spent session token so the next search starts
      // a fresh billing session, and clear the resolved marker so the user can
      // retry — either via the free-text handoff below or a fresh Search press.
      sessionTokenRef.current = null;
      selectedValueRef.current = "";
    }

    // Server-suggestion pick, or a Google pick whose place couldn't resolve.
    onSubmitText?.(suggestion.text);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void pickSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  }

  const isDisabled = disabled;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    const query = inputValue.trim();
    // Skip re-submitting only a fully resolved Google pick. Server picks and
    // failed Google resolves stay retryable so a flaky lookup can be retried.
    if (query && query === resolvedValueRef.current) return;
    if (query && onSubmitText) onSubmitText(query);
  }

  return (
    <form className="relative w-full" onSubmit={handleSubmit} role="search">
      <label htmlFor="address-search" className="sr-only">
        Search property address
      </label>

      {/* Search icon — anchored to the h-11 input's 22px midline (top-5.5), not
          the form's center: helper text below the input stretches the form and
          would drag top-1/2 children out of the pill. */}
      <span
        className="pointer-events-none absolute left-3 top-5.5 -translate-y-1/2 text-lf-muted"
        aria-hidden="true"
      >
        {loading ? (
          <span
            className="block h-4 w-4 animate-spin rounded-full border-2 border-lf-hairline border-t-lf-clay"
            role="status"
            aria-label="Loading address search"
          />
        ) : (
          <Search size={16} />
        )}
      </span>

      <input
        id="address-search"
        ref={inputRef}
        type="search"
        autoComplete="off"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setSuggestionsOpen(false);
          setActiveIndex(-1);
        }}
        placeholder={placeholder}
        disabled={isDisabled}
        aria-label="Search property address"
        aria-busy={loading}
        role={dropdownEnabled ? "combobox" : undefined}
        aria-autocomplete={dropdownEnabled ? "list" : undefined}
        aria-expanded={dropdownEnabled ? suggestionsOpen : undefined}
        aria-controls={dropdownEnabled ? "address-suggestions" : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined
        }
        className={[
          "h-11 w-full rounded-full border pl-9 pr-26 text-sm",
          "bg-lf-card text-lf-espresso placeholder:text-lf-taupe",
          "outline-none transition",
          "focus:border-lf-clay focus:ring-2 focus:ring-lf-clay/15",
          isDisabled
            ? "cursor-not-allowed border-lf-hairline opacity-60"
            : "border-lf-hairline hover:border-lf-taupe/70",
        ].join(" ")}
      />

      <button
        type="submit"
        disabled={isDisabled || !inputValue.trim()}
        className="absolute right-2.5 top-5.5 inline-flex h-7 -translate-y-1/2 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] disabled:cursor-not-allowed disabled:bg-lf-taupe-soft disabled:text-lf-muted enabled:bg-lf-clay enabled:text-lf-sand enabled:hover:bg-lf-clay-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-1"
      >
        <MapPin size={13} aria-hidden="true" />
        Search
      </button>

      {suggestionsOpen && suggestions.length > 0 && (
        <ul
          id="address-suggestions"
          role="listbox"
          aria-label="Address suggestions"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-lf-hairline bg-lf-card shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.prediction?.placeId ?? suggestion.text}
              id={`address-suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // onMouseDown so the pick fires before the input's blur closes the list
              onMouseDown={(event) => {
                event.preventDefault();
                void pickSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-3 text-sm text-lf-espresso ${
                index === activeIndex ? "bg-lf-sand-2" : ""
              }`}
            >
              <MapPin size={13} className="shrink-0 text-lf-clay" aria-hidden="true" />
              <span className="truncate">{suggestion.text}</span>
            </li>
          ))}
          {/* Google Maps Platform requires visible attribution when Places
              predictions are shown outside a Google map (the legacy widget
              supplied this automatically). Only the Google-sourced list needs it. */}
          {googleEnabled && (
            <li
              role="presentation"
              className="flex items-center justify-end gap-1 border-t border-lf-hairline px-3 py-1.5 text-[10px] uppercase tracking-wide text-lf-muted"
            >
              Powered by Google
            </li>
          )}
        </ul>
      )}

      {/* Pin icon on the right when Places is active and a value is entered */}
      {googleEnabled && inputValue && !onSubmitText && (
        <span
          className="pointer-events-none absolute right-3 top-5.5 -translate-y-1/2 text-lf-clay"
          aria-hidden="true"
        >
          <MapPin size={15} />
        </span>
      )}

      {!signedIn ? (
        <p className="mt-1.5 text-xs text-lf-muted" role="note">
          Sign in to search a real address.
        </p>
      ) : !loading && !hasPlacesKey ? (
        <p className="mt-1.5 text-xs text-lf-muted" role="note">
          Type a full address (street, city, state) and press Search.
        </p>
      ) : null}
    </form>
  );
}
