# LotFoundry — Before the blueprints

## Current deliverable

28.8-second architectural / product film, 1920 × 1080, 30 fps. New composition: `LotFoundryPlayFilm`. This is a full replacement creative direction for the earlier black slide-based promo. Original compositions and exports are preserved.

**Final narrated edit:** `lotfoundry-play-film-brielle.mp4`. Andrew selected Brielle. The original 3.1-credit script was rejected for insufficient balance. A direct balance check showed 2 credits available. The script was tightened, quoted at exactly 2 credits, and successfully generated on September 23 with Seed Audio 1.0. Job: `ac52cd68-c710-4f40-a582-d97e4deee4b9`. Voice ID: `a00bc7f3-0236-5e76-ac65-90137ce0f5a4`, preset. Original recording: stereo 48 kHz WAV, 27.50 seconds, retained as `brielle-original.wav`; the mix copy applies a transparent 1.1 dB gain reduction. The 42.8-second music-only picture preview is retained as an earlier draft.

The final script and scene timing are in `film.json`; timed captions are in `captions.json`. Scene changes follow the recorded sentence breaks. Speech transcription with a local Whisper model confirms every sentence of the submitted script, including “Lot Foundry” and “3D studio.” Silence detection and the transcript were used for caption timing. The final has burned-in captions, plus an SRT sidecar for reuse. Narration is synthesized, not a human recording.

## Editorial structure

| Time | Shot |
| --- | --- |
| 0–2.8 | Original exterior concept photograph and opening title |
| 2.8–5.55 | Close view of the actual Find screen |
| 5.55–8.05 | Actual rental estimate and estimate disclaimer |
| 8.05–12.75 | Genuine 3D camera orbit and app footprint choices |
| 12.75–20.05 | Actual feasibility summary, then a clean cut to pre-permit checks |
| 20.05–25.9 | Actual app screens and closing thought |
| 25.9–28.8 | Original interior concept photograph and brand close |

The app is present from 2.8–25.9 seconds (23.1 seconds / 80.2%). Real app content appears before 10 seconds. This is an editorial interpretation of [Google Play preview-video guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB), not a claim of Play approval. There is no YouTube upload or Play listing change.

## Actual app media

Captured from the public Seattle demo at `https://lotfoundry.net/studio`, September 22–23, 2026. 540 × 960 CSS viewport; final stills captured at device scale 3 are 1620 × 2880. Composition crops use a normalized 1080 × 1920 coordinate basis. The orbit was captured at device scale 2. No app values or DOM styling were replaced. Capture script: `scripts/capture-play-film.mjs` (use `--stills-only` to refresh stills).

- `find.png`, `earn.png`, `shape.png`, `check.png`: fresh app captures.
- `studio-orbit.mp4`: 240 native-resolution screenshot frames of a real mouse-driven camera orbit, assembled at 30 fps; the final uses its first 4.7 seconds.
- Original orbit PNG sequence is in `artifacts/play-film-2026-09-22/orbit-frames/` outside the worktree.
- Demo amounts: $2,050/month, $231K–$289K estimated build range, 15.1-year payback. The visible app explains that demo figures are curated, not market sourced.
- Photographic images are labeled “Concept imagery”; they are not represented as app-generated 3D output or a real completed project.

## Music and required publication credit

“Cylinder Five” by Chris Zabriskie, from *Cylinders* (2014).

Licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

Artist: https://chriszabriskie.com/

Album: https://chriszabriskie.com/cylinders/

License confirmation: https://chriszabriskie.com/use/

Source: https://audio.chriszabriskie.com/cylinders/cylinders-05.m4a

Edits: excerpt from the beginning, fades, gain reduction, synchronization to the film. The preview includes an end credit. Include the full attribution above in the YouTube description when publishing.

## Original concept imagery

