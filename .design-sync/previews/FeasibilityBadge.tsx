import { FeasibilityBadge } from "@lotfoundry/ui";

// FeasibilityBadge runs LotFoundry's California statewide baseline screen on a
// parcel and renders a disclosure; it returns null outside California.
const sanDiegoLot = {
  address: "1234 Oak Street",
  city: "San Diego, CA 92104",
  state: "CA",
  zoning: "RS-1-7",
  lotArea: 5000,
  lotWidth: 50,
  lotLength: 100,
  existingHouseSqft: 1400,
  maxLotCoveragePercent: 50,
  setbacks: { front: 15, rear: 4, side: 4 },
};

export const Qualified = () => (
  <div className="w-[340px] bg-lot-chalk p-4">
    <FeasibilityBadge parcel={sanDiegoLot} config={{ footprint: 600, width: 20, length: 30 }} surface="light" />
  </div>
);

export const NeedsReview = () => (
  <div className="w-[340px] bg-lot-chalk p-4">
    <FeasibilityBadge parcel={sanDiegoLot} config={{ footprint: 1000, width: 25, length: 40 }} surface="light" />
  </div>
);

export const ZoningUnverified = () => (
  <div className="w-[340px] bg-lot-chalk p-4">
    <FeasibilityBadge
      parcel={{ ...sanDiegoLot, zoning: "Unknown" }}
      config={{ footprint: 600, width: 20, length: 30 }}
      surface="light"
    />
  </div>
);

export const OnDark = () => (
  <div className="w-[340px] bg-lot-ink p-4">
    <FeasibilityBadge parcel={sanDiegoLot} config={{ footprint: 600, width: 20, length: 30 }} surface="dark" />
  </div>
);
