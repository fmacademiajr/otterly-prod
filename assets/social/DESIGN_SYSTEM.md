# Otterly Design System

## 1. What Otterly is

Otterly is a calm task-starter for people with ADHD and chronic overwhelm. Philippines-first, iOS launch. Positioning line: "Start, Not Alone." Subtitle: "Calm ADHD task starter."

The thesis: task lists are the disease, not the cure. The home screen shows one thing, never a list, never a badge.

## 2. Product features (from the code, not invented)

The app ships these features. Nothing else:

- Task Shrinker. Take one hard task, get 3 to 10 tiny physical steps. Physical verbs only.
- The one-thing home screen (Next tab). Shows a single next action, never a growing list, never a badge.
- The Room (Sit-With-Me). Text-based body-double. A quiet otter sits with you while you work.
- Braindump. Dump a paragraph into the Inbox, get a short list back.
- Soft Streak (You tab). Seven quiet rings for days you showed up. No fire, no shame.
- Energy Pill. Low / medium / good. On low the app picks smaller steps.
- Voice capture. Turns spoken tasks into text. Mic button beside the input.

Free forever. Deep Shrink is a one-time purchase or small monthly. Vouchers for anyone who cannot pay.

## 3. Screen names and labels (from actual app code)

### Next tab (one-thing home)
- Greeting: "Hello" or "Hello, {name}"
- Energy question: "How's your energy right now?"
- Low energy hint: "I'll keep your next step tiny."
- Medium energy hint: "I'll pick a small step."
- Good energy hint: "I'll give you a little more."
- Task card eyebrow: "DO THIS NEXT"
- Task card shows: step text, ~{n} min pill, parent task, reason text
- Primary button: "Start" (when step exists) / "Add something" (when empty)
- Soft exits: "Not this one. Pick another", "I'm too tired for this", "Skip for now"
- Empty state: "What's on your mind?" / "Add one thing you've been avoiding." / "We'll shrink it together."
- Loading: "Picking one small thing..."
- Error: "Otterly couldn't reach the server. Try again in a moment."

### Inbox tab
- Header: "Add anything you're avoiding"
- Input label: Mic and text. Quick add or dump mode.
- Primary button: "Braindump"
- List: Tasks with delete. Capped at 7 items.
- Soft exits: Not this — pick another, Come back later.

### Room tab (Sit-With-Me)
- Chat-style interface, low-stim. Message sparse.
- Greeting: Fraunces warm welcome.

### You tab
- ScreenHeader with "You" title and BandWave
- StreakStrip: 7 concentric ring day markers
- Settings: Name, Reminder time, Theme toggle (Light/Dark/System), Sign in, Sign out
- Terms and privacy links

### Onboarding (7 screens, exact names from flow spec)
- S1 Arrival: "Can't start? You're not broken." / "Stress takes your planning brain offline. Otterly holds the plan for you." / Button: "Okay"
- S2 The breath: "One breath first." / "Ten seconds. Long, slow exhale." / Skip label: "Skip"
- S3 One thing in: "What's the one thing you can't start?" / "Type it or say it. Your words are enough." / Button: "Okay"
- S4 The shrink: "The first tiny step, in their context." / "I'm holding the rest. You only ever see one thing." / Button: "Okay"
- S5 Sit with me: "I'll sit with you while you do it." / "No timer. No watching. Tap Done whenever you get back." / Button: "Done" / Soft exit: "Not now"
- S6 The win: "That counts." / "You started. That was the hard part." / Button: "Okay" / Not now variant: "Still here. That counts." / "The step will wait."
- S7 How Otterly behaves: "No lists. No badges. No nagging." / "Want me to check in gently sometimes? Either answer is right." / Two buttons: "Check in gently" and "Stay quiet"

### Crisis screen
- A calming screen shown when the user signals crisis.

## 4. Color palette

### Light mode (from design_guidelines.json + tokens.ts)

