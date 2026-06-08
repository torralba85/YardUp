"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Search } from "lucide-react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const selectedValueRef = useRef("");
  const [loading, setLoading] = useState(hasPlacesKey);
  const [ready, setReady] = useState(false);
  const [inputValue, setInputValue] = useState("");

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
        placeholder={placeholder}
        disabled={isDisabled}
        aria-label="Search property address"
        aria-busy={loading}
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
