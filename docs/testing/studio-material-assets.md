# Studio Material Assets Specification

## Overview
Procedural architectural material pipeline for the LotFoundry Feasibility Studio 3D viewport. Textures are synthesized entirely in memory without external asset downloads or binary blobs.

## Provenance & Specifications
- **Authorship**: Deterministic procedural synthesis in `lib/adu-materials.ts`.
- **Resolution**: 512x512 pixels across baseColor, normal, and roughness maps.
- **Storage & Lifecycle**: Pixel buffers are memoized on first access; `THREE.DataTexture` objects are instantiated per component mount and disposed on unmount in `useEffect`.
- **Repeat Scale**: 4x4-foot repeat in world feet (`TEXTURE_TILE_SIZE_FT = 4.0`). UV mapping derives from world-space wall coordinates, preventing stretching on long spans.

## Finish Details
1. **Cedar (`#a66a3c`)**: 6-inch horizontal planks (8 per tile), recessed seams, directional wood grain variation, semi-matte roughness.
2. **Lap (`#c8c4b8`)**: Horizontal clapboard with angled directional normal gradient and lower shadow lip.
3. **Stucco (`#d8d2c4`)**: Isotropic aggregate multi-octave noise without directional seams.
4. **Board & Batten (`#2f3437`)**: Vertical 1-ft boards (4 per tile) with 16px raised battens and sharp edge bevels.

## Technical Encoding
- **BaseColor**: RGB finish tones modulated by procedural shading, Alpha = 255. `THREE.SRGBColorSpace`.
- **Normal**: Periodic gradient derivatives normalized to unit length and packed to $[0, 255]$. `THREE.NoColorSpace`.
- **Roughness**: Grayscale RGB ($R=G=B$) with Alpha = 255 (Three.js standard reads G channel). `THREE.NoColorSpace`.

## Openings and Casing
Dimensions in feet, from `lib/adu-mesh-data.ts`:

| Element | Nominal size | Shrinks when |
| --- | --- | --- |
| Door panel | 3.0 W x 7.0 H | width < 8.6 ft, or wall head height < 7.5 ft |
| Window glazing | 4.0 W x 3.5 H | width < 10 ft, or wall head height < 7 ft |
| Casing | 0.2 wide border | never |
| Glazing mullion | 0.25 wide | never |

Depth ordering off the wall face: glazing +0.008 ft, door panel +0.014 ft, casing
+0.024 ft. Casing is emitted as border quads around each opening (head and jambs
for the door, all four sides for the window) rather than as a filled rectangle,
so it frames the opening instead of hiding it. The mullion is a fixed-width
element, so it stays a constant-size reference cue as the ADU is resized.

## Glazing
Glazing is a partially transparent standard material (opacity 0.72, roughness
0.18, metalness 0.25), not the opaque metallic panel the audit flagged. The scene
carries no environment map, so its specular response comes from the scene lights
alone. This is illustrative, not a measured glazing specification.

## Licensing and provenance
Every map here is synthesized at runtime from the `finishColors` values already
in `lib/feasibility.ts`. There are no imported, downloaded, or third-party assets
in this pipeline, and therefore no external licenses to carry. If a photographed
or purchased texture is added later, its license and source belong in this file
alongside the asset.

## Memory
Each finish holds three 512 x 512 RGBA CPU buffers, about 3 MB per finish and
about 12 MB if every finish is visited in one session. The cache is keyed by
finish and never evicted. `THREE.DataTexture` objects are per-mount and disposed;
the CPU buffers are not.

## Not measured
No before/after frame-time or GPU-memory comparison has been recorded for this
work. Quality-tier differences and physical-device timings belong to T06/T08 and
remain unmeasured here. Do not cite this document as performance evidence.
