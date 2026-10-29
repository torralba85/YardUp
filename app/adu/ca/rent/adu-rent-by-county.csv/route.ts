import { rentCsv } from "@/content/adu/ca/rent";

export const dynamic = "force-static";

/** CSV download of the rent page's county table, generated from the same data module. */
export function GET(): Response {
  return new Response(rentCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="california-adu-rent-by-county.csv"',
    },
  });
}
