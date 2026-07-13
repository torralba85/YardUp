# Store Deployment Readiness — iOS App Store + Google Play

**Date:** 2026-06-28
**Updated:** 2026-07-13
**Baseline health:** Remote `origin/master` at `27197f1` passed GitHub Actions run `29243888968`, including lint, Vitest, typecheck, build, Playwright, Firebase dry-run, Hosting + Firestore deploy, and Functions deploy. The current local checkout is 17 commits behind, dirty, missing `node_modules`, and fails `git diff --check` on two uncommitted `firestore.rules` lines; do not use it as the release baseline.
**Verdict:** The deployed web app is production-healthy, but **not yet shippable to either store**. In addition to missing wrappers/signing/assets, it lacks Sign in with Apple, a Google Play web deletion resource, complete settings/help/legal surfaces, and store-compliant payment channels for digital certificate/lead-credit purchases.

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

### ⚠️ Needs live-console verification
| Key | Impact |
|---|---|
| **`NEXT_PUBLIC_GOOGLE_PLACES_KEY`** | GitHub Actions metadata shows this secret exists as of 2026-07-04, and a live browser smoke against `https://yardup-2026.web.app/studio` returned `/api/suggest` suggestions for `1600 Pennsylvania Ave`. As of 2026-07-08, `e2e/address-suggest.spec.ts` adds an **opt-in** production `/api/suggest` smoke, gated behind `LOTFOUNDRY_E2E_LIVE_SUGGEST=1` (default CI does not set it, so CI does not hit prod — run it manually before submission). Still verify in Google Cloud Console that the value is the intended browser-safe Places key, HTTP-referrer-restricted to the production domains and localhost. |

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
- **Local dev:** `.env.local` exists in this checkout, but `functions/.env` does not. Do not copy secrets into docs or commits; use local env files only to exercise live data.

---

## 2. The Big Gap: there is no store package yet

LotFoundry is currently a **PWA** (`public/manifest.json`, `public/sw.js`, `public/offline.html`, `appleWebApp` meta in `app/layout.tsx`). There is **no Capacitor project, no iOS Xcode project, and no Android Gradle project.**

- **Google Play** accepts a PWA via a **TWA (Trusted Web Activity)** — generated with **PWABuilder** or **Bubblewrap**. Requires `/.well-known/assetlinks.json` (Digital Asset Links) and a signed `.aab`.
- **Apple App Store** does **not** accept raw PWAs. You need a native wrapper (**PWABuilder iOS** = a Swift `WKWebView` project, or **Capacitor**). Apple enforces Guideline **4.2 (minimum functionality)** — a thin web wrapper risks rejection unless it offers real app value (offline shell, push, native affordances).

The active implementation path is Android TWA + Play Billing and an iOS native
wrapper + StoreKit. See
`docs/superpowers/plans/2026-07-13-launch-completion-program.md`.

### 2A. Store-policy gaps found in the 2026-07-13 audit

- **Payments are not wrapper-safe yet.** The current certificate, direct lead
  unlock, and credit-pack flows use Stripe Checkout. Apple generally requires
  StoreKit for digital functionality/content used in the app, and Google Play
  generally requires Play Billing for digital in-app functionality. The launch
  plan therefore keeps Stripe for open-web purchases and adds StoreKit/Play
  Billing plus server-side receipt verification for store builds. Do not submit
  a wrapper that simply exposes the existing Stripe CTAs.
- **Sign in with Apple is missing.** The product offers Google as a social login;
  the iOS submission needs an equivalent privacy-preserving login option. Add
  Sign in with Apple through Firebase before TestFlight review.
- **Google's external deletion URL is missing.** In-app deletion exists, but
  Google Play also requires a functioning web resource usable after uninstall.
  `/delete-account` is currently a 404 and must be live before submission.
- **Minimum-functionality risk remains.** Apple Guideline 4.2 rejects a simple
  repackaged website. The iOS release candidate must include native share,
  native photo/camera handoff, offline certificate access, and explicit network
  recovery, then document those features in review notes.
- **Required consumer/support surfaces are incomplete.** `/about`, `/help`, and
  `/feedback` are 404; there is no full settings destination; the current
  privacy policy incorrectly names Vercel and omits several active processors.
  These are launch P0s in the active completion plan.

---

