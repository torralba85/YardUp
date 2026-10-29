import { permitStudyCsv } from "@/content/adu/ca/san-diego-permits";

export const dynamic = "force-static";

/** CSV download of the permit study's planning-area table. */
export function GET(): Response {
  return new Response(permitStudyCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="san-diego-adu-permits-by-planning-area.csv"',
    },
  });
}
