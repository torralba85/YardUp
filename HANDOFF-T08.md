# T08 Wave 1 handoff

Baseline `56293db`; branch `studio/t08-harness-20260904`. This is a partial T08 foundation, not full acceptance.

Gemini Pro supplied the baseline tests and collector design through the authenticated browser after Google rejected the installed CLI with `UNSUPPORTED_CLIENT`. Codex rejected dummy/skipped checks and corrected the final draft's fixture typing, timing/lifecycle bugs, invalid-input handling, storage bounds, mutation isolation and tests.

Changed files:

- `lib/studio-baseline-regressions.test.ts`: both 620-sf shapes and equal-area shape distinction as expected failures; explicit old impossible-bounds baseline.
- `lib/studio-measurement.ts`: inert, opt-in collector for readiness, nearest-rank p50/p95 frame intervals, long tasks, and bounded draw/geometry/texture cycle snapshots. Warmup and explicit idle transitions are separate from active stalls. Missing evidence remains null.
- `lib/studio-measurement.test.ts`: deterministic synthetic-clock tests, including 20-cycle snapshots, stopped/reset states and invalid inputs.
- `docs/testing/studio-t08-baseline.md`: commands, precise instrumentation integration notes and outstanding requirements.

Validation: focused Vitest completed with **8 passed and 3 expected failures across 2 files**. The expected failures prove existing persistence defects, not completed fixes. Full `tsc --noEmit` and focused ESLint completed successfully; zero warnings.

No renderer/Studio adapter is applied, and no application behavior is changed. Neither shared orchestrator was edited. No commit, push, merge or deployment.

Still missing: executable DOM/accessibility and real WebGL reproductions, runtime instrumentation hookup, production baseline and repeated-cycle traces, physical-phone evidence, and final cross-device verification. These remain T08 obligations before its acceptance gate. T06 must not treat this synthetic collector validation as production performance evidence.

Delegation transcript: https://gemini.google.com/app/f945436ecd9c2435

Coordinator status: `C:/Users/Andrew/LotFoundry/artifacts/studio-delegation-2026-09-04/STATUS.md`.
