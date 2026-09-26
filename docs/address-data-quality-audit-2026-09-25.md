# Address data quality audit — 2026-09-25

## Outcome

YardUp's address pipeline can return useful current parcel geometry, building-footprint estimates, Census geography, and rent seeds. It is not yet safe to describe every returned value as verified, current, or address-specific.

The central issue is provenance granularity: the API labels an entire response with one parcel source and one market confidence even when individual values are observed, derived, defaulted, or unavailable. In particular, default zoning controls can appear beside real parcel measurements without field-level warnings.

## Implementation update — 2026-09-25

The core reliability work across recommendations 1–6 is now implemented, with address-component reconciliation and fuller freshness metadata intentionally left open. This report preserves the original audit findings below as the before-state; the current contract adds:

- geocoder provider IDs, normalized components, match type, precision, partial-match status, retrieval time, and field evidence;
- rejection of explicit partial/non-address matches and Nominatim street substitutions without a house number;
- point-in-parcel validation for returned Regrid geometry;
- field-level parcel evidence for address, area, dimensions, footprint, boundary, zoning, setbacks, and coverage;
- structured provider outcomes (`matched`, `no-match`, `unsupported`, `timeout`, `provider-error`, and `invalid-response`);
- Regrid record ID, source refresh date, and record-update date when published;
- no 5,000 sq ft fallback when Regrid omits parcel area;
- independent evidence for rent, construction costs, and operating expenses, with live-rent confidence reduced for thin or undisclosed comparable counts;
- persistence of sanitized evidence through local scenarios and Firestore; and
- visible disclosure that construction costs and expenses remain planning assumptions even when rent comes from live comparables.

Regulatory fallback numbers remain available so the feasibility calculator can run, but they are now marked `defaulted`; parcel confidence and downstream zoning/report surfaces treat them as assumed rather than verified. Remaining work is listed under **Open follow-ups**.

## Open follow-ups

1. Reconcile normalized geocoder, Census, requested ZIP/state, and parcel situs components, and surface disagreements explicitly.
2. Decide whether regulatory defaults should become nullable or require an explicit user acknowledgement before decision-bearing calculations.
3. Record resolved Census benchmark/vintage IDs and richer ArcGIS dataset identifiers/cadence metadata.
4. Add scheduled public-provider health probes, staleness thresholds, and launch-market golden-address monitoring.
5. Expand and govern licensed/official market seed coverage beyond the current launch subset.
6. Validate the evidence contract against authenticated paid Regrid production samples; this implementation did not make a billed provider call.

## Scope and method

Reviewed the address-to-answer path:

1. address geocoding;
2. parcel selection and geometry;
3. building footprints;
4. Census geography;
5. zoning, setbacks, and lot coverage;
6. rent, construction-cost, and operating-expense inputs;
7. source freshness, failure behavior, and user-visible confidence.

Evidence included source review, 172 focused automated tests, three live local end-to-end lookups using public civic addresses, live ArcGIS service metadata/count probes, and current official provider documentation. No paid Regrid request was made, so Regrid findings are based on the response mapping and official documentation rather than a billed production sample.

## Finding summary

| Priority | Finding | User risk |
| --- | --- | --- |
| High | Regulatory defaults can look address-specific | A user may treat assumed setbacks or lot coverage as verified zoning rules. |
| High | Geocode match quality is discarded | A plausible but imprecise or partial address match can silently drive the parcel and market lookup. |
| High | Market confidence is assigned to a mixed-source bundle | Live rent can make static construction-cost and operating-expense assumptions look live and high-confidence. |
| High | Provider failure and genuine no-data both degrade to presets | An outage can produce a plausible fallback rather than a clearly unavailable answer. |
| Medium | Freshness metadata is available but not returned | Users cannot tell the source vintage or when a field was retrieved. |
| Medium | Regrid lot area can silently default to 5,000 sq ft | A missing parcel-area field can become a precise-looking number. |
| Medium | Public parcel and market coverage is uneven | The fallback behavior varies materially by state and county but is not disclosed before results. |
| Medium | Building-footprint lineage is incomplete | A footprint may be useful, but its dataset vintage and quality limitations are not carried to the response. |

## Detailed findings

### 1. Regulatory defaults can look verified

`app/api/parcel/route.ts` derives maximum lot coverage from a short zoning-code string map and defaults to 40%. Setbacks default to 20 ft front, 20 ft rear, and 5 ft side when provider data is absent. County/state GIS sources do not supply zoning in this pipeline, yet the same numerical defaults are returned with real parcel geometry.

`lib/parcel-confidence.ts` marks Regrid regulations as non-estimated whenever the zoning string is not `Unknown`, even though the setbacks may still be defaults and coverage remains a heuristic derived from the code string. The confidence flag therefore does not describe the individual values it governs.

Live local probes on 2026-09-25 demonstrated the issue:

