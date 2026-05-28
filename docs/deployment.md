# Deployment Guide

UrbanLens AR ships as a static-friendly Next.js 16 app. Default target: **Vercel**.

## Prerequisites

- Node.js 20 or newer locally.
- A Vercel account linked to this repository (or any host able to run `next build` + `next start`).
- No environment variables, secrets, or external accounts are required for the demo.

## Build Configuration

The project's `next.config.ts` exports:

```ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["motion"],
};
```

- `output: "standalone"` produces a self-contained server bundle for Docker / self-hosted environments. Vercel transparently supports it; remove only if your platform documents a conflict.
- `transpilePackages` covers a known ESM transpilation requirement for the `motion` dependency.

## Vercel Deployment

1. Connect the GitHub repository in the Vercel dashboard.
2. Framework preset: **Next.js** (auto-detected).
3. Install command: `npm ci`
4. Build command: `npm run build`
5. Output: default (Vercel handles `.next/`).
6. Environment variables: **none required**.
7. Click **Deploy**.

After the first deployment Vercel will give you a `*.vercel.app` URL. Subsequent commits to the default branch deploy automatically. Pull requests get preview URLs.

## Self-Hosting

```bash
npm ci
npm run build
npm run start    # serves on port 3000 by default
```

For Docker / containerized hosts, copy the `.next/standalone` output:

```bash
node .next/standalone/server.js
```

## Release Verification

Before promoting a deploy run the local release gate:

```bash
npm ci
npm run lint
npm run test
npm run test:e2e
npx tsc --noEmit
npm run build
```

All commands must pass. CI (`.github/workflows/ci.yml`) runs the same gate.

## Post-Deploy Smoke Test

After deployment, manually verify:

- Title `UrbanLens AR | ADU Feasibility Studio` loads.
- The default feasibility workflow is visible.
- The report preview is visible at the bottom of the page.
- Selecting `compact-lot` and `1,000 sf` displays the `Review needed` alert.
- No console errors in the browser devtools.
- The Share Link button copies the current scenario URL.

## Rollback

Vercel: open the deployments list, find the previous successful production deployment, and click **Promote to Production**. No data migration is required because the app stores all user state locally in the browser.

Self-hosted: redeploy the previous git tag (`rc-2026-05-28-1` for the initial RC) or the previous successful Docker image.

## Audit Note

`npm audit --audit-level=moderate` currently reports a Next.js nested PostCSS advisory whose automatic fix proposes a breaking Next.js downgrade. Do **not** run `npm audit fix --force`. Track this through Next.js upstream releases and apply once a non-breaking fix is available.
