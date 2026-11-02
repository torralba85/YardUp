"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { AlertTriangle, CheckCircle2, MapPin, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { recordAddressSearchSubmission } from "@/lib/analytics/events";
import {
  evaluateClientInputReadiness,
  evaluatePlacesAddress,
  type AddressValidationResult,
  type PlacesAddressComponentLike,
} from "@/lib/address-validation";
import type { StructuredAddressPrediction } from "@/app/api/suggest/route";

/** A selected address with its resolved coordinates and validation metadata. */
export interface AddressSearchResult {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** The normalized, human-readable address. */
  formattedAddress: string;
  /** Optional real-time Google Places deliverability validation result. */
  validation?: AddressValidationResult;
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
  /** Optional callback fired whenever the real-time validation state updates. */
  onValidationChange?: (validation: AddressValidationResult | null) => void;
  /** Optional callback fired whenever the user's raw text input changes. */
  onQueryChange?: (query: string) => void;
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
 * `/api/suggest` fallback.
 */
interface AddressSuggestion {
  text: string;
  prediction: google.maps.places.PlacePrediction | null;
  placeId?: string;
  types?: string[];
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
 * Determines whether a suggestion entry represents a specific deliverable
 * property address (`street_address`, `premise`, `subpremise`, or starts with a street number).
 */
function isSuggestionDeliverableCandidate(suggestion: AddressSuggestion): boolean {
  const types = suggestion.types ?? suggestion.prediction?.types ?? [];
  if (
    types.includes("street_address") ||
    types.includes("premise") ||
    types.includes("subpremise")
  ) {
    return true;
  }
  if (types.includes("route") || types.includes("locality")) {
    return false;
  }
  const readiness = evaluateClientInputReadiness(suggestion.text);
  return readiness.hasStreetNumber && readiness.hasStreetName;
}

/**
 * Address search input with real-time Google Places API address validation
 * and a design-system-styled suggestion dropdown.
 *
 * When `NEXT_PUBLIC_GOOGLE_PLACES_KEY` is set it uses the Google Places (New)
 * API (`AutocompleteSuggestion` + `Place.fetchFields`), verifying property-level
 * deliverability (`addressComponents`, `types`, `location`, `formattedAddress`)
 * before resolving via {@link onSelect}. Without a key it falls back to
 * debounced server predictions from `/api/suggest` and `/api/address-validate`.
 */
export default function AddressSearch({
  onSelect,
  onSubmitText,
  onValidationChange,
  onQueryChange,
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
  // The query the shown suggestions were fetched for; they stay visible while
  // the next debounced fetch runs, but keyboard picks only accept a current list.
  const [suggestionsFor, setSuggestionsFor] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [validationResult, setValidationResult] =
    useState<AddressValidationResult | null>(null);
  const [validatedForText, setValidatedForText] = useState("");

  // Both sources feed the same dropdown. Google when a key is loaded and
  // working; otherwise the server fallback (needs a free-text handler). Either
  // way suggestions cost metered API quota, so guests get neither source — the
  // free-text Search button is their path, and it costs nothing.
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
            .map((p) => ({
              text: p.text.text,
              prediction: p,
              placeId: p.placeId,
              types: p.types,
            }));
        } else {
          const idToken = await user?.getIdToken();
          const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
          });
          if (!res.ok) return;
          const data = (await res.json()) as {
            suggestions?: string[];
            predictions?: StructuredAddressPrediction[];
          };
          if (Array.isArray(data.predictions) && data.predictions.length > 0) {
            next = data.predictions.map((item) => ({
              text: item.text,
              prediction: null,
              placeId: item.placeId,
              types: item.types,
            }));
          } else {
            next = (Array.isArray(data.suggestions) ? data.suggestions : []).map((text) => ({
              text,
              prediction: null,
            }));
          }
        }

        if (!active) return;
        setSuggestions(next);
        setSuggestionsFor(query);
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

  function applyValidation(next: AddressValidationResult | null, forText: string) {
    setValidationResult(next);
    setValidatedForText(forText);
    onValidationChange?.(next);
  }

