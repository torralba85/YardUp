import type { Parcel } from "@/lib/parcel-types";
import { parcelDataNotice } from "@/lib/parcel-confidence";

export default function ParcelDataNotice({ parcel }: { parcel: Parcel }) {
  const notice = parcelDataNotice(parcel);
  if (!notice) return null;
  return (
    <p
      role="status"
      className="mt-3 border border-status-review/35 bg-status-review-soft px-3 py-2 text-xs leading-5 text-status-review"
    >
      {notice}
    </p>
  );
}

