import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Painterly aerial base for the hero. A reference-style oblique aerial: a hazy
 * horizon with distant hills, a patchwork of cultivated fields divided by faint
 * hedgerows (which echoes the cadastral theme), a winding lane, tree clusters
 * with soft cast shadows, a small pond, and a gentle vignette for depth.
 *
 * The central band (~x 690–1360, y 520–900) is kept calm on purpose: the
 * cadastral boundary, ADU, pin and rent chip are composited there and must stay
 * legible. A constant overscan (scale never below 1.08) means the slow parallax
 * drift can never expose the background at the edges.
 */
export const AerialBase: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const intro = interpolate(frame, [0, 24], [1.16, 1.08], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = interpolate(frame, [0, durationInFrames], [0, -26]);
  const fade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade, backgroundColor: "#5d7a55" }}>
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: `scale(${intro}) translateX(${drift}px)`, transformOrigin: "center" }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e7d9bf" />
            <stop offset="0.55" stopColor="#cfd2bd" />
            <stop offset="1" stopColor="#aebfa1" />
          </linearGradient>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#86a06a" />
            <stop offset="1" stopColor="#4f6b4f" />
          </linearGradient>
          <radialGradient id="sun" cx="0.66" cy="0.18" r="0.7">
            <stop offset="0" stopColor="#fff4dc" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#fff4dc" stopOpacity="0.08" />
            <stop offset="1" stopColor="#fff4dc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pond" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#8fb6ac" />
            <stop offset="1" stopColor="#4f7d72" />
          </radialGradient>
          <radialGradient id="vignette" cx="0.52" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#261307" stopOpacity="0" />
            <stop offset="1" stopColor="#261307" stopOpacity="0.28" />
          </radialGradient>
          <filter id="treeShadow" x="-40%" y="-40%" width="180%" height="200%">
            <feDropShadow dx="10" dy="16" stdDeviation="10" floodColor="#1c2a18" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Sky + distant haze + hills */}
        <rect width="1920" height="240" fill="url(#sky)" />
        <path d="M0 232 Q360 196 760 214 T1500 200 T1920 214 V250 H0 Z" fill="#9fb19a" opacity="0.7" />
        <path d="M0 244 Q520 210 1040 236 T1920 222 V260 H0 Z" fill="#8aa07f" opacity="0.85" />
        <rect y="196" width="1920" height="58" fill="#f3ead7" opacity="0.28" />

        {/* Land base */}
        <rect y="226" width="1920" height="854" fill="url(#land)" />

        {/* Field patchwork (faint hedgerow dividers echo the cadastral theme) */}
        <g stroke="#37492c" strokeOpacity="0.32" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M0 230 L520 250 L500 470 L0 440 Z" fill="#7e9a64" />
          <path d="M520 250 L1080 262 L1060 482 L500 470 Z" fill="#6f8c5f" />
          <path d="M1080 262 L1920 236 L1920 470 L1060 482 Z" fill="#88a36b" />
          <path d="M0 440 L500 470 L482 706 L0 690 Z" fill="#cbb47e" />
          <path d="M500 470 L1060 482 L1040 724 L482 706 Z" fill="#8aa168" />
          <path d="M1060 482 L1920 470 L1920 726 L1040 724 Z" fill="#cdbd84" />
          <path d="M0 690 L482 706 L462 1080 L0 1080 Z" fill="#a98a5f" />
          <path d="M482 706 L1040 724 L1020 1080 L462 1080 Z" fill="#5f7d55" />
          <path d="M1040 724 L1920 726 L1920 1080 L1020 1080 Z" fill="#6f8c5f" />
        </g>

        {/* Tilled-row texture on two cultivated patches */}
        <g stroke="#9c7f52" strokeOpacity="0.28" strokeWidth="2">
          <path d="M40 540 L470 566 M40 596 L468 622 M40 652 L466 678" />
        </g>
        <g stroke="#b6a268" strokeOpacity="0.3" strokeWidth="2">
          <path d="M1090 520 L1900 512 M1090 566 L1900 558 M1090 612 L1900 604 M1090 658 L1900 650" />
        </g>

        {/* Winding lane, routed to the right of the lot */}
        <path
          d="M-60 1040 C 360 940, 620 1000, 900 840 S 1420 690, 1990 742"
          fill="none"
          stroke="#9c8b64"
          strokeWidth="54"
          strokeLinecap="round"
        />
        <path
          d="M-60 1040 C 360 940, 620 1000, 900 840 S 1420 690, 1990 742"
          fill="none"
          stroke="#d8c9a6"
          strokeWidth="40"
          strokeLinecap="round"
        />

        {/* Pond, lower-left */}
        <ellipse cx="232" cy="958" rx="168" ry="78" fill="url(#pond)" />
        <ellipse cx="232" cy="958" rx="168" ry="78" fill="none" stroke="#3f5a3c" strokeOpacity="0.4" strokeWidth="3" />
        <ellipse cx="190" cy="936" rx="58" ry="20" fill="#d8efe6" opacity="0.35" />

        {/* Tree clusters with cast shadows (kept clear of the central lot) */}
        <g filter="url(#treeShadow)">
          {[
            { x: 286, y: 372, r: 30 },
            { x: 690, y: 296, r: 24 },
            { x: 1632, y: 524, r: 34 },
            { x: 1516, y: 868, r: 30 },
            { x: 372, y: 560, r: 26 },
            { x: 1792, y: 300, r: 24 },
          ].map((t, i) => (
            <g key={i} transform={`translate(${t.x} ${t.y})`}>
              <circle cx={-t.r * 0.6} cy={t.r * 0.2} r={t.r * 0.8} fill="#33472f" />
              <circle cx={t.r * 0.6} cy={t.r * 0.25} r={t.r * 0.78} fill="#3f5a3c" />
              <circle cx={0} cy={-t.r * 0.3} r={t.r} fill="#3a5235" />
              <circle cx={-t.r * 0.25} cy={-t.r * 0.45} r={t.r * 0.4} fill="#557049" opacity="0.7" />
            </g>
          ))}
        </g>

        {/* Light + vignette */}
        <rect width="1920" height="1080" fill="url(#sun)" />
        <rect width="1920" height="1080" fill="url(#vignette)" />
      </svg>
    </AbsoluteFill>
  );
};
