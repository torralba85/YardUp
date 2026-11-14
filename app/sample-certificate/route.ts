import { sampleCertificateResponse } from "@/lib/sample-certificate";

// A fixed, public demo only. Never accept a parcel, grant, address, or paid brief here.
export const dynamic = "force-static";

export function GET() {
  return sampleCertificateResponse("san-diego");
}
