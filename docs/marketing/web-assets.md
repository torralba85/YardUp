# YardUp Web Assets

Updated: 2026-05-24

This document tracks the web deployment assets (favicons, touch icons, manifest) that follow the Quiet Ascent identity defined in [DESIGN.md](../../DESIGN.md). These assets ship with the marketing site and any web preview of the Expo app, not with the native bundle.

## Identity Constraints

- Use the YardUp mark: roofline as arrow, stem as house body, ground line as yard.
- Render the mark in Revenue Green `#1F9D63` on either Paper `#F6F4EE` or Forest Deep `#0E2C20`.
- No rounded-rectangle frames, no drop shadows, no decorative gradients. Mark fills the canvas cleanly.
- The mark must remain recognizable at 16×16. If detail is lost, simplify the stem rather than adding strokes.

## Required Files

| Asset | Size(s) | Background | Foreground | Notes |
| --- | --- | --- | --- | --- |
| `favicon.ico` | 16, 32, 48 | Paper `#F6F4EE` | Revenue Green `#1F9D63` | Full-bleed mark, no border |
| `favicon.svg` | scalable | Paper `#F6F4EE` | Revenue Green `#1F9D63` | Single-path SVG preferred |
| `apple-touch-icon.png` | 180×180 | Forest Deep `#0E2C20` | Revenue Green `#1F9D63` | High-contrast premium feel |
| `icon-192.png` | 192×192 | Paper `#F6F4EE` | Revenue Green `#1F9D63` | Web manifest standard |
| `icon-512.png` | 512×512 | Paper `#F6F4EE` | Revenue Green `#1F9D63` | Web manifest standard |
| `maskable-icon-512.png` | 512×512 (safe area 80%) | Forest Deep `#0E2C20` | Revenue Green `#1F9D63` | PWA install prompt |
| `og-image.png` | 1200×630 | Forest Deep `#0E2C20` | Paper `#F6F4EE` text + Revenue Green accent | Default Open Graph card |
| `manifest.json` | — | — | — | See template below |

## `manifest.json` Template

```json
{
  "name": "YardUp",
  "short_name": "YardUp",
  "description": "Estimate ADU revenue, cost, payback, and find builders ready to act.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F6F4EE",
  "theme_color": "#0E2C20",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/maskable-icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## `<head>` Snippet

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0E2C20" />
<meta property="og:title" content="YardUp — Your Backyard, Unlocked." />
<meta property="og:description" content="See how much an ADU could earn, what it would cost, and which builders can act on it." />
<meta property="og:image" content="/og-image.png" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

## Production Notes

- Export PNGs at 1× and 2× where applicable; the asset table above already lists the canonical sizes.
- Re-check the mark at 16×16 in light and dark browser themes after every brand change.
- Keep the OG image text large enough to read in a 600px-wide social card preview.
- Do not ship a generic Expo splash screen on the web preview — replace it with a Quiet Ascent variant before any external link is shared.

## Open Items

- Final OG headline copy is provisional. Lock it once the landing page positioning is finalized.
- Decide whether the maskable icon uses Forest Deep (current default) or a softer Forest `#143D2B` for less aggressive install previews.
- Wire `theme-color` media queries if a future dark mode lands on the marketing site.
