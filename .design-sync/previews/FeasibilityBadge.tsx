import { useEffect, useRef, type ReactNode } from "react";
import { FeasibilityBadge } from "@lotfoundry/ui";

// The badge is a <details> disclosure; the review stories open it, as a tap
// would, so the reason for the review shows.
const Expanded = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("details")?.setAttribute("open", "");
  }, []);
  return (
    <div ref={ref} className="w-[340px] bg-lot-chalk p-4">
      {children}
    </div>
  );
};

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
  <Expanded>
    <FeasibilityBadge parcel={sanDiegoLot} config={{ footprint: 1000, width: 25, length: 40 }} surface="light" />
  </Expanded>
);

export const ZoningUnverified = () => (
  <Expanded>
    <FeasibilityBadge
      parcel={{ ...sanDiegoLot, zoning: "Unknown" }}
      config={{ footprint: 600, width: 20, length: 30 }}
      surface="light"
    />
  </Expanded>
);

export const OnDark = () => (
  <div className="w-[340px] bg-lot-ink p-4">
    <FeasibilityBadge parcel={sanDiegoLot} config={{ footprint: 600, width: 20, length: 30 }} surface="dark" />
  </div>
);
