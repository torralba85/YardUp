"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export interface AddressSearchResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface AddressSearchProps {
  onSelect: (result: AddressSearchResult) => void;
  /**
   * Called when the user submits free text (Enter / Search button) without
   * picking a Places suggestion; the caller geocodes it server-side. This is
   * the path that works with no Google Places key configured.
   */
  onSubmitText?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

let initialized = false;

function initGoogleMaps(apiKey: string) {
  if (!initialized) {
    setOptions({ key: apiKey, libraries: ["places"] });
    initialized = true;
  }
}

/**
 * Google Places Autocomplete address search input.
 *
 * Styled to the LotFoundry design system. Restricts suggestions to US addresses.
 * Calls onSelect with lat/lng + formatted address when the user picks a suggestion.
 *
 * Requires NEXT_PUBLIC_GOOGLE_PLACES_KEY env var.
 */
export default function AddressSearch({
  onSelect,
  onSubmitText,
  placeholder = "Search your property address…",
  disabled = false,
}: AddressSearchProps) {
  const hasPlacesKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY);
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const selectedValueRef = useRef("");
  const [loading, setLoading] = useState(hasPlacesKey);
  const [ready, setReady] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Server-backed predictions when the browser Places widget isn't available:
  // debounce keystrokes against /api/suggest and offer a pick-from-list.
  const suggestEnabled = !hasPlacesKey && Boolean(onSubmitText) && !disabled;
  useEffect(() => {
    if (!suggestEnabled) return;
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
        const idToken = await user?.getIdToken();
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: string[] };
        const next = Array.isArray(data.suggestions) ? data.suggestions : [];
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
  }, [inputValue, suggestEnabled, user]);

  function pickSuggestion(suggestion: string) {
    selectedValueRef.current = suggestion;
    setInputValue(suggestion);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    onSubmitText?.(suggestion);
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
      pickSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
    if (!apiKey) {
      return;
    }

    initGoogleMaps(apiKey);

    importLibrary("places")
      .then(() => {
        if (!inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ["address"],
            componentRestrictions: { country: "us" },
            fields: ["geometry", "formatted_address"],
          },
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry?.location) return;

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const formattedAddress = place.formatted_address ?? inputRef.current?.value ?? "";

          selectedValueRef.current = formattedAddress;
          setInputValue(formattedAddress);
          onSelect({ lat, lng, formattedAddress });
        });

        autocompleteRef.current = autocomplete;
        setReady(true);
      })
      .catch((err: unknown) => {
        console.error("[AddressSearch] Failed to load Places API:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDisabled = disabled;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    const query = inputValue.trim();
    if (ready && query === selectedValueRef.current) return;
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
        role={suggestEnabled ? "combobox" : undefined}
        aria-autocomplete={suggestEnabled ? "list" : undefined}
        aria-expanded={suggestEnabled ? suggestionsOpen : undefined}
        aria-controls={suggestEnabled ? "address-suggestions" : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined
        }
        className={[
          "h-11 w-full rounded-md border pl-9 pr-20 text-sm",
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
        className="absolute right-1.5 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded px-2.5 text-xs font-semibold text-lf-sand transition disabled:cursor-not-allowed disabled:opacity-40 enabled:bg-lf-mahogany enabled:hover:bg-lf-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lf-clay focus-visible:ring-offset-1"
      >
        <MapPin size={13} aria-hidden="true" />
        Search
      </button>

      {suggestionsOpen && suggestions.length > 0 && (
        <ul
          id="address-suggestions"
          role="listbox"
          aria-label="Address suggestions"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-lf-hairline bg-lf-card shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`address-suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // onMouseDown so the pick fires before the input's blur closes the list
              onMouseDown={(event) => {
                event.preventDefault();
                pickSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm text-lf-espresso ${
                index === activeIndex ? "bg-lf-sand-2" : ""
              }`}
            >
              <MapPin size={13} className="shrink-0 text-lf-clay" aria-hidden="true" />
              <span className="truncate">{suggestion}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Pin icon on the right when Places is active and a value is entered */}
      {ready && inputValue && !onSubmitText && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lf-clay"
          aria-hidden="true"
        >
          <MapPin size={15} />
        </span>
      )}

      {!ready && !loading && !hasPlacesKey && (
        <p className="mt-1.5 text-xs text-lf-muted" role="note">
          Type a full address (street, city, state) and press Search.
        </p>
      )}
    </form>
  );
}