| Public address | Parcel source | Observed lot area | Observed footprint | Zoning | Returned coverage | Returned setbacks |
| --- | --- | ---: | ---: | --- | ---: | --- |
| 600 4th Avenue, Seattle, WA 98104 | King County GIS | 59,542 sq ft | 49,128 sq ft | Unknown | 40% | 20/20/5 ft |
| 1221 SW 4th Avenue, Portland, OR 97204 | Multnomah County GIS | 40,000 sq ft | 26,453 sq ft | Unknown | 40% | 20/20/5 ft |
| 301 W 2nd Street, Austin, TX 78701 | Travis County GIS | 75,915 sq ft | 47,437 sq ft | Unknown | 40% | 20/20/5 ft |

The geometry and footprint may be real while the regulatory values are only defaults. They need separate status and provenance.

### 2. Address identity and match quality are not preserved

`app/api/geocode/route.ts` reduces both Google and Nominatim results to latitude, longitude, and formatted address. It does not retain the provider, stable place identifier, address components, result type, rooftop/interpolated precision, partial-match status, or match score.

The Google path accepts the first result without propagating `partial_match`, `types`, or `geometry.location_type`. The Nominatim fallback accepts the first candidate when semantic selection is disabled and does not require a house-number result. The parcel route then trusts the coordinate and separately asks Census for location geography, but it does not enforce that the normalized address, geocode point, Census match, and selected parcel refer to the same property.

Minimum acceptance should require:

- a street-address or premise-level result;
- no partial match;
- explicit state and ZIP consistency when supplied;
- the resolved point inside the selected parcel polygon, with a documented boundary tolerance;
- a normalized-address comparison and visible warning for disagreement.

### 3. Market confidence conflates independent inputs

`lib/server/market/resolve-market.ts` can replace static rents with a live RentCast estimate, then label the combined `MarketData` record `live` and `high` confidence. Construction-cost multipliers and operating-expense ratios remain static curated seed values, however. Their distinct lineage is lost.

The static path has the inverse problem: it attaches the HUD FMR vintage and URL to the whole bundle even though cost multipliers and operating expenses come from separate seed files. The current seed coverage is also intentionally small:

- FMR: 4 states, 8 counties, and 4 ZIP entries;
- construction costs: 4 states, 8 counties, and 4 ZIP entries;
- operating expenses: 4 state entries and no county or ZIP entries.

RentCast returns an estimate range and comparable listings, and its official documentation exposes comparable count, age, and radius controls. The current integration reduces that evidence to positive bedroom-rent values and treats any valid positive response as high confidence.

Each market component needs its own source, source vintage, retrieved time, coverage tier, confidence, and sample evidence.

### 4. Provider outage and absence are indistinguishable

`lib/server/county-parcels.ts` catches provider errors and returns `null`. The route then continues to another source or to a geographic preset. That is appropriate for availability, but the response cannot distinguish:

- the address is outside a provider's coverage;
- the provider returned no parcel at that point;
- the provider timed out;
- the provider endpoint is unavailable;
- the provider response failed validation.

During this audit, the registered Nevada statewide ArcGIS metadata endpoint returned HTTP 500. The other registered services returned live metadata and feature counts. A Nevada request could therefore silently degrade even though the service is configured as covered.

Fallback results should carry structured warnings and a reason code. Regulatory or permit-like conclusions should fail closed when the authoritative input is unavailable.

### 5. Freshness evidence is dropped

Regrid documents `ll_last_refresh` as the date it most recently refreshed data from the county source and `ll_updated_at` as a record-change timestamp. `app/api/parcel/route.ts` does not return either field or the stable `ll_uuid`.

The Census integration uses the mutable `Public_AR_Current` benchmark and `Current_Current` vintage. On 2026-09-25 both resolved to ID `4`, but the response does not record the resolved IDs. The aliases can move over time.

County/state ArcGIS registry entries similarly omit dataset vintage, item/layer identifier, last-reviewed date, license/copyright, and expected refresh cadence. A service `lastEditDate` is useful operational evidence but is not necessarily the underlying assessor-data vintage; the two must not be conflated.

### 6. Missing Regrid lot area becomes 5,000 sq ft

In the Regrid mapping, absent or invalid `ll_gisacre` becomes exactly 5,000 sq ft. The response still has source `regrid` and no field-level estimated/defaulted flag. A missing value should remain unavailable unless a separately labeled estimate is intentionally calculated.

### 7. Coverage is uneven and implicit

The public parcel registry has three county sources and statewide sources for California, Washington, New York, Ohio, Wisconsin, Florida, Vermont, and Nevada. Addresses outside those sources eventually use the nearest preset. The market seeds cover only four states.

Coverage should be an explicit product capability object, not inferred after a lookup. The UI should say which requested facts are supported at the address before presenting a feasibility result.

### 8. Footprint data lacks response-level lineage

`lib/server/building-footprints.ts` queries the FEMA/USA Structures service and intentionally treats zero as unknown. That is good conservative behavior. The output nevertheless retains only total area, largest footprint, and count; it drops the dataset name, service item/layer ID, dataset/service timestamp, retrieval time, match method, and limitations. The centroid-inside-parcel rule can also miss a building that overlaps a parcel while its centroid lies outside it.

## Live provider snapshot

Observed 2026-09-25. Counts show that a service answered; `lastEdit` is operational metadata, not guaranteed source-data vintage.

