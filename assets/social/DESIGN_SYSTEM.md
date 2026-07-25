# Otterly Design System — v2 Stitch Redesign

## 1. Brand Philosophy

Otterly is an ADHD-friendly task companion. Warm, non-punitive, quiet. The brand
otter is a soft filled-illustration cartoon otter with warm brown fur, cream
belly, and a signature gold scarf. Small dot eyes, subtle smile. The otter is
the hero of the brand, not a secondary mark. A secondary single-line floating
otter exists as a decorative motif but is not the primary brand identifier.

## 2. Color Palette

### Light Mode

| Token | Hex | Usage |
|---|---|---|
| background | #FFFFFF | Main screen bg |
| warmBg | #F5F1E8 | Inbox, Paywall, warm hero screens |
| warmSurface | #FBF8F0 | Cards on warm bg |
| warmBorder | #E5DFCE | Borders on warm surface |
| surface | #FAFAFA | Card backgrounds |
| surfaceMuted | #F4F4F5 | Muted card bg |
| border | #E4E4E7 | Default borders |
| text | #18181B | Body text |
| textMuted | #52525B | Secondary text |
| textSubtle | #71717A | Tertiary/meta text |
| tealBand | #E7EFEA | Screen header band fill |
| tealBandBorder | #C7D9CF | Screen header wave stroke |
| primary | #5E8B82 | Primary buttons, links |
| primaryHover | #4E7670 | Button pressed state |
| primaryActive | #3F605B | Button active state |
| primarySurface | #EDF4F1 | Light primary bg |
| primarySurfaceStrong | #D6E4DD | Stronger primary bg |
| accent | #D4A24F | Accent gold (scarf, highlights) |
| accentSoft | #EBD6A6 | Soft accent bg |
| accentSurface | #F6E9C9 | Accent card bg |
| success | #3F7D58 | Success states |
| warning | #B58A3F | Warning states |
| danger | #A04848 | Destructive actions |
| onPrimary | #FFFFFF | Text on primary |
| onAccent | #FFFFFF | Text on accent |

### Dark Mode

| Token | Hex | Usage |
|---|---|---|
| background | #14201D | Main screen bg |
| warmBg | #1D2622 | Warm variant |
| warmSurface | #243029 | Warm card bg |
| warmBorder | #334037 | Warm border |
| surface | #1B2926 | Card bg |
| surfaceMuted | #20302C | Muted card |
| border | #2C3A36 | Borders |
| text | #F3F5F4 | Body text |
| textMuted | #A8B3B0 | Secondary text |
| textSubtle | #8F9B98 | Tertiary text |
| tealBand | #1F2D29 | Header band |
| tealBandBorder | #2C3A36 | Header wave stroke |
| primary | #7BA89F | Primary buttons |
| primaryHover | #8FB8B0 | Button hover |
| primaryActive | #8FB8B0 | Button active |
| primarySurface | #1F2D29 | Primary bg |
| primarySurfaceStrong | #2A3F39 | Stronger primary bg |
| accent | #E0B26A | Accent gold |
| accentSoft | #4A3E24 | Soft accent |
| accentSurface | #3A2F1C | Accent card |
| success | #5E9E78 | Success |
| warning | #B58A3F | Warning |
| danger | #B25656 | Danger |
| onPrimary | #14201D | Text on primary |
| onAccent | #14201D | Text on accent |

### Onboarding Palette (fixed light, never dark)

| Token | Hex | Usage |
|---|---|---|
| bg | #eef1ee | Onboarding outer bg |
| screen | #f7f5f0 | Onboarding card bg |
| screenWarm | #f1ede4 | Warm variant |
| ink | #39403b | Onboarding headings |
| inkSoft | #5f675f | Onboarding body (WCAG AA) |
| inkFaint | #9aa39b | Skip/Not-now only |
| water | #7fa8a0 | Water accent |
| waterSoft | #cfe0db | Soft water bg |
| line | #e2ddd2 | Card borders |
| card | #fffdf8 | Onboarding card surface |

## 3. Typography

