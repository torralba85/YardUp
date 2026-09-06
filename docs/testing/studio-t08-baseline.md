# T08 baseline and opt-in measurement core

Gemini drafted this Wave 1 foundation against baseline `56293db`. Codex reviewed and corrected fixtures, expected failures, lifecycle handling, counters, and synthetic tests. No renderer or Studio adapter is applied.

Run from this isolated worktree:

```powershell
node node_modules/vitest/vitest.mjs run lib/studio-baseline-regressions.test.ts lib/studio-measurement.test.ts --maxWorkers=1
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js lib/studio-baseline-regressions.test.ts lib/studio-measurement.ts lib/studio-measurement.test.ts --max-warnings=0
```

The three `test.fails` cases assert desired custom-shape recovery, currently broken. They count as expected failures, not repaired behavior. After T03, remove their expected-failure markers and verify ordinary passes. The impossible-bounds test documents the old D2 defect; replace it with the T02 result contract when integrated.

## Measurement contract and missing integration

The collector performs no work until explicitly invoked. All method timestamps share one monotonic origin; metadata.timestamp is only a wall-clock label. `start(time, warmupMs)` clears a previous run. Readiness includes warmup; frame statistics start with the first complete interval after warmup. `setActivity(false)` explicitly excludes idle intervals; it must never be triggered just because a frame took a long time. Statistics use nearest-rank quantiles and preserve active stalls. All collections are bounded; reports expose dropped sample counts, and missing measurements remain null.

Integration owner: in a dedicated local profiling build, start a collector when entering Shape, mark meaningful frame at the explicitly defined scene-ready signal, feed actual rendered-frame timestamps, observe supported long-task entries, and sample `gl.info` calls/geometries/textures after rendering at warmup and after each of 20 documented edit/view cycles. Account for R3F callback ordering: a pre-render `useFrame` callback can read the previous frame's counters. Add observer cleanup, explicit activity transitions, and report export. Do not attach this module to ordinary production sessions. None of this adapter is implemented or measured here.

Record build commit, browser/version, device, physical-device status, actual renderer DPR, quality tier, fixture, viewport, thermal state and test duration. A production build may be served locally for measurement; a public deployment is not required. Development-server measurements have different overhead and must be labeled development evidence. Synthetic unit checks establish arithmetic/lifecycle behavior only; they do not establish FPS, GPU performance, first meaningful frame, memory growth or physical-phone quality.

## Remaining T08 acceptance work

Unimplemented: browser reproductions for collision/verdict agreement, current-versus-hypothetical rotation, view/step pose persistence, camera names and radio keyboard controls, interrupted drag, fallback, and aspect-aware plan framing. Real WebGL instrumentation, production before/after traces, physical-device testing, and final pass/fail matrix remain pending. These are T08 requirements, not waived or passed checks.