| Registered source | Live feature count | Service last edit |
| --- | ---: | --- |
| King County parcels | 639,255 | 2026-09-19 |
| Multnomah regional taxlots | 607,019 | not published |
| Travis County parcels | 373,683 | not published |
| California statewide parcels | 13,138,000 | 2026-05-28 |
| Washington Parcels 2026 | 3,321,859 | 2026-09-24 |
| New York statewide parcels | 3,827,530 | not published |
| Ohio statewide parcels | 6,313,610 | 2026-09-23 |
| Wisconsin Parcels 2026 | 3,574,646 | 2026-06-30 |
| Florida DOR Cadastral 2025 | 10,831,924 | 2026-09-16 |
| Vermont statewide parcels | 343,940 | 2026-09-23 |
| Nevada statewide parcels | unavailable | metadata endpoint returned HTTP 500 |
| USA Structures | 135,321,228 | 2026-06-08 |

## Required response contract

Every decision-bearing value should use a field-level envelope like:

```ts
type EvidenceValue<T> = {
  value: T | null;
  status: "observed" | "derived" | "defaulted" | "unavailable";
  source: {
    provider: string;
    dataset: string;
    recordId?: string;
    sourceUrl?: string;
  };
  sourceAsOf?: string;
  retrievedAt: string;
  confidence: "high" | "medium" | "low" | "unknown";
  warnings: string[];
};
```

Address resolution should additionally return the normalized components, provider match type, precision, partial-match flag, source point, parcel-containment result, and any disagreement between geocoder, Census, and parcel geography.

This makes it impossible for a default setback to inherit the credibility of a real parcel boundary or for a live rent estimate to upgrade a static construction-cost multiplier.

## Recommended implementation order

1. **Stop presenting regulatory defaults as facts.** Return `null` for unavailable zoning controls or label each value `defaulted`; update the UI and calculations to require acknowledgement before using assumptions.
2. **Introduce field-level provenance.** Add the evidence envelope without changing calculation formulas first; retain stable parcel/provider IDs and source timestamps.
3. **Strengthen address reconciliation.** Preserve geocoder quality metadata, require address-component agreement, and verify parcel containment before accepting the lookup.
4. **Split market evidence.** Give rents, construction costs, and operating expenses independent source, vintage, confidence, and coverage tier. Use RentCast range/comparable evidence instead of treating any positive response as high confidence.
5. **Capture provider freshness.** Preserve Regrid `ll_uuid`, `ll_last_refresh`, and `ll_updated_at`; resolve and record Census benchmark/vintage IDs; add ArcGIS dataset IDs, expected cadence, and last successful probe.
6. **Differentiate failure modes.** Emit `unsupported`, `no-match`, `timeout`, `provider-error`, and `invalid-response` reason codes. Do not silently turn provider failure into regulatory certainty.
7. **Add source health monitoring.** Probe configured public services on a schedule, alert on schema/HTTP/count anomalies, and display degraded coverage internally.
8. **Expand and govern seed data.** Load the complete licensed/official datasets needed for launch markets, keep checksums and build provenance, and enforce expiry thresholds in CI.

## Verification gates to add

- Contract tests that reject partial/imprecise geocodes for a precise street-address workflow.
- Point-in-parcel and normalized-address consistency tests.
- Tests asserting every returned value has status, provider, retrieval time, and confidence.
- Tests proving a default cannot be labeled observed or high confidence.
- Provider fixtures for timeout, HTTP error, schema drift, no-match, and stale data.
- Freshness thresholds per dataset class, with an explicit stale-but-usable policy.
- Golden-address tests in every supported county/state using public, non-sensitive addresses.
- Monitoring checks for configured ArcGIS layer IDs, geometry type, required fields, and nonzero counts.
- Market tests where live rent coexists with low-confidence cost and expense assumptions.

## Current verification evidence

- Focused implementation suite: 6 test files passed, 105 tests passed.
- Full repository suite: 207 test files passed, 1 skipped; 1,506 tests passed, 21 skipped.
- Firestore emulator rules: 21 tests passed with Temurin 21.
- Static gates: ESLint passed with zero warnings, TypeScript passed, and the Next.js production build completed successfully.
- Live local flow: geocoding and parcel lookup succeeded for three public addresses in Seattle, Portland, and Austin.
- Public provider metadata: 10 of 11 registered parcel services responded; Nevada returned HTTP 500.
- Census current alias: benchmark ID 4 and vintage ID 4 at audit time.

These checks establish current behavior; they do not certify zoning legality, assessor accuracy, permit eligibility, or paid Regrid production behavior.

## Official references

- Regrid source and lineage: <https://support.regrid.com/docs/source-lineage>
- Regrid update practices: <https://support.regrid.com/docs/data-dictionary>
- Census Geocoder API: <https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html>
- Census Geocoder technical documentation: <https://www.census.gov/programs-surveys/geography/technical-documentation/complete-technical-documentation/census-geocoder.html>
- HUD Fair Market Rents: <https://www.huduser.gov/portal/datasets/fmr.html>
- RentCast valuation and comparable methodology: <https://developers.rentcast.io/reference/property-valuation>
