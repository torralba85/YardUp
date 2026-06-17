# Hero Concept — Exploded Feasibility Layers

## Concept

A highly polished, modern ADU model slowly auto-rotates in a void or on a minimal pedestal. The hero should feel premium, technical, and immediately understandable: LotFoundry is not just showing a building, it is revealing the feasibility logic underneath it.

## Core Interaction

As the user moves their mouse over the canvas, the model reacts by separating into an exploded view along the Y-axis.

- The roof lifts upward.
- The walls separate from the structural frame.
- The foundation drops downward.
- Each layer eases smoothly from the assembled state to the exploded state.
- When the pointer leaves the canvas, the model returns to its complete assembled form.

## Feasibility Layers

Each layer maps to a step of the ADU feasibility process:

1. **Zoning regulations** — represented by a grid below the structure.
2. **Structural engineering** — represented by exposed framing and load paths.
3. **Finished value** — represented by the polished exterior shell and roof.

## Hover Highlighting

Hovering over a specific layer should highlight that layer with a neon edge treatment while subtly dimming non-selected layers.

Suggested behavior:

- Zoning grid: glow outline around the regulatory footprint.
- Framing: neon edge pass around studs, beams, and structural frame.
- Finished exterior: soft rim light around siding, windows, and roof.

## Motion Direction

- Use Y-axis separation for the exploded state.
- Keep the model centered so the interaction feels controlled, not chaotic.
- Auto-rotation should slow or pause while the pointer is over a selectable layer.
- Movement should feel precise and engineered, not playful or bouncy.

## Why It Works

This hero breaks down the complex, multi-layered feasibility process into a visually digestible, highly interactive technical display. It gives investors and homeowners an immediate mental model for what LotFoundry does: it decomposes ADU feasibility into understandable layers and recomposes those layers into a buildable opportunity.

## Success Criteria

- The hero communicates zoning, structure, and finished value without reading body copy.
- Mouse movement clearly controls the exploded state.
- Layer hover states are obvious and premium.
- The assembled model remains beautiful enough to work as the default hero visual.
- The interaction performs smoothly on modern desktop browsers.
- Mobile gets a simplified tap/auto-cycle fallback rather than relying on hover.
