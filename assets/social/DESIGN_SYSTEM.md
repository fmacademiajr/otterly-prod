# Otterly Design System — v2 Stitch Redesign

## 1. Brand Philosophy

Otterly is an ADHD-friendly task companion. Warm, non-punitive, quiet. The otter is a
line-drawing motif, not a cartoon character. No face features (eyes, nose, smile,
whiskers) on the canonical otter mark. The filled PNG otter variants used in-app have
gentle face details but the primary brand mark is the clean line drawing.

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

Usage pattern: Fraunces for headlines and display text (serif, warm). General Sans
for body and UI (clean sans-serif). DM Sans for numbers and metrics (geometric sans).

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

## 6. Ottery Motif — Line Drawings (Primary Brand Marks)

These are the canonical brand marks. Clean, single-line style. No face features on
the primary marks (OtterGlyph and LineOtter have minimal dot eyes and tiny smile but
the general rule is restraint). WaterWave and StreakRipple are supporting motifs.

### OtterGlyph

The primary brand mark. Floating otter on back, single-line style. Used in
navigation tabs, brand moments. Aspect ratio: 160x96 (5:3).

```
Body: M20 60 C 30 30, 130 30, 140 60 C 130 78, 30 78, 20 60 Z
Head: M138 58 C 148 52, 156 56, 154 66 C 152 74, 144 74, 140 68
Ear: M148 56 L 150 52
Paws (crossed on chest): M78 54 C 82 50, 88 50, 92 54 + M70 58 C 74 62, 96 62, 100 58
Tail: M22 62 C 12 66, 10 74, 18 78
```

Primary color: #5E8B82 (light), #7BA89F (dark). Stroke width: 1.5.

### LineOtter (full float, water context)

Used on Welcome and Crisis screens. Shows the otter floating on water with wave
lines beneath. ViewBox: 200x136. Full SVG paths in
`frontend/src/components/motifs.tsx:175-257`. Three subtle water waves under the
otter at increasing opacities (1.0, 0.75, 0.5).

### LineOtterPeek (just the head)

Used inline next to headings. ViewBox: 100x90. Head-only with ears, whiskers,
and small smile.

### WaterWave

Hairline calm-water wave for under cards/hero moments. ViewBox: 240x16.
Path: M0 8 Q 30 0, 60 8 T 120 8 T 180 8 T 240 8

### StreakRipple

Three concentric soft circles for streak visual. ViewBox: 140x140. Radii: 55, 38,
22 with decreasing opacity (0.25, 0.45, 0.7).

## 7. Otter Mascot — 16 PNG Poses

The filled illustration style otter used inside the app. Warmer, cartoonier than
the line marks. 16 variants in `frontend/assets/otter/`:

| File | When Used |
|---|---|
| otter-default.png | Default, sitting with scarf |
| otter-focus.png | Focus mode start |
| otter-focused.png | In focus session |
| otter-working.png | Working state |
| otter-working-bed.png | Working from bed |
| otter-celebrate.png | Task completion |
| otter-float.png | Rest/idle, floating on water |
| otter-float-awake.png | Awake floating |
| otter-crown.png | Founding Otter badge |
| otter-wave.png | Greeting / wave |
| otter-sleep.png | Idle/sleep |
| otter-peek.png | Peeking from edge |
| otter-sit-attentive.png | Onboarding (transparent bg) |
| otter-sit-calm.png | Onboarding (transparent bg) |
| otter-hands-raised.png | Onboarding (transparent bg) |
| otter-line.png | Falls back to LineOtter SVG |
| otter-line-peek.png | Falls back to LineOtterPeek SVG |

The filled otter uses warm brown (#8A6A4A) body, cream belly (#E8D8BE), gold
scarf (#D4A24F). Small dark eyes with white shine dots. Subtle smile. The scarf
is a defining accessory.

## 8. Atmosphere — Gradient Background

Time-of-day gradient system in `Atmosphere.tsx`. Four periods:

- **Morning** (5-12h): Warm light, top #C4D4C0, bottom #E8DCC8
- **Midday** (12-18h): Bright, top #B5D0D4, bottom #E0D8C8
- **Dusk** (18-21h): Golden, top #B8A8A0, bottom #D4C4A8
- **Night** (21-5h): Deep, top #14201D, bottom #1A2A24

Atmosphere includes a water horizon line at y=75% and a subtle vignette overlay.

## 9. Key Components

### ScreenHeader
Teal-washed band (#E7EFEA light / #1F2D29 dark) with a hand-drawn wavy divider
at bottom (BandWave component). 32px title in Fraunces SemiBold. Optional 12px
uppercase eyebrow in General Sans with 4px letter spacing. Used on You + Room
screens.

### OtterButton
Two variants: primary (filled #5E8B82) and ghost (border only). Pill shape
(borderRadius 9999). General Sans Medium, 16px. TouchableOpacity with haptic
feedback. Min height 48px.

### EnergyPill
Three-segment pill for energy level: low / medium / good. Each segment is a
touchable pill. Active segment has filled primary bg, inactive has light bg with
border.

### StreakStrip
7 concentric ring day markers using StreakRipple motif. Days shown as:
completed (solid primary), today (active ring), future (faint circle).
Non-punitive — no streak count, no flame emoji. Just quiet rings.

### IdleBreath
5.6-second slow breath cycle. Shows the otter floating with a subtle scale
animation (1.0 -> 1.04 -> 1.0). Eases in/out. After ~60s of inactivity, the
otter floats to sleep.

### Screen Layouts
- **Inbox**: WarmBg background, list of "thoughts" as cards with delete. Top has
  LineOtterPeek and greeting.
- **Room**: TealBand header with "Your Room" title. Scrollable card grid of
  activities/features.
- **You**: TealBand header with profile. Settings list below.
- **Next**: Focus mode screen with centered otter, timer, and task title.
- **Shrink/[id]**: Task detail with steps, timer, difficulty picker, banner upsells.
- **Paywall**: warmBg background, feature cards with WaterWave separator.
- **Crisis**: Warm onboarding-style screen, LineOtter with waves, calming copy.
- **Onboarding**: 6-screen flow (state.ts + screens/), fixed light palette.

### Tab Navigation
Bottom tab bar with 4 tabs: Waves (OtterGlyph icon), Room, You, Inbox.
Tab bar height: 64px + safe area inset. Uses the primary teal color for active tab.

## 10. Animations

No bounce, no spring. 150-400ms ease-out. Two primitives:
- FadeUp: FadeInDown with configurable delay (default 0) and duration (default 320ms)
- SoftFade: FadeIn with configurable delay (default 0) and duration (default 250ms)

## 11. Social Media Brand Image Specs

### Colors
- Brand primary: #5E8B82 (teal-green)
- Brand accent: #D4A24F (gold)
- Warm cream: #F5F1E8
- Dark bg: #14201D

### Elements that must appear
- OtterGlyph (line drawing, floating otter on back) — the primary brand mark
- Brand name "Otterly" in Fraunces SemiBold
- Tagline: "Your calm task companion" (or similar warm messaging)
- Optional: WaterWave motif as decorative element

### Elements that MUST NOT appear
- The filled cartoon PNG otter with brown fur — this is in-app only
- Face features on the primary mark (no eyes/nose/smile on the main logo)
- Flame emojis, streak counts, or gamification elements

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
