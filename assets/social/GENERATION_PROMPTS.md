# Image Generation Prompts — One Asset Per Step

Use these prompts one at a time with Stable Diffusion, Midjourney, DALL-E 3,
or Ideogram. Feed DESIGN_SYSTEM.md to the tool first, then paste one prompt
per generation.

The reference otter files are at `frontend/assets/otter/`. Use
`otter-default.png` as the style reference for the filled cartoon look.

---

## Step 1 — Light Profile Icon (1024x1024)

Purpose: Brand icon for light-mode social profiles (X, GitHub, LinkedIn).

```
A soft filled-illustration cartoon otter sitting calmly. Warm brown fur
(#8A6A4A), cream belly and muzzle (#E8D8BE), small dark dot eyes with
white shine, tiny dark oval nose, subtle curved smile. Round ears with
dark brown outer and warm brown inner. A gold scarf (#D4A24F) wrapped
around the neck with a small stripe detail. Oval body with crossed paws
at the bottom. Flat filled illustration style, no thick outlines, no
shading. Centered on a warm cream background (#F5F1E8). Square format
1024x1024. No text. No emojis. No gamification. The otter should look
calm, warm, and approachable.
```

Reference: `frontend/assets/otter/otter-default.png`

---

## Step 2 — Dark Profile Icon (1024x1024)

Purpose: Brand icon for dark-mode social profiles.

```
A soft filled-illustration cartoon otter sitting calmly. Warm brown fur
(#8A6A4A), cream belly and muzzle (#E8D8BE), small dark dot eyes with
white shine, tiny dark oval nose, subtle curved smile. Round ears with
dark brown outer and warm brown inner. A gold scarf (#D4A24F) wrapped
around the neck with a small stripe detail. Oval body with crossed paws
at the bottom. Flat filled illustration style, no thick outlines, no
shading. Centered on a dark teal background (#14201D). Square format
1024x1024. No text. No emojis.
```

---

## Step 3 — Light X Banner (1500x500)

Purpose: X/Twitter profile header (light mode).

```
Wide banner 1500x500. Left side: a small filled cartoon otter (warm brown
fur #8A6A4A, cream belly, gold scarf #D4A24F) sitting calmly, about 180px
tall. To its right: "Otterly" in Fraunces SemiBold serif font, dark text
#18181B, approximately 56px. Below the wordmark: "your calm task companion"
in General Sans Regular, muted text #52525B, approximately 18px.
Background: warm cream #F5F1E8. Bottom edge: a thin decorative wavy line
in teal #C7D9CF spanning the full width. Plenty of negative space. Minimal,
warm, premium feel. No emojis, no drop shadows, no gradients.
```

---

## Step 4 — Dark X Banner (1500x500)

Purpose: X/Twitter profile header (dark mode).

```
Wide banner 1500x500. Left side: a small filled cartoon otter (warm brown
fur #8A6A4A, cream belly, gold scarf #D4A24F) sitting calmly, about 180px
tall. To its right: "Otterly" in Fraunces SemiBold serif font, light text
#F3F5F4, approximately 56px. Below the wordmark: "your calm task companion"
in General Sans Regular, muted text #A8B3B0, approximately 18px.
Background: dark teal #14201D. Bottom edge: a thin decorative wavy line
in #2C3A36 spanning the full width. Plenty of negative space. Minimal,
warm, premium feel. No emojis, no drop shadows, no gradients.
```

---

## Step 5 — Light LinkedIn Banner (1584x396)

Purpose: LinkedIn company page banner (light mode). Text must fit within
the center ~1300px safe zone for mobile crop.

```
Wide banner 1584x396. Left side: a small filled cartoon otter (warm brown
fur #8A6A4A, cream belly, gold scarf #D4A24F) sitting calmly. To its right:
"Otterly" in Fraunces SemiBold serif font, dark text #18181B, approximately
40px. Below: "your calm task companion" in General Sans Regular, muted text
#52525B, approximately 16px. Background: warm cream #F5F1E8. Bottom edge:
a thin decorative wavy line in teal #C7D9CF. Text and otter fit within the
center 1300px. Minimal, professional, warm. No emojis, no drop shadows,
no gradients.
```

---

## Step 6 — Dark LinkedIn Banner (1584x396)

Purpose: LinkedIn company page banner (dark mode).

```
Wide banner 1584x396. Left side: a small filled cartoon otter (warm brown
fur #8A6A4A, cream belly, gold scarf #D4A24F) sitting calmly. To its right:
"Otterly" in Fraunces SemiBold serif font, light text #F3F5F4, approximately
40px. Below: "your calm task companion" in General Sans Regular, muted text
#A8B3B0, approximately 16px. Background: dark teal #14201D. Bottom edge:
a thin decorative wavy line in #2C3A36. Text and otter fit within the
center 1300px. Minimal, professional, warm. No emojis, no drop shadows,
no gradients.
```

---

## Step 7 — App Icon (1024x1024)

Purpose: App Store / Play Store icon.

```
A soft filled-illustration cartoon otter sitting calmly on a warm cream
background #F5F1E8. Warm brown fur #8A6A4A, cream belly and muzzle
#E8D8BE, small dark dot eyes with white shine, subtle smile. Gold scarf
#D4A24F around the neck. The otter fills about 70% of the frame. Flat
filled illustration style, no thick outlines, no shading. Square 1024x1024.
No text. No emojis. The otter should look warm, calm, and approachable
at small sizes.
```

---

## Step 8 — Brand Scene (1024x1024, optional)

Purpose: Website hero section, social post template, launch announcements.

```
Square brand scene 1024x1024. Warm cream background #F5F1E8 transitioning
to soft teal #E7EFEA at the bottom. Center: a filled illustration cartoon
otter sitting calmly (warm brown fur #8A6A4A, cream belly, gold scarf
#D4A24F, dot eyes, subtle smile). Below the otter: "Otterly" in Fraunces
SemiBold serif, dark text #18181B, approximately 48px. Below that:
"your calm task companion" in General Sans Regular, muted #52525B,
approximately 20px. Bottom edge: a thin decorative wavy line in teal
#C7D9CF. Non-gamified, calm, warm companion feel.
```

---

## How to Use

1. Feed DESIGN_SYSTEM.md to the generation tool as context.
2. Open `frontend/assets/otter/otter-default.png` as the visual style reference.
3. Paste Step 1 prompt. Review the output. Regenerate if the otter style does
   not match (wrong shape, wrong colors, wrong scarf).
4. Once Step 1 is approved, move to Step 2. Repeat.
5. After all prompts are done, drop files into the folders listed in README.md.
