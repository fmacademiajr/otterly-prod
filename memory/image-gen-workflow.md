---
name: image-gen-workflow
description: Generate social images by providing the otter PNG as input, not by describing it
metadata.type: feedback
---

When generating social media assets, provide the actual otter PNG
(`docs/design-handoff/otter/otter-sit-attentive.png`) as input to the
generation model. Prompts should only describe composition, layout,
background, typography, and decorative elements around the otter.
Do not describe the otter itself or ask the model to regenerate it.

The user uses Banana.dev (nano banana model) for generation with
custom credits.

**Why:** Describing the otter in prompts produces low-quality results
that don't match the app's actual art. Providing the real PNG as input
preserves the exact brand character.

**How to apply:** Every generation prompt should start with
"Place the provided otter image... Do not alter the otter."
