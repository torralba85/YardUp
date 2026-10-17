# HANDOFF — T07 Architectural and Material Implementation

## Summary of Owned Deliverables
- `lib/adu-mesh-data.ts`: Pure position/normal/UV generator. Reuses T01 `buildAduHeightModel` without duplicating height math. Emits exact shed underside plane `height + 1.05 - z*tan(angle) - 0.25/cos(angle)` meeting walls with zero gap or rear protrusion. Emits true gable roof with two pitched quads and closed pediments. Maps UVs in world feet (4x4-ft repeat). Emits scalable door (3x7ft), window (4x3.5ft), and trim.
- `lib/adu-materials.ts`: Deterministic 512px procedural baseColor, normal, and roughness maps for cedar, lap, stucco, and board using `@/lib/feasibility` `finishColors`. Three.js materials are created and disposed per mount.
- `components/studio/AduArchitecture.tsx`: Extracted component with no pose ownership (parent group positions/rotates). Uses declarative R3F `<bufferGeometry>` and `<bufferAttribute>` children. Adheres to StrictMode and invalidates demand rendering.
- `lib/scene-lighting.ts`: Preserves finite sun position clamp, fixes 13.5 -> "1:30 PM" and 17.5 -> "5:30 PM", exports Neutral Inspection and Golden Hour presets.
- Tests & Docs: `lib/adu-mesh-data.test.ts`, `lib/adu-materials.test.ts`, `lib/scene-lighting.test.ts`, `docs/testing/studio-material-assets.md`.

## Test Suites Prepared for Codex Execution
1. `lib/adu-mesh-data.test.ts`: Validates roof max bounds against T01 `totalHeight` across gable, shed, and flat; confirms shed wall vertices meet underside plane; verifies gable ridge and pitched quads; confirms world-feet UV scaling without stretch.
2. `lib/adu-materials.test.ts`: Verifies 512px dimensions, byte-for-byte determinism, normalized normal vectors, grayscale roughness, and clean disposal.
3. `lib/scene-lighting.test.ts`: Verifies sun position clamp, 1:30 PM/5:30 PM formatting, and preset exports.

## Remaining Integration Limitations for Codex
- Integration into `ParcelScene.tsx` belongs to Codex. `AduArchitecture` can be placed inside the existing parent group at the ADU pose.
- Preset toggle controls in the Feasibility Studio UI belong to Codex.