| Role | Font | Weight | Font File |
|---|---|---|---|
| Display | Fraunces | Medium (500) | Fraunces_500Medium |
| Display bold | Fraunces | SemiBold (600) | Fraunces_600SemiBold |
| Body | General Sans | Regular | GeneralSans_Regular |
| Body medium | General Sans | Medium | GeneralSans_Medium |
| Body semibold | General Sans | Semibold | GeneralSans_Semibold |
| Numeric | DM Sans | Medium (500) | DMSans_500Medium |

Usage: Fraunces for headlines (serif, warm). General Sans for body and UI
(clean sans). DM Sans for numbers (geometric sans).

## 4. Spacing

| Token | Pixels |
|---|---|
| xs | 4 |
| sm | 8 |
| md | 12 |
| base | 16 |
| lg | 24 |
| xl | 32 |
| xxl | 48 |
| xxxl | 64 |

## 5. Border Radii

| Token | Pixels |
|---|---|
| sm | 4 |
| md | 8 |
| lg | 12 |
| xl | 20 |
| pill | 9999 |

## 6. Otter Mascot — Primary Brand Asset (Filled Illustration)

The brand otter is a soft filled-illustration cartoon otter. This is the primary
visual identifier for Otterly. It appears in 16 PNG poses in the app.

### Colors of the Otter

| Part | Color | Hex |
|---|---|---|
| Body / head fur | Warm brown | #8A6A4A |
| Ears (outer) | Dark brown | #5E4530 |
| Ears (inner) | Warm brown | #8A6A4A |
| Belly / muzzle | Cream | #E8D8BE |
| Scarf | Gold | #D4A24F |
| Scarf stripe / stroke | Darker gold | #B58A3F |
| Eyes / nose | Dark brown | #3B2E22 |
| Eye shine | White | #FFFFFF |
| Crown (Founding Otter) | Gold | #E0B26A |
| Crown stroke | Dark gold | #B58A3F |

### Visual Description of the Otter

Sitting posture. Round head with prominent round ears on each side (dark brown
outer, warm brown inner). White/cream muzzle (elliptical, centered lower face).
Two small dark brown dot eyes with a single white shine pixel each. Small dark
elliptical nose. Subtle curved smile (no teeth). Oval body with cream belly
patch. Two front paws crossed at the bottom. Signature gold scarf wrapped
around the neck, hanging to one side with a small stripe detail on the scarf.
No whiskers on the filled version. A gold crown variant exists for the
Founding Otter badge.

### 16 PNG Poses

All 15 PNGs live at `frontend/assets/otter/`. They use the flat filled style
described above:

| File | Pose | Context |
|---|---|---|
| otter-default.png | Sitting with scarf spread | Default, generic use |
| otter-focus.png | Attentive, leaning forward | Focus mode start |
| otter-focused.png | Deep concentration | During focus session |
| otter-working.png | Working at something | Active task state |
| otter-working-bed.png | Working from bed (laptop?) | Cozy work mode |
| otter-celebrate.png | Arms up, happy | Task completion |
| otter-float.png | Floating on back, eyes closed | Rest / idle |
| otter-float-awake.png | Floating on back, eyes open | Awake rest |
| otter-crown.png | Sitting with gold crown | Founding Otter badge |
| otter-wave.png | One paw up waving | Greeting |
| otter-sleep.png | Curled up sleeping | Long idle |
| otter-peek.png | Head only, peeking in | Inline decorative |
| otter-sit-attentive.png | Attentive sitting (transparent bg) | Onboarding |
| otter-sit-calm.png | Calm sitting (transparent bg) | Onboarding |
| otter-hands-raised.png | Both paws raised (transparent bg) | Onboarding |

## 7. Ottery Motif — Line Drawings (Secondary)

These are secondary decorative marks, not the primary brand identifier.

### OtterGlyph

Single-line floating otter on back. Used in navigation tabs, subtle brand
moments. Aspect ratio 160x96 (5:3). Color: #5E8B82 (light) / #7BA89F (dark).
Stroke width 1.5.