| Token | Hex |
|---|---|
| background | #FFFFFF |
| surface | #FAFAFA |
| surfaceMuted | #F4F4F5 |
| border | #E4E4E7 |
| text | #18181B |
| textMuted | #52525B |
| textSubtle | #71717A |
| primary | #5E8B82 |
| primaryHover | #4E7670 |
| primaryActive | #3F605B |
| primarySurface | #EDF4F1 |
| primarySurfaceStrong | #D6E4DD |
| accent | #D4A24F |
| accentSoft | #EBD6A6 |
| accentSurface | #F6E9C9 |
| warmBg | #F5F1E8 |
| warmSurface | #FBF8F0 |
| warmBorder | #E5DFCE |
| tealBand | #E7EFEA |
| tealBandBorder | #C7D9CF |
| success | #3F7D58 |
| warning | #B58A3F |
| danger | #A04848 |
| onPrimary | #FFFFFF |
| onAccent | #FFFFFF |
| splashBg | #F7F3EA |

### Dark mode (from design_guidelines.json + tokens.ts)

| Token | Hex |
|---|---|
| background | #14201D |
| surface | #1B2926 |
| surfaceMuted | #20302C |
| border | #2C3A36 |
| text | #F3F5F4 |
| textMuted | #A8B3B0 |
| textSubtle | #8F9B98 |
| primary | #7BA89F |
| primaryHover | #8FB8B0 |
| primaryActive | #8FB8B0 |
| primarySurface | #1F2D29 |
| primarySurfaceStrong | #2A3F39 |
| accent | #E0B26A |
| accentSoft | #4A3E24 |
| accentSurface | #3A2F1C |
| warmBg | #1D2622 |
| warmSurface | #243029 |
| warmBorder | #334037 |
| tealBand | #1F2D29 |
| tealBandBorder | #2C3A36 |
| success | #5E9E78 |
| warning | #B58A3F |
| danger | #B25656 |
| onPrimary | #14201D |
| onAccent | #14201D |

### Onboarding palette (fixed light, never dark, from design_guidelines.json)

| Token | Hex |
|---|---|
| bg | #eef1ee |
| screen | #f7f5f0 |
| screenWarm | #f1ede4 |
| ink | #39403b |
| inkSoft | #5f675f |
| inkFaint | #9aa39b |
| water | #7fa8a0 |
| waterSoft | #cfe0db |
| line | #e2ddd2 |
| card | #fffdf8 |

## 5. Typography

From design_guidelines.json:

| Style | Font | Weight | Size | Line Height |
|---|---|---|---|---|
| h1 (Fraunces display) | Fraunces | SemiBold | 32 | 40 |
| h2 | Fraunces | SemiBold | 24 | 32 |
| h3 | General Sans | Semibold (600) | 18 | 24 |
| body | General Sans | Regular (400) | 16 | 24 |
| bodyMuted | General Sans | Regular (400) | 14 | 20 |
| timer | DM Sans | Medium | 56 | tabular-nums |
| button | General Sans | Semibold (600) | 16 | |

Font files loaded: Fraunces_500Medium, Fraunces_600SemiBold, GeneralSans_Regular, GeneralSans_Medium, GeneralSans_Semibold, DMSans_500Medium.

Rules: Fraunces for warm/emotional moments only. DM Sans exclusively for numbers. No Inter, Roboto, Poppins, or system-ui.

## 6. Spacing

From design_guidelines.json and tokens.ts:

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

## 7. Radii

| Token | Pixels |
|---|---|
| sm | 4 |
| md | 8 |
| lg | 12 |
| xl | 20 |
| pill | 9999 |

## 8. The otter

### The real mascot (from docs/design-handoff/README.md)

"A soft brown otter wrapped in a plaid blanket, rounded, hand-drawn, warm."

The source-of-truth otter assets are in `docs/design-handoff/otter/` (12 PNGs). The `frontend/assets/otter/` folder contains older placeholders. Use the design-handoff poses.

### Otter colors (from FallbackOtter component, OtterMascot.tsx)

