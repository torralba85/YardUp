# ci

## Overview

Build, CI, design auditing, and automation scripts for ci.

## Interface

- [`analytics.checks.mjs`](./analytics.checks.mjs) — script entry point.
- [`attom-canary.mjs`](./attom-canary.mjs) — `verifyAttomOnProduction`
- [`deployment.mjs`](./deployment.mjs) — `recordDeployment`
- [`github.mjs`](./github.mjs) — `githubApi`, `deploymentEnvironment`, `deploymentMarker`
- [`google-sign-in.checks.mjs`](./google-sign-in.checks.mjs) — script entry point.
- [`google-sign-in.mjs`](./google-sign-in.mjs) — `productionAuthDomain`, `productionProjectId`, `productionWebClientId`, `signInConfig`, `checkDns`, `checkAuthHandler`, `checkFirebaseInit`, `checkAuthIframe`, `decodeAuthError`, `oauthProbeUrl`, `checkOAuthRedirect`, `withRetries`, `verifyGoogleSignIn`
- [`production-headers.checks.mjs`](./production-headers.checks.mjs) — script entry point.
- [`scope.checks.mjs`](./scope.checks.mjs) — script entry point.
- [`scope.mjs`](./scope.mjs) — `isDocumentation`, `affectsProduction`, `gitDiff`, `productionEvent`, `deploymentDefinition`, `productionChanged`, `getDeploymentBaseline`, `determineScope`, `verificationPassed`
- [`serving-revision.checks.mjs`](./serving-revision.checks.mjs) — script entry point.
- [`serving-revision.mjs`](./serving-revision.mjs) — `assertServingRevision`, `describeServingRevision`, `verifyServingRevisions`
- [`verify-analytics.mjs`](./verify-analytics.mjs) — `productionMeasurementId`, `verifyAnalyticsBundle`
- [`verify-production-headers.mjs`](./verify-production-headers.mjs) — `PRODUCTION_ORIGIN`, `EXPECTED_HSTS_FRAGMENTS`, `assertProductionHeaders`, `findStaticAssetUrl`, `selectSampleSitemapUrls`, `hashHtml`, `verifyFreshHtml`, `verifyProductionHeaders`

## Invariants

None identified in the direct source.

## Side Effects

- [`analytics.checks.mjs`](./analytics.checks.mjs) — filesystem writes via mkdirSync, writeFileSync, rmSync.
- [`deployment.mjs`](./deployment.mjs) — filesystem writes via appendFileSync.
- [`google-sign-in.checks.mjs`](./google-sign-in.checks.mjs) — filesystem reads via readFileSync.
- [`scope.checks.mjs`](./scope.checks.mjs) — filesystem reads via readFileSync. subprocess execution via execFileSync. filesystem writes via mkdirSync, writeFileSync, rmSync.
- [`scope.mjs`](./scope.mjs) — subprocess execution via execFileSync. filesystem reads via readFileSync. filesystem writes via appendFileSync.
- [`serving-revision.checks.mjs`](./serving-revision.checks.mjs) — filesystem reads via readFileSync.
- [`serving-revision.mjs`](./serving-revision.mjs) — subprocess execution via execFileSync.
- [`verify-analytics.mjs`](./verify-analytics.mjs) — filesystem reads via readdirSync, readFileSync.

## Configuration

- [`deployment.mjs`](./deployment.mjs) — appends `id=<deployment_id>` to `GITHUB_OUTPUT` on `start`, and reads `GITHUB_EVENT_NAME`, `GITHUB_REF`, `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `GITHUB_RUN_ID`, `GITHUB_SHA`, `DEPLOYMENT_ID`, `DEPLOYMENT_OUTCOME`.
- [`scope.mjs`](./scope.mjs) — reads `CI_NEEDS`, `GITHUB_EVENT_PATH`, `GITHUB_EVENT_NAME`, `GITHUB_REF`, `GITHUB_SHA` and appends scope outputs and markdown summaries to `GITHUB_OUTPUT` and `GITHUB_STEP_SUMMARY`.

## Verification

Run `npm test` from the YardUp repository root.
