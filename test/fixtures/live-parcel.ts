/**
 * The canonical live-parcel snapshot shared by the client persistence tests and
 * the Firestore rules tests.
 *
 * `isValidLiveParcelData` (lib/saved-scenarios.ts) and `isValidLiveParcel`
 * (firestore.rules) describe one schema from two sides. Keeping a single
 * fixture means a field added to one validator and not the other shows up as a
 * failure rather than as two hand-maintained samples quietly drifting apart.
 */
export const SAMPLE_LIVE_PARCEL = {
  address: "500 Cedar Ave",
  city: "San Jose, CA",
  lotArea: 5600,
  lotWidth: 44,
  lotLength: 127,
  existingHouseSqft: 1420,
  maxLotCoveragePercent: 42,
  setbacks: { front: 20, rear: 20, side: 5 },
  zoning: "R-1",
  boundaryGeoJson: null,
  lat: 37.335,
  lng: -121.889,
  source: "regrid",
  state: "CA",
  zip: "95110",
  county: "Santa Clara",
  marketData: {
    rentByBedroom: { studio: 2100, "1br": 2500, "2br": 3100 },
    costMultiplier: 1.15,
    operatingExpenseRatio: 0.32,
    source: "hud-zip",
    area: "San Jose, CA",
    confidence: "high",
  },
} as const;

/**
 * The widest parcel the rules must still accept: every optional field on both
 * the parcel and its market data populated, plus a non-null boundary value.
 *
 * Firestore evaluates at most 1000 expressions per request, and each optional
 * field that is present costs another branch. `SAMPLE_LIVE_PARCEL` leaves six
 * market fields and the polygon unset, so it does not reach the budget that a
 * fully populated parcel from Regrid actually spends. This fixture is the
 * guard: if validation grows past the ceiling again, the rules test fails here
 * rather than in production on a real address's first save.
 */
export const SAMPLE_LIVE_PARCEL_MAX = {
  ...SAMPLE_LIVE_PARCEL,
  // The rules fixture uses the Firestore representation: arrays are separated
  // by maps so no array directly contains another array. Runtime code decodes
  // this back to ordinary GeoJSON after reading the document.
  boundaryGeoJson: {
    type: "Polygon",
    coordinates: [
      {
        points: [
          { lng: -121.89, lat: 37.33 },
          { lng: -121.89, lat: 37.34 },
          { lng: -121.88, lat: 37.34 },
          { lng: -121.89, lat: 37.33 },
        ],
      },
    ],
  },
  marketData: {
    ...SAMPLE_LIVE_PARCEL.marketData,
    opexBreakdown: { taxes: 0.12, insurance: 0.06, maintenance: 0.14 },
    asOf: "2026-Q2",
    sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
    retrievedAt: "2026-09-05T00:00:00.000Z",
    geography: { metro: "San Jose-Sunnyvale-Santa Clara", fips: "06085" },
    comparableCount: 42,
  },
  // The longest source the lookup writes: every map consulted, none in a zone.
  fireHazard: {
    zone: "none",
    responsibility: "LRA",
    source: "City of San Diego FHSZ map (2025), CAL FIRE LRA FHSZ map (2025) and CAL FIRE SRA FHSZ map (2024)",
    checkedAt: "2026-10-16T00:00:00.000Z",
  },
  // The fullest jurisdiction record the lookup writes: County land with its community.
  permitAuthority: {
    kind: "county",
    name: "San Diego",
    community: "Spring Valley",
    basis: "parcel-record",
    checkedAt: "2026-11-21T00:00:00.000Z",
  },
} as const;
