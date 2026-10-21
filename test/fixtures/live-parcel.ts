import type { LiveParcelData } from "@/lib/parcel-types";

export const SAMPLE_LIVE_PARCEL: LiveParcelData = {
  address: "141 N Almaden Blvd",
  city: "San Jose, CA 95110",
  lotArea: 6500,
  lotWidth: 50,
  lotLength: 130,
  existingHouseSqft: 1450,
  maxLotCoveragePercent: 45,
  setbacks: {
    front: 20,
    rear: 15,
    side: 5,
  },
  zoning: "R-1-8",
  boundaryGeoJson: null,
  lat: 37.3352,
  lng: -121.895,
  source: "regrid",
  state: "CA",
  zip: "95110",
  county: "Santa Clara",
  marketData: {
    source: "hud-zip",
    confidence: "medium",
    area: "San Jose, CA 95110",
    rentByBedroom: {
      studio: 2100,
      "1br": 2450,
      "2br": 3050,
      "3br": 3800,
    },
    costMultiplier: 1.32,
    operatingExpenseRatio: 0.25,
    retrievedAt: "2026-09-25T00:00:00.000Z",
    geography: {
      state: "CA",
      county: "Santa Clara",
      zip: "95110",
    },
  },
};
