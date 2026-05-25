# Iconography & Store Asset Brief — YardUp (ADU Advisor)

Bundle ID (iOS + Android): `com.aduadvisor.app`. Brand: YardUp. Legal: ADU Advisor.

All assets follow the Quiet Ascent palette from `DESIGN.md`. Primary surfaces use **Paper `#F6F4EE`** as background and **Ink `#15231C`** for the wordmark. The YardUp mark (roof = arrow, stem = home, ground = yard) sits on Paper with generous space; the `Up` in the wordmark is **Revenue Green `#1F9D63`**. Reserve **Cash Highlight `#CFF86D`** for a single accent moment (e.g., the arrow tip in the feature graphic). Do not add secondary symbols, decorative orbs, or gradients.

Typography in overlays: **Hanken Grotesk 800** for screen captions, **Fraunces 600** only when a dollar figure carries the frame, **IBM Plex Mono** for any tabular number callout.

---

## 1. App Icon

| Asset | Dimensions | Format | Treatment | Consumed by |
|------|------------|--------|-----------|-------------|
| iOS App Icon | 1024×1024 | PNG, no alpha, sRGB, square (no rounding) | Paper background, centered Ink YardUp mark, `Up` accent in Revenue Green. No drop shadow. Safe margin ~10% on all sides. | `app.json` `ios.icon`; App Store Connect |
| Android Adaptive — Foreground | 432×432 (108×108 dp @ xxxhdpi) | PNG, transparent | Ink mark centered inside the 264×264 safe circle. No background here. | `app.json` `android.adaptiveIcon.foregroundImage` |
| Android Adaptive — Background | 432×432 | PNG or solid color | Solid Paper `#F6F4EE`. | `app.json` `android.adaptiveIcon.backgroundColor` / `backgroundImage` |
| Play Store Icon | 512×512 | PNG, 32-bit, no alpha | Same lockup as iOS 1024 scaled down; preserve safe margin. | Play Console listing |
| Legacy Android Icon (fallback) | 512×512 | PNG, no alpha | Same as Play icon, used for pre-adaptive devices. | `app.json` `android.icon` |

## 2. Splash Screen

| Asset | Dimensions | Format | Treatment | Consumed by |
|------|------------|--------|-----------|-------------|
| Splash image | 1242×2436 (logical canvas, Expo scales) | PNG, transparent | Ink YardUp mark centered, no wordmark, no tagline. | `expo-splash-screen` plugin in `app.json` |
| Splash background color | n/a | hex | `#F6F4EE` (Paper) | `expo-splash-screen` `backgroundColor` |
| Dark mode splash background | n/a | hex | `#0E2C20` (Forest Deep) with Mint-tinted mark | `expo-splash-screen` `dark.backgroundColor` |

## 3. Web Icons (Expo Router web target)

| Asset | Dimensions | Format | Treatment | Consumed by |
|------|------------|--------|-----------|-------------|
| Apple Touch Icon | 180×180 | PNG, no alpha | Ink mark on Paper, no rounding (iOS applies it). | `<link rel="apple-touch-icon">` in `app/+html.tsx` or `public/` |
| Favicon 32 | 32×32 | PNG | Ink mark, simplified to roof+stem only at this size. | `public/favicon-32.png` |
| Favicon 16 | 16×16 | PNG | Solid Ink glyph, no ground line (too thin to read). | `public/favicon-16.png` |
| Favicon SVG | scalable | SVG, single path | Ink mark, currentColor for theme switching. | `public/favicon.svg` |

## 4. iPhone Screenshots

Three screenshots minimum per size, five recommended. All exported PNG, sRGB, no alpha, portrait.

