# Release Checklist

- [x] `npm ci`
- [x] `npm run lint`
- [x] `npm run test` — 24 passing
- [x] `npm run test:e2e` — 26 passing across desktop-chromium and mobile-chromium
- [x] `npx tsc --noEmit`
- [x] `npm run build` — production build succeeds
- [x] Desktop visual check at 1440x900 (e2e screenshot)
- [x] Tablet visual check at 768x1024 (e2e screenshot)
- [x] Mobile visual check at 390x844 and 320x568 (e2e screenshots + overflow assertion)
- [x] Keyboard navigation check (accessibility.spec)
- [x] Report print/save check (CSS print rules + Print/Save PDF button)
- [x] Download summary check (e2e download assertion)
- [x] Audit reviewed; no unsafe forced downgrade applied (Next/PostCSS advisory acknowledged in deployment.md)
