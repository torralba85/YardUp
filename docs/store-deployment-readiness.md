# Store Deployment Readiness — iOS App Store + Google Play

**Date:** 2026-06-28
**Baseline health:** `lint` clean, `tsc --noEmit` clean, **291/291 Vitest pass**, last `master` CI run green.
**Verdict:** The web app is production-healthy, but **not yet shippable to either store** — there is no native/store wrapper, one production API key is missing, and several PWA-correctness items need fixing.

---

## 1. API Key & Secret Audit

Method: cross-checked `gh secret list`, Google Secret Manager (`gcloud secrets list`), the CI deploy step (`.github/workflows/ci.yml`), and code-level fallbacks.

### ✅ Configured and functioning
| Key | Where | Consumed by |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | GitHub secret | CI deploy |
| `GOOGLE_MAPS_API_KEY` | GitHub secret → `functions/.env` | `api/aerial`, `api/geocode`, `api/suggest` (server) |
| `REGRID_API_KEY` | GitHub secret → `functions/.env` | `api/parcel` (live parcel data) |
| `OPENAI_API_KEY` | GitHub secret + Secret Manager | `api/ai/*` panels |
| `STRIPE_SECRET_KEY` | Secret Manager → bound to `apiStripe` | `api/stripe/checkout` |
| `STRIPE_WEBHOOK_SECRET` | Secret Manager → bound to `apiStripe` | `api/stripe/webhook` |
| `NEXT_PUBLIC_FIREBASE_*` | hardcoded fallback in `lib/firebase.ts` | Firebase Auth + Firestore client |

### ❌ MISSING / BROKEN
| Key | Impact |
|---|---|
| **`NEXT_PUBLIC_GOOGLE_PLACES_KEY`** | **Not** in GitHub secrets. CI writes it as an empty string into both `functions/.env` and `.env.production.local`, and `components/studio/AddressSearch.tsx` has **no fallback** → **address autocomplete is dead in production**. Add a browser-safe Places key (HTTP-referrer-restricted to the prod domain, Places API enabled). This is the one confirmed break. |

### 🟡 Optional / fallback (works, but confirm before launch)
| Key | Behavior |
|---|---|
| `GOOGLE_GEOCODING_KEY` | optional; falls back to `GOOGLE_MAPS_API_KEY` |
| `GOOGLE_PLACES_SERVER_KEY` | optional; falls back to `GOOGLE_MAPS_API_KEY` |
| `NEXT_PUBLIC_APP_URL` | falls back to `https://yardup-2026.web.app`. **Set to the real custom domain** or Stripe success/cancel redirects land on the web.app URL. |
| `OPENAI_TEXT_MODEL` / `OPENAI_IMAGE_MODEL` | default to the code default if unset (README: `gpt-5.5`) |
| `NEXT_PUBLIC_LEAD_UNLOCK_PRICE_CENTS` | optional pricing override (default 4900) |

### 🔎 Must verify in the cloud consoles (not checkable from the repo)
- **`GOOGLE_MAPS_API_KEY`** has **Maps Static API + Geocoding API + Places API** all enabled, and is **not HTTP-referrer-restricted** (it is called server-side; referrer restriction would break it — use IP allow-list or API-scope restriction only).
- **`NEXT_PUBLIC_GOOGLE_PLACES_KEY`** (once added) is a **browser** key, referrer-restricted to the prod domain.
- **Stripe webhook** endpoint is registered in the Stripe Dashboard at `https://<domain>/api/stripe/webhook` (event `checkout.session.completed`) and its signing secret matches `STRIPE_WEBHOOK_SECRET`. Run one live test checkout.
- **Local dev:** no `.env.local` / `functions/.env` exist locally → only demo presets + Firebase work. Add keys locally to exercise live data.

---

## 2. The Big Gap: there is no store package yet

LotFoundry is currently a **PWA** (`public/manifest.json`, `public/sw.js`, `public/offline.html`, `appleWebApp` meta in `app/layout.tsx`). There is **no Capacitor project, no iOS Xcode project, and no Android Gradle project.**

- **Google Play** accepts a PWA via a **TWA (Trusted Web Activity)** — generated with **PWABuilder** or **Bubblewrap**. Requires `/.well-known/assetlinks.json` (Digital Asset Links) and a signed `.aab`.
- **Apple App Store** does **not** accept raw PWAs. You need a native wrapper (**PWABuilder iOS** = a Swift `WKWebView` project, or **Capacitor**). Apple enforces Guideline **4.2 (minimum functionality)** — a thin web wrapper risks rejection unless it offers real app value (offline shell, push, native affordances).

**This is a user decision (wrapper strategy) and the critical-path blocker — see todo P0-2.**

---

## 3. PWA-correctness bugs found
- **Mislabeled icons:** `public/icon-180.png` and `public/icon-192.png` are both actually **512×512**. The manifest declares `192×192` and the Apple touch icon expects `180×180` → Lighthouse/PWABuilder flag a size mismatch and the maskable-icon test. Regenerate at true sizes; add a maskable variant with safe-zone padding.
- **No store screenshots:** `manifest.json` has no `screenshots` array (Play listing wants narrow + wide).
- **No `/.well-known/assetlinks.json`** for the Android TWA.
- **Service worker is fallback-only:** `sw.js` serves `offline.html` on navigation failure but does not precache the app shell — a stronger offline story also helps the Apple 4.2 case.

---

## 4. Prioritized Todo List

### P0 — Launch blockers
1. **Add `NEXT_PUBLIC_GOOGLE_PLACES_KEY`** GitHub secret (browser Places key, referrer-restricted). Without it autocomplete is dead.
2. **Decide native-wrapper strategy** (PWABuilder TWA+iOS vs Capacitor) — drives the entire packaging path. *(user decision)*
3. **Regenerate `icon-180.png` (180²) and `icon-192.png` (192²)** at true sizes + a maskable-padded variant.
4. **Set `NEXT_PUBLIC_APP_URL`** to the production custom domain (Stripe redirects).
5. **Verify `GOOGLE_MAPS_API_KEY`** has Static + Geocoding + Places enabled and is server-safe (not referrer-locked).

### P1 — Store packaging
6. Add `/.well-known/assetlinks.json` + generate the **Android TWA** (PWABuilder/Bubblewrap) → signed `.aab`.
7. Generate the **iOS wrapper** project; satisfy Apple 4.2 (offline shell / push / native value-add).
8. Add `manifest.json` **screenshots** (mobile + tablet) for richer listings.
9. **Privacy compliance:** App Store privacy "nutrition labels" + Play **Data Safety** form (you collect address, account email, payment via Stripe). Privacy policy `/privacy` ✅ and terms `/terms` ✅ already exist.
10. Store metadata: name, subtitle, description, keywords, age rating, category (Finance/Business).

### P2 — Functional / UX hardening
11. Verify Stripe webhook registered + secret matches; run a live test checkout.
12. **Real-device responsive QA** (iPhone SE/Pro, Pixel, iPad) — capture the store screenshots from this pass.
13. Strengthen the service worker to precache the app shell (real offline launch).
14. Run the Firebase smoke test with a dedicated user before promotion.
15. ~~Add `OPENAI_API_KEY` to `functions/.env.example`~~ ✅ done 2026-06-28.

---

## 5. Recommended sequence
1. Land P0-1, P0-3, P0-4, P0-5 (config + icons — fast, no architecture change).
2. Get the P0-2 wrapper decision, then execute P1 packaging on that path.
3. Run P2 device QA → use those screenshots for both store listings.
4. Re-run the full release gate (`lint && test && tsc --noEmit && build`) + Firebase smoke, then submit.