  async function pickSuggestion(suggestion: AddressSuggestion) {
    selectedValueRef.current = suggestion.text;
    setInputValue(suggestion.text);
    onQueryChange?.(suggestion.text);
    setSuggestions([]);
    setSuggestionsOpen(false);
    setActiveIndex(-1);

    if (suggestion.prediction) {
      try {
        const place = suggestion.prediction.toPlace();
        await place.fetchFields({
          fields: ["location", "formattedAddress", "addressComponents", "types"],
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
          const placeWithDetails = place as unknown as {
            addressComponents?: PlacesAddressComponentLike[] | null;
            types?: string[] | null;
          };
          const validation = evaluatePlacesAddress({
            rawQuery: suggestion.text,
            formattedAddress,
            placeId: suggestion.prediction.placeId ?? suggestion.placeId,
            location: {
              lat: place.location.lat(),
              lng: place.location.lng(),
            },
            addressComponents: placeWithDetails.addressComponents ?? null,
            types: placeWithDetails.types ?? suggestion.types ?? null,
          });
          applyValidation(validation, formattedAddress);

          // If Places explicitly reports a street-only or locality-only match
          // without a house number, prompt the user to enter a street number
          // instead of selecting a street midpoint.
          if (!validation.deliverable) {
            selectedValueRef.current = formattedAddress;
            setInputValue(formattedAddress);
            onQueryChange?.(formattedAddress);
            inputRef.current?.focus();
            return;
          }

          selectedValueRef.current = formattedAddress;
          resolvedValueRef.current = formattedAddress;
          setInputValue(formattedAddress);
          onQueryChange?.(formattedAddress);
          recordAddressSearchSubmission("places", user ? "signed_in" : "guest");
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

    // Evaluate deliverability readiness for server-backed picks as well.
    const fallbackValidation = evaluatePlacesAddress({
      rawQuery: suggestion.text,
      formattedAddress: suggestion.text,
      placeId: suggestion.placeId,
      types: suggestion.types ?? null,
    });
    applyValidation(fallbackValidation, suggestion.text);

    // Server-suggestion pick, or a Google pick whose place couldn't resolve.
    recordAddressSearchSubmission("free_text", user ? "signed_in" : "guest");
    onSubmitText?.(suggestion.text);
  }

  const [validatingServer, setValidatingServer] = useState(false);

  async function handleVerifyAddress() {
    const query = inputValue.trim();
    if (!query || validatingServer) return;
    setValidatingServer(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/address-validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ address: query }),
      });
      if (!res.ok) return;
      const result = (await res.json()) as AddressValidationResult;
      applyValidation(result, query);
    } catch (err) {
      console.error("[AddressSearch] Address validation failed:", err);
    } finally {
      setValidatingServer(false);
    }
  }

