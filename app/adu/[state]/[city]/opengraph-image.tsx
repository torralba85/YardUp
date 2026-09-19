import { ImageResponse } from "next/og";
import { aduStaticParams, getCity } from "@/lib/adu/content";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

/**
 * Per-city OG image: city name over chalk with the signal-orange volume —
 * the lot-illustration idea reduced to what satori can render (flexbox and
 * flat shapes only, no grid, system fonts only so builds never depend on a
 * font fetch).
 */
export function generateStaticParams() {
  return aduStaticParams();
}

export default async function AduCityOgImage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const content = getCity(state, city);
  const cityName = content?.city ?? "California";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#F5F5F0",
          color: "#161616",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#65655F",
          }}
        >
          LotFoundry · ADU Rules (2026)
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.05,
            marginTop: 16,
          }}
        >
          {cityName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 240,
              height: 48,
              background: "#FF5B24",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 32,
              marginLeft: 24,
              color: "#65655F",
            }}
          >
            Size, setbacks &amp; permits
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