Created with the built-in OpenAI image generation tool. Both images are 1672 × 941 pixels; the request for 4K was not fulfilled by the tool, so do not claim native 4K image assets. Originals are retained under `C:/Users/Andrew/.codex/generated_images/01a0cc39-754a-7682-ac0e-d82eec4c0bc6/`. Copies are in `public/play-film`.

### `backyard-editorial.png`

Original: `exec-f486184b-325e-4b11-8765-2454141c8177.png`

Prompt:

> Create one original editorial architectural photograph for a premium backyard-home planning app film. Landscape 16:9, 3840 x 2160 if supported. A believable modest Pacific Northwest residential backyard on a bright overcast morning, with a carefully designed single-story approximately 600-square-foot cedar-clad accessory dwelling at the far right of the frame, shallow pitched dark standing-seam roof, one simple broad glass sliding door, a small concrete terrace, a weathered timber fence, natural imperfect grass and ferns, the edge of an older craftsman main home visible at far left. The yard has authentic daily-life texture: scattered leaves, slightly damp concrete, unpolished wood grain. Compose as a real commissioned photograph in an architecture magazine: camera at standing eye height, 35mm lens, straight verticals, realistic scale, restrained colors, soft directional natural light, gentle contrast, neutral daylight white balance, no exaggerated golden glow. The cottage occupies the right third; left half is calm yard with usable lower-contrast negative space for typography added later. An understated burnt-orange garden chair is the only vivid accent. Completely photographic optical detail, subtle sensor grain, no CGI aesthetic, no waxy materials, no impossible architecture, no oversaturation, no bokeh blobs, no people, no signage, no text, no logos, no watermark. This is clearly authored concept imagery, not a claimed photograph of a specific real address.

### `interior-editorial.png`

Original: `exec-cc1e9d47-be18-4a2b-a958-4903b74595f6.png`. Exterior image supplied as the visual reference.

Prompt:

> Create a second original editorial architectural photograph, landscape 16:9. The provided image is a style and building reference for the SAME modest cedar backyard cottage; this shot is from just inside its broad black-framed sliding door, looking across a believable compact living/dining area toward a small tidy kitchen. Approximately 600-square-foot one-bedroom home, human-scale and attainable, not a luxury villa. Warm off-white plaster, oak floor with small honest wear, linen two-seat sofa, simple light wood table, one ceramic mug, one small terracotta bowl, a leafy plant. Small kitchen with cream cabinets and muted olive tile, ordinary compact appliances. Soft window daylight from the right, natural photographic tonal range, honest material detail, slight film grain, restrained architectural magazine color grade, carefully composed 35mm real estate editorial photograph with straight verticals. Crop the sofa partially in foreground for depth; maintain calm useful open wall space at upper-left for later typography. It should feel quietly lived in, not a perfectly sterile AI showroom. No people, no writing or labels, no logos, no watermark, no distorted furnishings, no extra windows, no ultra-wide distortion, no glossy CGI look, no excessive sunbeams.

## Reproduce

From `.worktrees/play-promo-video-20260922`:

```powershell
npx.cmd remotion studio --no-open
npx.cmd remotion render remotion/index.ts LotFoundryPlayFilm 'C:\Users\Andrew\LotFoundry\artifacts\play-film-2026-09-22\lotfoundry-play-film-brielle.mp4' --codec=h264 --crf=16 --overwrite --concurrency=4
```

All video source changes remain local and uncommitted. No application source or production configuration was changed.


## Export review ? September 23

- Final container duration: 28.84 seconds (28.8-second video timeline).
- 1920 ? 1080, 30 fps, H.264 High; stereo AAC, 48 kHz, approximately 317 kb/s.
- File size: 12,278,428 bytes.
- Full FFmpeg decode completed with exit code 0.
- Final mix: -16.40 LUFS integrated, -2.51 dBTP, 4.10 LU loudness range.
- Nine representative final frames inspected for text clipping, caption collisions, and scene content.
- Local speech transcription matched the submitted narration; timing was cross-checked with pauses in the recording.
- This review covers the rendered media. It is not a claim of subjective human approval or Play listing approval.