  const trimmedInput = inputValue.trim();
  const suggestionsCurrent = suggestions.length > 0 && suggestionsFor === trimmedInput;
  const activeValidation =
    validationResult && validatedForText === trimmedInput ? validationResult : null;
  const clientReadiness =
    trimmedInput.length >= 3 ? evaluateClientInputReadiness(trimmedInput) : null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && suggestionsCurrent) {
        event.preventDefault();
        void pickSuggestion(suggestions[activeIndex]);
      } else if (!onSubmitText && suggestionsCurrent) {
        event.preventDefault();
        void pickSuggestion(suggestions[0]);
      }
    } else if (event.key === "Tab") {
      if (activeIndex >= 0 && suggestionsCurrent) {
        void pickSuggestion(suggestions[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveIndex(-1);
    }
  }

  const isDisabled = disabled;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    if (!onSubmitText && suggestionsCurrent) {
      const targetSuggestion = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      setSuggestionsOpen(false);
      setActiveIndex(-1);
      void pickSuggestion(targetSuggestion);
      return;
    }

    setSuggestionsOpen(false);
    setActiveIndex(-1);
    // Skip re-submitting only a fully resolved Google pick. Server picks and
    // failed Google resolves stay retryable so a flaky lookup can be retried.
    if (query === resolvedValueRef.current) return;
    if (onSubmitText) {
      recordAddressSearchSubmission("free_text", user ? "signed_in" : "guest");
      onSubmitText(query);
    }
  }

  return (
    <form className="group relative w-full" onSubmit={handleSubmit} role="search">
      <label htmlFor="address-search" className="sr-only">
        Search property address
      </label>

      {/* Search icon — anchored to the h-11 input's 22px midline (top-5.5), not
          the form's center: helper text below the input stretches the form and
          would drag top-1/2 children out of the pill. */}
      <span
        className="pointer-events-none absolute left-3 top-5.5 -translate-y-1/2 text-lot-stone"
        aria-hidden="true"
      >
        {loading ? (
          <span
            className="block h-4 w-4 motion-safe:animate-spin rounded-full border-2 border-lot-line border-t-lot-orange"
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
        onChange={(e) => {
          setInputValue(e.target.value);
          onQueryChange?.(e.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setSuggestionsOpen(false);
          setActiveIndex(-1);
        }}
        placeholder={placeholder}
        disabled={isDisabled}
        aria-label="Search property address"
        aria-busy={loading}
        aria-invalid={activeValidation ? !activeValidation.deliverable : undefined}
        role={dropdownEnabled ? "combobox" : undefined}
        aria-autocomplete={dropdownEnabled ? "list" : undefined}
        aria-expanded={dropdownEnabled ? suggestionsOpen : undefined}
        aria-controls={dropdownEnabled ? "address-suggestions" : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `address-suggestion-${activeIndex}` : undefined
        }
        className={[
          "h-11 w-full rounded-control border pl-9 pr-26 text-sm",
          "bg-lot-chalk text-lot-ink placeholder:text-lot-stone",
          "outline-none motion-safe:transition",
          "focus:border-lot-orange-ink focus:ring-2 focus:ring-lot-orange-ink",
          isDisabled
            ? "cursor-not-allowed border-lot-line opacity-60"
            : "border-lot-line hover:border-lot-stone/70",
        ].join(" ")}
      />

      <button
        type="submit"
        disabled={isDisabled || !inputValue.trim()}
        className="absolute right-2.5 top-5.5 inline-flex h-7 -translate-y-1/2 items-center gap-1 rounded-control px-2.5 text-xs font-semibold motion-safe:transition before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] disabled:cursor-not-allowed disabled:bg-lot-stone-soft disabled:text-lot-stone enabled:bg-lot-orange enabled:text-lot-ink enabled:hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-1"
      >
        <MapPin size={13} aria-hidden="true" />
        Search
      </button>

      {suggestionsOpen && suggestions.length > 0 && (
        <ul
          id="address-suggestions"
          role="listbox"
          aria-label="Address suggestions"
          className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-none border border-lot-line bg-lot-chalk shadow-none"
        >
          {suggestions.map((suggestion, index) => {
            const deliverableCandidate = isSuggestionDeliverableCandidate(suggestion);
            return (
              <li
                key={suggestion.prediction?.placeId ?? suggestion.placeId ?? suggestion.text}
                id={`address-suggestion-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // onMouseDown so the pick fires before the input's blur closes the list
                onMouseDown={(event) => {
                  event.preventDefault();
                  void pickSuggestion(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-3 text-sm text-lot-ink ${
                  index === activeIndex ? "bg-lot-surface" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <MapPin size={13} className="shrink-0 text-lot-orange-ink" aria-hidden="true" />
                  <span className="truncate">{suggestion.text}</span>
                </span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    deliverableCandidate ? "text-status-eligible" : "text-status-review"
                  }`}
                >
                  {deliverableCandidate ? "Deliverable" : "Add street #"}
                </span>
              </li>
            );
          })}
          <li
            role="presentation"
            className="flex items-center justify-between border-t border-lot-line px-3 py-1.5 text-xs uppercase tracking-wide text-lot-stone"
          >
            <span>↑↓ to select · Tab/Enter to choose</span>
            {googleEnabled && <span>Google Maps</span>}
          </li>
        </ul>
      )}

      {activeValidation ? (
        <div
          data-testid="address-validation-status"
          className="mt-1.5 flex flex-col gap-0.5 border border-lot-line bg-lot-surface px-2.5 py-1.5 text-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${
                activeValidation.status === "deliverable"
                  ? "text-status-eligible"
                  : activeValidation.status === "needs_confirmation"
                    ? "text-status-review"
                    : "text-status-blocked"
              }`}
            >
              {activeValidation.status === "deliverable" ? (
                <CheckCircle2 size={13} className="shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle size={13} className="shrink-0" aria-hidden="true" />
              )}
              <span>{activeValidation.message}</span>
            </span>
            {activeValidation.standardizedSuggestion &&
              activeValidation.standardizedSuggestion !== trimmedInput && (
                <button
                  type="button"
                  onClick={() => {
                    const standardized = activeValidation.standardizedSuggestion!;
                    selectedValueRef.current = standardized;
                    setInputValue(standardized);
                    onQueryChange?.(standardized);
                    const updatedValidation: AddressValidationResult = {
                      ...activeValidation,
                      status: "deliverable",
                      deliverable: true,
                    };
                    applyValidation(updatedValidation, standardized);
                    if (activeValidation.location) {
                      resolvedValueRef.current = standardized;
                      onSelect({
                        lat: activeValidation.location.lat,
                        lng: activeValidation.location.lng,
                        formattedAddress: standardized,
                      });
                    }
                  }}
                  className="shrink-0 rounded-control border border-lot-stone px-2 py-0.5 text-xs font-semibold text-lot-ink hover:bg-lot-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
                >
                  Use standardized
                </button>
              )}
          </div>
          {activeValidation.source !== "client_heuristic" && (
            <div className="text-xs text-lot-stone">Google Maps</div>
          )}
        </div>
      ) : clientReadiness ? (
        <div
          data-testid="address-readiness-bar"
          className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border border-lot-line bg-lot-surface px-2.5 py-1.5 text-xs text-lot-stone"
        >
          <span className="inline-flex items-center gap-1.5 text-lot-ink">
            {clientReadiness.isCompleteCandidate ? (
              <CheckCircle2
                size={13}
                className="shrink-0 text-status-eligible"
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                size={13}
                className="shrink-0 text-status-review"
                aria-hidden="true"
              />
            )}
            <span>{clientReadiness.summaryLabel}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className={
                clientReadiness.hasStreetNumber
                  ? "font-medium text-status-eligible"
                  : "text-lot-stone"
              }
            >
              {clientReadiness.hasStreetNumber ? "✓ Street #" : "○ Street #"}
            </span>
            <span
              className={
                clientReadiness.hasStreetName
                  ? "font-medium text-status-eligible"
                  : "text-lot-stone"
              }
            >
              {clientReadiness.hasStreetName ? "✓ Street" : "○ Street"}
            </span>
            <span
              className={
                clientReadiness.hasLocalityOrState
                  ? "font-medium text-status-eligible"
                  : "text-lot-stone"
              }
            >
              {clientReadiness.hasLocalityOrState ? "✓ City/State" : "○ City/State"}
            </span>
            {signedIn && clientReadiness.isCompleteCandidate && (
              <button
                type="button"
                disabled={validatingServer}
                onClick={() => void handleVerifyAddress()}
                className="rounded-control border border-lot-stone bg-lot-chalk px-2 py-0.5 text-xs font-semibold text-lot-ink hover:bg-lot-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink disabled:opacity-60"
              >
                {validatingServer ? "Verifying…" : "Verify"}
              </button>
            )}
          </span>
        </div>
      ) : null}

      {!signedIn || (!loading && !hasPlacesKey) ? (
        <p className="sr-only group-focus-within:not-sr-only mt-1.5 text-xs text-lot-stone" role="note">
          Type a full address (street, city, state) and press Search.
        </p>
      ) : null}
    </form>
  );
}
