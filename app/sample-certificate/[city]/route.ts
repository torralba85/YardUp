import { landingDemos, type LandingCity } from "@/lib/landing-demo";
import { sampleCertificateResponse } from "@/lib/sample-certificate";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(landingDemos).map((city) => ({ city })); }
export async function GET(_request: Request, { params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (!Object.hasOwn(landingDemos, city)) return new Response(null, { status: 404 });
  return sampleCertificateResponse(city as LandingCity);
}
