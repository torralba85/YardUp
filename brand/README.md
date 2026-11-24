# brand

## Overview

Brand asset generation and render scripts.

## Interface

- [`render_plate.py`](./render_plate.py) — `q`, `font`, `tracked`, `dline`, `drect`, `rot_text`, `Q`, `inside_lot`

## Invariants

None identified in the direct source.

## Side Effects

- [`render_plate.py`](./render_plate.py) — out.save writes the rendered plate to public/hero-cadastral-plate.png.

## Verification

Run `npm test` from the YardUp repository root.