| Display | Dimensions | Surface | Caption (Hanken Grotesk 800, Ink on Paper) |
|---------|------------|---------|--------------------------------------------|
| 6.7" (iPhone 15/16 Pro Max) | 1290×2796 | **Value** | "See what your backyard could earn." |
| 6.7" | 1290×2796 | **Estimate** | "Rent, cost, payback — in one sheet." |
| 6.7" | 1290×2796 | **Builders** | "Matched to builders who actually do ADUs." |
| 6.7" | 1290×2796 | **Permits** | "Know the blockers before you spend." |
| 6.7" | 1290×2796 | **Studio** | "Prove the model fits your lot." |
| 6.5" (iPhone 11 Pro Max / XS Max) | 1242×2688 | Same five surfaces, same captions | — |
| 5.5" (iPhone 8 Plus) | 1242×2208 | Onboarding wizard + Value + Estimate + Builders + Permits | Onboarding caption: "Three questions. One income number." |

## 5. iPad Screenshots

| Display | Dimensions | Surface | Caption |
|---------|------------|---------|---------|
| 12.9" iPad Pro | 2048×2732 | **Value** (two-column layout) | "Your backyard, underwritten." |
| 12.9" | 2048×2732 | **Estimate** | "Gross rent, expenses, net — tabular and honest." |
| 12.9" | 2048×2732 | **Builders** | "Quote packet ready when the builder is." |
| 12.9" | 2048×2732 | **Permits** | "Local rules, verified date, source cited." |

## 6. Android Phone Screenshots

| Asset | Dimensions | Surface | Caption |
|-------|------------|---------|---------|
| Phone shot 1 | 1080×1920 (min; 1080×2400 preferred) | **Value** | "See what your backyard could earn." |
| Phone shot 2 | 1080×1920 | **Estimate** | "Rent minus expenses. That's the number." |
| Phone shot 3 | 1080×1920 | **Builders** | "Builders matched by service area and ADU history." |
| Phone shot 4 | 1080×1920 | **Permits** | "Amber means verify. Green means cleared." |
| Phone shot 5 | 1080×1920 | **Studio** | "Does the model fit? Find out before you pay." |

## 7. Android Tablet Screenshots

| Asset | Dimensions | Surface | Caption |
|-------|------------|---------|---------|
| 7" tablet shot 1 | 1200×1920 | **Value** | "Your backyard, underwritten." |
| 7" tablet shot 2 | 1200×1920 | **Estimate** | "One sheet. Real numbers." |
| 10" tablet shot 1 | 1600×2560 | **Builders** | "Send one quote packet. Get real bids." |
| 10" tablet shot 2 | 1600×2560 | **Permits** | "Risk, blockers, verification — sourced." |

## 8. Play Store Feature Graphic

| Asset | Dimensions | Format | Treatment | Consumed by |
|-------|------------|--------|-----------|-------------|
| Feature graphic | 1024×500 | PNG or JPG, no alpha | Forest Deep `#0E2C20` background, YardUp wordmark left (Paper, `Up` in Revenue Green), single Cash Highlight accent at the arrow tip of the mark, right side reads "See what your backyard could earn." in Hanken Grotesk 800 Paper. No screenshots inside the graphic. | Play Console listing |

## 9. Open Graph / Social Card

| Asset | Dimensions | Format | Treatment | Consumed by |
|-------|------------|--------|-----------|-------------|
| OG image | 1200×630 | PNG (or JPG ≤300KB) | Paper background, Ink wordmark top-left, Fraunces 600 dollar figure ("$2,400/mo") center, IBM Plex Mono subline "rent · cost · payback · builders". Match the OG slot defined in `docs/marketing/web-assets.md`. | `<meta property="og:image">`; Twitter card; LinkedIn unfurl |

---

## Production Notes

- Export at 1x; let stores downscale. Never upscale.
- iOS icon: strip alpha channel before upload or App Store Connect will reject.
- Adaptive Android icon: keep the mark inside the 66% safe circle so launchers can mask to circle, squircle, or teardrop without clipping the arrow.
- Screenshots should show **real product surfaces with real data shapes**, not Figma mockups. Per `AGENTS.md`, do not hide revenue, cost, payback, or builder readiness behind decoration.
- Do not use California-specific copy in store assets; use "supported markets" framing.
- Captions must lead with money or builder action — never "design your dream ADU."
