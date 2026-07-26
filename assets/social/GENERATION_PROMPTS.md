# Image Generation Prompts

For each step: provide `docs/design-handoff/otter/otter-sit-attentive.png` as the
input image. The model places that otter into the composition as-is. Do not
regenerate or reinterpret the otter. Prompts describe only the layout,
background, typography, and decorative elements around it.

---

## Step 1 — Light Profile Icon

Input: `otter-sit-attentive.png`
Output: 1024x1024 PNG

```
Place the provided otter image centered on a warm cream background
#F5F1E8. The otter keeps its original proportions, centered in the
frame. Do not alter the otter. No text. No decorative elements.
Output as 1024x1024 PNG.
```

For dark variant: use background #14201D.

---

## Step 2 — Light X Banner

Input: `otter-sit-attentive.png`
Output: 1500x500 PNG

```
Place the provided otter image on the left side, about 180px tall,
original proportions. Do not alter the otter. Background warm cream
#F5F1E8. To the right of the otter: "Otterly" in Fraunces SemiBold
serif font, color #18181B, 56px. Below the wordmark: "Start, Not
Alone." in General Sans Regular, color #52525B, 18px. Bottom edge:
a thin decorative wavy line in teal #C7D9CF spanning full width.
Plenty of negative space. No emojis. No drop shadows. No gradients.
Output as 1500x500.
```

For dark variant: background #14201D, text #F3F5F4, tagline #A8B3B0, wave line #2C3A36.

---

## Step 3 — Light LinkedIn Banner (1584x396)

Input: `otter-sit-attentive.png`
Output: 1584x396 PNG

```
Place the provided otter image on the left side, about 120px tall,
original proportions. Do not alter the otter. Background warm cream
#F5F1E8. To the right: "Otterly" in Fraunces SemiBold, #18181B,
40px. Below: "Start, Not Alone." in General Sans Regular, #52525B,
16px. Bottom edge: thin decorative wavy line in teal #C7D9CF. All
text and otter must fit within the center 1300px safe zone for
mobile crop. No emojis. No drop shadows. No gradients.
Output as 1584x396.
```

For dark variant: background #14201D, text #F3F5F4, tagline #A8B3B0, wave line #2C3A36.

---

## Step 3b — LinkedIn Company Cover (4200x700)

Input: `otter-sit-attentive.png`
Output: 4200x700 PNG. This is the full-width hero banner for a LinkedIn
company page. The visible area on desktop is roughly the center 2600px.
Keep all content within that safe zone.

```
Place the provided otter image at center-left of the safe zone, about
200px tall, original proportions. Do not alter the otter. Background:
warm cream #F5F1E8. To the right of the otter: "Otterly" in Fraunces
SemiBold serif font, color #18181B, 72px. Below the wordmark: "Start,
Not Alone." in General Sans Regular, color #52525B, 24px. At the
bottom edge of the full banner: a thin decorative wavy line in teal
#C7D9CF spanning the entire 4200px width. All content (otter and
text) must sit within the center 2600px to avoid cropping on desktop.
The left and right edges are decorative only. Plenty of negative
space. No emojis. No drop shadows. No gradients. No repeating
patterns. Output as 4200x700.
```

For dark variant: background #14201D, text #F3F5F4, tagline #A8B3B0, wave line #2C3A36.

---

## Step 4 — App Icon

Input: `otter-sit-attentive.png`
Output: 1024x1024 PNG

```
Place the provided otter image centered on a warm cream background
#F5F1E8. Scale the otter to fill about 70% of the frame, keeping
original proportions. Do not alter the otter. No text. No decorative
elements. Output as 1024x1024 PNG.
```

---

## Step 5 — Brand Scene (optional)

Input: `otter-sit-attentive.png`
Output: 1024x1024 PNG

```
Place the provided otter image centered in the upper half of a
square composition. Background warm cream #F5F1E8, softly gradated
to teal #E7EFEA at the bottom. Do not alter the otter. Below the
otter: "Otterly" in Fraunces SemiBold, #18181B, 48px. Below that:
"Start, Not Alone." in General Sans Regular, #52525B, 20px. Bottom
edge: thin decorative wavy line in teal #C7D9CF. Output as 1024x1024.
```

---

## How to run

1. Provide `docs/design-handoff/otter/otter-sit-attentive.png` as the input image.
2. Paste the prompt from one step. Set width and height to that step's dimensions.
3. Review. If the otter shape changed, the model must use the input as-is.
4. Repeat for each step.

Drop outputs into `assets/social/profile/` or `assets/social/banner/` with the filenames from README.md.
