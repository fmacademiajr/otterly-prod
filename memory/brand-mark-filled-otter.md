---
name: brand-mark-filled-otter
description: The Otterly brand mark is the filled cartoon otter, not the line-drawing glyph
metadata.type: project
---

The primary Otterly brand mark is the filled cartoon otter (warm brown #8A6A4A,
cream belly #E8D8BE, gold scarf #D4A24F, dot eyes with white shine). The
single-line floating otter (OtterGlyph) is a secondary decorative mark only.

The source-of-truth otter PNGs are at `docs/design-handoff/otter/` (12 poses).
The `frontend/assets/otter/` folder contains older placeholders. The default
pose for brand materials is `otter-sit-attentive.png`.

**Why:** The repo has both line-drawing and filled SVG+PNG assets. The
filled cartoon otter is what the app actually ships. The line-drawing glyph
is tab-bar decoration only.

**How to apply:** For any social or marketing asset, use
`docs/design-handoff/otter/otter-sit-attentive.png` as the input image.
Provide it to the generation model as-is. Do not describe the otter in prompts
beyond "place the provided otter image."
