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
 * the parcel and its market data populated, plus a real boundary polygon.
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
  // `coordinates` is deliberately empty rather than a real ring. Firestore
  // cannot store nested arrays at all, and a GeoJSON Polygon's coordinates are
  // nested three deep, so the client SDK rejects the write before the rules run
  // (normalizeLiveParcel in lib/saved-scenarios.ts passes the ring through
  // unchanged, so a parcel that actually carries a boundary cannot be saved
  // today). What matters here is that the non-null branch of
  // isValidBoundaryGeoJson is exercised, which this does.
  boundaryGeoJson: {
    type: "Polygon",
    coordinates: [],
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
} as const;
