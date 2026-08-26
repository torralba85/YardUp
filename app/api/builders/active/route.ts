import { NextResponse, type NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { getAdminDb } from "@/lib/server/firebase-admin";
import type { BuilderDirectoryProfile, ServiceArea } from "@/lib/marketplace-types";

export const runtime = "nodejs";

function publicServiceAreas(value: unknown): ServiceArea[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((area) => {
    if (
      !area ||
      typeof area !== "object"
    ) {
      return [];
    }
    const candidate = area as Record<string, unknown>;
    if (
      typeof candidate.city !== "string" ||
      typeof candidate.state !== "string" ||
      typeof candidate.key !== "string"
    ) {
      return [];
    }
    return [{ city: candidate.city, state: candidate.state, key: candidate.key }];
  });
}

/**
 * Return the minimal builder directory required for matching. This server-built
 * response deliberately excludes profile PII and billing fields.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  const snapshot = await getAdminDb()
    .collection("builders")
    .where("active", "==", true)
    .get();

  const builders: BuilderDirectoryProfile[] = snapshot.docs.flatMap((builder) => {
    const data = builder.data();
    const companyName = typeof data.companyName === "string" ? data.companyName.trim() : "";
    const serviceAreas = publicServiceAreas(data.serviceAreas);
    if (!companyName || serviceAreas.length === 0) return [];

    return [{
      id: builder.id,
      companyName,
      serviceAreas,
      active: true,
      licensed: typeof data.licenseNumber === "string" && data.licenseNumber.trim().length > 0,
    }];
  });

  return NextResponse.json({ builders });
}
