import { ImageResponse } from "next/og";
import { COLOR } from "@/lib/design-tokens";

/** Open Graph image dimensions; each route also exports them as `size`. */
const ADU_OG_SIZE = { width: 1200, height: 630 };

/**
 * ADU page OG image: a kicker, the city name over chalk, and the
 * signal-orange volume beside a tagline — the lot-illustration idea reduced
 * to what satori can render (flexbox and flat shapes only, no grid, system
 * fonts only so builds never depend on a font fetch).
 */
export function renderAduOgImage({
  kicker,
  title,
  tagline,
}: {
  kicker: string;
  title: string;
  tagline: string;
}) {
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
          background: COLOR["lot-chalk"],
          color: COLOR["lot-ink"],
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
            color: COLOR["lot-stone"],
          }}
        >
          {kicker}
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
          {title}
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
              background: COLOR["lot-orange"],
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 32,
              marginLeft: 24,
              color: COLOR["lot-stone"],
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    ),
    { ...ADU_OG_SIZE },
  );
}
