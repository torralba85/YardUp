# ci

## Overview
Build, CI, design auditing, and automation scripts for ci.

## Interface
- `analytics.checks.mjs:main` - Executable entrypoint / script
- `attom-canary.mjs:verifyAttomOnProduction` - Exported Function
- `deployment.mjs:recordDeployment` - Exported Function
- `github.mjs:githubApi` - Exported Function
- `github.mjs:deploymentEnvironment` - Exported constant / variable
- `github.mjs:deploymentMarker` - Exported constant / variable
- `google-sign-in.checks.mjs:main` - Executable entrypoint / script
- `google-sign-in.mjs:productionAuthDomain` - Exported constant / variable
- `google-sign-in.mjs:productionProjectId` - Exported constant / variable
- `google-sign-in.mjs:productionWebClientId` - Exported constant / variable
- `google-sign-in.mjs:signInConfig` - Exported Function
- `google-sign-in.mjs:checkDns` - Exported Function
- `google-sign-in.mjs:checkAuthHandler` - Exported Function
- `google-sign-in.mjs:checkFirebaseInit` - Exported Function
- `google-sign-in.mjs:decodeAuthError` - Exported Function
- `google-sign-in.mjs:oauthProbeUrl` - Exported Function
- `google-sign-in.mjs:checkOAuthRedirect` - Exported Function
- `google-sign-in.mjs:withRetries` - Exported Function
- `google-sign-in.mjs:verifyGoogleSignIn` - Exported Function
- `scope.checks.mjs:main` - Executable entrypoint / script
- `scope.mjs:isDocumentation` - Exported Function
- `scope.mjs:affectsProduction` - Exported Function
- `scope.mjs:gitDiff` - Exported Function
- `scope.mjs:productionEvent` - Exported Function
- `scope.mjs:deploymentDefinition` - Exported Function
- `scope.mjs:productionChanged` - Exported Function
- `scope.mjs:getDeploymentBaseline` - Exported Function
- `scope.mjs:determineScope` - Exported Function
- `scope.mjs:verificationPassed` - Exported Function
- `serving-revision.checks.mjs:main` - Executable entrypoint / script
- `serving-revision.mjs:assertServingRevision` - Exported Function
- `serving-revision.mjs:describeServingRevision` - Exported Function
- `serving-revision.mjs:verifyServingRevisions` - Exported Function
- `verify-analytics.mjs:productionMeasurementId` - Exported constant / variable
- `verify-analytics.mjs:verifyAnalyticsBundle` - Exported Function

## Invariants
- `analytics.checks.mjs:assert.throws` - Schema / validation invariant
- `analytics.checks.mjs:assert.equal` - Schema / validation invariant
- `attom-canary.mjs:throw` - new Error("ATTOM canary requires a signed-in disposable account.")
- `attom-canary.mjs:throw` - new Error("ATTOM production API request failed or timed out.")
- `attom-canary.mjs:throw` - new Error(`ATTOM production API returned HTTP ${response.status}.`)
- `attom-canary.mjs:throw` - new Error("ATTOM production API returned invalid JSON.")
- `attom-canary.mjs:throw` - new Error(`ATTOM live address check failed: ${reason}.`)
- `deployment.mjs:throw` - new Error("Production records can only be written by master push/dispatch runs")

## Side Effects
- `attom-canary.mjs:fetchImpl` - External call or state mutation
- `github.mjs:fetcher` - External call or state mutation
- `google-sign-in.mjs:fetchImpl` - External call or state mutation

## Verification
- Run: `npm test`