```
Body: M20 60 C 30 30, 130 30, 140 60 C 130 78, 30 78, 20 60 Z
Head: M138 58 C 148 52, 156 56, 154 66 C 152 74, 144 74, 140 68
Ear: M148 56 L 150 52
Paws: M78 54 C 82 50, 88 50, 92 54 + M70 58 C 74 62, 96 62, 100 58
Tail: M22 62 C 12 66, 10 74, 18 78
```

### LineOtter (full float on water)

Used on Welcome and Crisis screens. ViewBox 200x136. Three water wave lines
beneath at decreasing opacity (1.0, 0.75, 0.5).

### LineOtterPeek (head only)

Used inline next to headings. ViewBox 100x90. Includes whiskers (the only mark
that uses them).

### WaterWave

Hairline wave for under cards/hero moments. ViewBox 240x16.
Path: M0 8 Q 30 0, 60 8 T 120 8 T 180 8 T 240 8

### StreakRipple

Three concentric circles (radii 55, 38, 22) at decreasing opacity for streak
visuals. Non-gamified.

## 8. Atmosphere — Gradient Background

Time-of-day gradient system in `Atmosphere.tsx`. Four periods:

- Morning (5-12h): Top #C4D4C0, Bottom #E8DCC8
- Midday (12-18h): Top #B5D0D4, Bottom #E0D8C8
- Dusk (18-21h): Top #B8A8A0, Bottom #D4C4A8
- Night (21-5h): Top #14201D, Bottom #1A2A24

Includes a water horizon line at y=75% and subtle vignette overlay.

## 9. Key Components

### ScreenHeader
Teal band (#E7EFEA light / #1F2D29 dark) with hand-drawn wavy divider at bottom
(BandWave component). 32px title in Fraunces SemiBold. Optional 12px uppercase
eyebrow in General Sans, 4px letter spacing.

### OtterButton
Two variants: primary (filled #5E8B82) and ghost (border only). Pill shape
(borderRadius 9999). General Sans Medium, 16px. Min height 48px.

### EnergyPill
Three-segment pill: low / medium / good. Active segment filled primary bg,
inactive has light bg with border.

### StreakStrip
7 concentric ring day markers. Completed: solid primary. Today: active ring.
Future: faint circle. No streak count. No flame emoji.

### IdleBreath
5.6s slow breath cycle. Otter scales 1.0 -> 1.04 -> 1.0 with ease-in-out.

### Tab Navigation
4 tabs: Waves (OtterGlyph icon), Room, You, Inbox. Tab bar height 64px +
safe area inset. Active tab uses primary teal color.

## 10. Animations

No bounce, no spring. 150-400ms ease-out. Two primitives:
- FadeUp: FadeInDown (default 320ms)
- SoftFade: FadeIn (default 250ms)

## 11. Social Media Brand Image Specs

### Colors
- Otter fur: #8A6A4A (warm brown)
- Otter belly/muzzle: #E8D8BE (cream)
- Scarf: #D4A24F (gold)
- Brand primary: #5E8B82 (teal-green)
- Background (light): #F5F1E8 (warm cream)
- Background (dark): #14201D (deep teal)
- Text (light): #18181B
- Text (dark): #F3F5F4

### Elements that must appear
- The filled cartoon otter (warm brown, cream belly, gold scarf, dot eyes,
  subtle smile) — this is the primary brand mark
- Brand name "Otterly" in Fraunces SemiBold serif
- Tagline: "your calm task companion" (or similar warm messaging)
- Gold/or teal accent elements

### Elements that must NOT appear
- Flame emojis, streak counts, or gamification elements
- Aggressive or loud design elements

### Platform Requirements

| Platform | Asset | Dimensions | Format |
|---|---|---|---|
| X (Twitter) | Profile | 1024x1024 | PNG |
| X (Twitter) | Banner | 1500x500 | PNG |
| LinkedIn | Profile | 400x400 | PNG |
| LinkedIn | Banner | 1584x396 | PNG |
| GitHub | Profile | 1024x1024 | PNG |
| App Store | Icon | 1024x1024 | PNG |
| Web | Favicon | 32x32 | ICO/PNG |