| Part | Hex |
|---|---|
| Body and head fur | #8A6A4A |
| Ears (outer) | #5E4530 |
| Ears (inner) | #8A6A4A |
| Belly and muzzle | #E8D8BE |
| Scarf | #D4A24F |
| Scarf stroke | #B58A3F |
| Eyes and nose | #3B2E22 |
| Eye shine | #FFFFFF |
| Crown | #E0B26A |
| Crown stroke | #B58A3F |

### The 12 poses and where they go (from design-handoff README)

| File | Pose | Used on |
|---|---|---|
| otter-sit-attentive.png | Sitting, paws together, leaning in, calm | Onboarding S4 hand-over |
| otter-sit-calm.png | Sitting, paws tucked under blanket, settled | Onboarding S5 sit-with-me idle |
| otter-float-awake.png | Floating on back, eyes open, fully relaxed | Alternate S5 idle, calm empty state |
| otter-hands-raised.png | Arms up, gentle closed-mouth smile | Onboarding S6 the win |
| otter-celebrate.png | Arms thrown up, big open grin | Big milestone. Not for S6. |
| otter-wave.png | One paw raised, warm smile | Hello. Room entry, returning-user greeting. Not S1. |
| otter-working.png | Sitting with a laptop | Room / body-double |
| otter-working-bed.png | Lying down at a laptop, cozy, transparent bg | Alt Room / body-double, sleepier |
| otter-focus-timer.png | Blanket-wrapped, mildly grumpy | Focus/timer state, if added |
| otter-float-asleep.png | Floating on back asleep, serene | Rest, end of session |
| otter-sleep.png | Curled in a ball asleep, transparent bg | Deep rest, idle-too-long |
| otter-pickleball.png | Holding a pickleball paddle | Marketing, stickers, fun empty state |

### The line-drawing floating otter (secondary, decorative only)

Used in the tab bar and as a subtle SVG motif. Single path, stroke only, no fill. The NFT "OtterGlyph" SVG in motifs.tsx. This is not the brand mark. The filled cartoon otter is the brand mark.

### NO other marks

No second character. No different art style. No photo. No abstract logo.

## 9. Visual rules (from design_guidelines.json)

- Shadows: FORBIDDEN. No drop shadows, no glow, no elevation APIs.
- Borders: 1px hairline only, using the border color token.
- Cards: Surface colored, 12px radius, 1px border. Flat design.
- Buttons: Primary are teal (primary), 12px radius (Next page uses pill/9999). Text #FFFFFF.
- Icons: Lucide React Native. Emojis as icons are banned.
- Wave motif: A delicate SVG wave. Decorative underline accent. Never a repeating bg pattern.
- Motion: Calm, slow, no bounce. 150-400ms. FadeIn or FadeInDown. Crossfade for screen transitions.
- Shadows, glow, elevation: all forbidden.
- Purple and neon alert colors: banned.
- The MicroStepCard on Next shows exactly one task. Never a scrollable todo list.

## 10. Social media brand assets

### Elements from the app that must appear

- The filled cartoon otter (warm brown #8A6A4A, cream belly #E8D8BE, gold scarf #D4A24F). The "sit-attentive" or "sit-calm" pose is the default.
- Name "Otterly" in Fraunces SemiBold.
- Positioning line: "Start, Not Alone." Alternatively: "Calm ADHD task starter."
- Primary teal #5E8B82 and warm cream #F5F1E8.
- Gold accent #D4A24F.

### Elements that must NOT appear

- No gamification: no flame emoji, no streak count, no "don't break the chain", no badges, no XP, no score.
- No medical claims. Not a treatment. "Calm task-starter" is the category.
- No generic wellness app aesthetics.
- No purple, no neon, no drop shadows, no gradients outside the Atmosphere component.
- No emojis as icons.
- No the line-drawing otter glyph as the primary mark (filled cartoon otter is primary).

### Platform requirements

| Platform | Asset | Dimensions |
|---|---|---|
| X (Twitter) | Profile | 1024x1024 |
| X (Twitter) | Banner | 1500x500 |
| LinkedIn | Profile | 400x400 |
| LinkedIn | Banner | 1584x396 |
| GitHub | Profile | 1024x1024 |
| App Store | Icon | 1024x1024 |