## 3. PWA-correctness bugs found
- ~~**Mislabeled icons:** `public/icon-180.png` and `public/icon-192.png` are both actually **512×512**. The manifest declares `192×192` and the Apple touch icon expects `180×180` → Lighthouse/PWABuilder flag a size mismatch and the maskable-icon test. Regenerate at true sizes; add a maskable variant with safe-zone padding.~~ ✅ fixed 2026-06-28.
- **No store screenshots:** `public/manifest.json` currently declares the three app icons only (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) and has no `screenshots` array. Add entries only after final mobile/tablet/desktop screenshots are captured and checked into `public/`.
- **Placeholder `/.well-known/assetlinks.json`:** the file exists, but the SHA-256 fingerprint is `REPLACE_WITH_PLAY_SIGNING_SHA256_FINGERPRINT`. Replace it after the human supplies the real Play signing SHA-256 fingerprint.
- ~~**Service worker is fallback-only:** `sw.js` serves `offline.html` on navigation failure but does not precache the app shell — a stronger offline story also helps the Apple 4.2 case.~~ ✅ fixed 2026-06-28.

---

## 4. Prioritized Todo List

### P0 — Launch blockers
1. **Build the settings/support/legal baseline:** `/settings`, shared account menu, `/about`, `/help`, `/feedback`, current Terms/Privacy, explicit AI consent, and support ownership.
2. **Complete deletion compliance:** remove/anonymize account-associated PII under the approved retention rule and ship `/delete-account` for Google Play.
3. **Add Sign in with Apple** through Firebase and test private relay email, account linking, and deletion.
4. **Implement store-compliant purchases:** Stripe web, StoreKit iOS, Play Billing Android, verified server-side with idempotent grants and revocation handling.
5. **Verify `NEXT_PUBLIC_GOOGLE_PLACES_KEY`** in Google Cloud Console (browser Places key, referrer-restricted) and rotate/update the GitHub secret if it does not match the intended key.
6. **Set `NEXT_PUBLIC_APP_URL`** to the production custom domain (Stripe redirects and owned app links).
7. **Verify `GOOGLE_MAPS_API_KEY`** has Static + Geocoding + Places enabled and is server-safe (not referrer-locked).
8. ~~**Regenerate `icon-180.png` (180²) and `icon-192.png` (192²)** at true sizes + a maskable-padded variant.~~ ✅ done 2026-06-28.

### P1 — Store packaging
9. Replace the placeholder SHA-256 in `/.well-known/assetlinks.json` after the real Play signing fingerprint is supplied, then generate the **Android TWA** with Play Billing → signed `.aab`.
10. Generate the **iOS wrapper** with StoreKit, native share/photo handoff, offline certificate access, and network recovery to satisfy Apple 4.2.
11. Add `manifest.json` **screenshots** after final mobile/tablet/desktop store captures are checked into `public/store/`.
12. **Privacy compliance:** App Store privacy "nutrition labels" + Play **Data Safety** form for email/name/avatar, property address, saved scenarios, AI photos sent to OpenAI, purchase history, identifiers, and diagnostics. Privacy and terms must first be corrected and counsel-reviewed.
13. Store metadata: name, subtitle, description, keywords, age rating, category, review notes, support URL `/help`, privacy URL `/privacy`, and deletion URL `/delete-account`.

### P2 — Functional / UX hardening
14. Verify Stripe webhook registered + secret matches; run a live test checkout.
15. **Real-device responsive QA** (iPhone SE/Pro, Pixel, iPad, Android tablet) — capture the store screenshots from this pass and document the capture flow.
16. ~~Strengthen the service worker to precache the app shell (real offline launch).~~ ✅ done 2026-06-28.
17. Run the Firebase smoke test with a dedicated user before promotion.
18. ~~Add `OPENAI_API_KEY` to `functions/.env.example`~~ ✅ done 2026-06-28.

---

## 5. Recommended sequence
1. Execute `docs/superpowers/plans/2026-07-13-launch-completion-program.md`
   Tasks 1–7 so settings, support, legal, deletion, and web reliability are live.
2. Execute Task 8 before wrapper submission so native builds never expose an
   unreviewed Stripe digital checkout path.
3. Build Android TWA + Play Billing and iOS wrapper + StoreKit/native value;
   complete internal-track and TestFlight QA.
4. Run real-device QA and use the release candidates for store screenshots.
5. Re-run the full web/native release gates plus Firebase smoke, deploy web,
   submit both stores, and keep the register open until both listings are
   actually available.
