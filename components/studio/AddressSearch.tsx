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
 * Address search input with a custom, design-system-styled suggestion dropdown.
 *
 * When `NEXT_PUBLIC_GOOGLE_PLACES_KEY` is set it uses the Google Places (New)
 * API (`AutocompleteSuggestion` + `Place.fetchFields`), resolving the picked
 * place to lat/lng + formatted address via {@link onSelect}. Without a key it
 * falls back to debounced server predictions from `/api/suggest`, submitted as
 * free text via {@link onSubmitText}. Both sources render into the same dropdown.
 *
 * Migrated off the deprecated `google.maps.places.Autocomplete` widget, which
 * Google no longer offers to new Cloud projects.
 */
export default function AddressSearch({
  onSelect,
  onSubmitText,
  placeholder = "Search your property address…",
  disabled = false,
  autoFocusSignal,
}: AddressSearchProps) {
  const hasPlacesKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY);
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedValueRef = useRef("");
  // One Autocomplete session spans several keystrokes + one fetchFields call,
  // for correct session-based billing; renewed after each selection.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [loading, setLoading] = useState(hasPlacesKey);
  const [placesReady, setPlacesReady] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Both sources feed the same dropdown. Google when a key is loaded; otherwise
  // the server fallback (only useful when a free-text handler is provided).
  const googleEnabled = hasPlacesKey && placesReady && !disabled;
  const serverEnabled = !hasPlacesKey && Boolean(onSubmitText) && !disabled;
  const dropdownEnabled = googleEnabled || serverEnabled;

  // Imperative focus when an outside action (e.g. sidebar "Change address")
  // routes the user to this field. Guarded so the initial 0 never auto-focuses.
  useEffect(() => {
    if (autoFocusSignal) inputRef.current?.focus();
  }, [autoFocusSignal]);

  // Load the Places (New) library once when a key is configured.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    if (!apiKey) return;

    initGoogleMaps(apiKey);
    let active = true;
    importLibrary("places")
      .then(() => {
        if (active) setPlacesReady(true);
      })
      .catch((err: unknown) => {
        console.error("[AddressSearch] Failed to load Places API:", err);
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
    const timer = setTimeout(async () => {
      try {
        let next: AddressSuggestion[] = [];

        if (googleEnabled) {
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
          }
          const { suggestions: predictions } =
            await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: query,
              includedRegionCodes: ["us"],
              sessionToken: sessionTokenRef.current,
            });
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

        setSuggestions(next);
        setSuggestionsOpen(next.length > 0);
        setActiveIndex(-1);
      } catch {
        // Stale/aborted or failed fetch — keep whatever is already shown.
      }
    }, 300);

    return () => {
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
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        // fetchFields concludes the session; start a fresh token next time.
        sessionTokenRef.current = null;
        if (place.location) {
          const formattedAddress = place.formattedAddress ?? suggestion.text;
          selectedValueRef.current = formattedAddress;
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
    // Already resolved via a picked suggestion — don't re-submit as free text.
    if (query === selectedValueRef.current) return;
    if (query && onSubmitText) onSubmitText(query);
  }

  return (
    <form className="relative w-full" onSubmit={handleSubmit} role="search">
      <label htmlFor="address-search" className="sr-only">
        Search property address
      </label>

      {/* Search icon */}
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lf-muted"
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
          "h-11 w-full rounded-full border pl-9 pr-20 text-sm",
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
        className="absolute right-1.5 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-lf-sand transition disabled:cursor-not-allowed disabled:opacity-40 enabled:bg-lf-mahogany enabled:hover:bg-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-1"
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
              key={`${suggestion.text}-${index}`}
              id={`address-suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // onMouseDown so the pick fires before the input's blur closes the list
              onMouseDown={(event) => {
                event.preventDefault();
                void pickSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-lf-espresso ${
                index === activeIndex ? "bg-lf-sand-2" : ""
              }`}
            >
              <MapPin size={13} className="shrink-0 text-lf-clay" aria-hidden="true" />
              <span className="truncate">{suggestion.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Pin icon on the right when Places is active and a value is entered */}
      {googleEnabled && inputValue && !onSubmitText && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lf-clay"
          aria-hidden="true"
        >
          <MapPin size={15} />
        </span>
      )}

      {!loading && !hasPlacesKey && (
        <p className="mt-1.5 text-xs text-lf-muted" role="note">
          Type a full address (street, city, state) and press Search.
        </p>
      )}
    </form>
  );
}
