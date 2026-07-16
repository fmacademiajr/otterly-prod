# Otterly — Designer Brief

*A calm ADHD task-starter mobile app · Feb 2026*

> **This document is meant to be forwarded to a UI/UX designer.**
> It contains everything they need — positioning, principles, current screens, current design tokens, what to keep, what to improve, and asset needs — without needing a live handoff call.

---

## 1. The one-sentence pitch

Otterly helps a person with ADHD decide **the one small thing to do next**, then quietly sits with them while they do it.

## 2. Who we're for

- Adults (mostly 22–40) with ADHD, high-functioning-but-overwhelmed
- Culturally leaning Philippines-first, then global English-speaking
- People who tried Todoist / Notion / Finch and *quit* — because those apps either shame you (streaks that break) or infantilize you (cutesy pets, XP loops)

## 3. What Otterly is *not*

- **Not another task list.** Task lists are the disease, not the cure. The home screen shows **one** thing, never a list.
- **Not a productivity coach.** No cheerleading ("You got this!"). No numbers-go-up dopamine ("+50 XP"). No fire emojis on streaks.
- **Not a cartoon.** No mascot on every screen. The otter is a *motif*, referenced sparingly — a line-drawing icon, not a face with eyes.
- **Not clinical SaaS.** Warm, human, spacious — not enterprise-blue-and-charts.

We are positioned in the gap between **Finch** (cute-gamified) and **Focusmate** (clinical-SaaS). Warmth without cuteness. Refinement without coldness.

## 4. Anti-overwhelm design principles (the north star)

Every design decision must earn a "yes" against these six:

1. **One thing on screen at a time.** Never a scrollable to-do list on the home. Never dashboards with 6 widgets.
2. **Progress is measured in micro-steps done, not tasks completed.** A user might never finish "file taxes" — they finished 3 concrete steps today. That's success.
3. **Energy check-in gates the "Next" pick.** How much you can do depends on how you feel *right now*. UI must respect that.
4. **Every screen has a soft way out.** "Not now", "Come back later", "Let's sit for a minute". Never a modal that traps.
5. **No shame, ever.** If you skipped 5 days, the streak reads *"You showed up 2 of 7 days"* — not "Streak broken." Copy must be reviewed for accidental shame.
6. **Whitespace is a feature.** 2–3× more spacing than an average app feels comfortable with. Every screen should feel like it can breathe.

## 5. Current design system (v1)

*Verbatim from the upstream repo's `DESIGN.md`. This is authoritative — deviate only with explicit approval.*

### Aesthetic direction

Calm, **refined-organic**. Otter + calm-water motif — hairline waves, gentle curves. Warm-but-grown-up. Deliberately **not purple**. Deliberately **not** a cartoon mascot.

### Color — Light (default)

| Token | Hex | Use |
|---|---|---|
| `background` | `#FFFFFF` | Canvas |
| `surface` | `#FAFAFA` | Cards |
| `surfaceMuted` | `#F4F4F5` | Chips, backgrounds inside cards |
| `border` | `#E4E4E7` | All hairline borders (1px) |
| `text` | `#18181B` | Primary text |
| `textMuted` | `#52525B` | Secondary text |
| `textSubtle` | `#71717A` | Tertiary / eyebrow labels |
| **`primary`** | **`#5E8B82`** | **Calm teal — hero, primary buttons** |
| `primaryHover` | `#4E7670` | Pressed state |
| `primarySurface` | `#EDF4F1` | Wash under selected chips, completion cards |
| **`accent`** | **`#D4A24F`** | **Warm sand — sparingly, for anchor moments only** |
| `success` | `#3F7D58` | Completion checkmarks |
| `warning` | `#B58A3F` | Reserved |
| `danger` | `#A04848` | Error copy only, never as a UI accent |

### Color — Dark

| Token | Hex |
|---|---|
| `background` | `#14201D` |
| `surface` | `#1B2926` |
| `surfaceMuted` | `#20302C` |
| `border` | `#2C3A36` |
| `text` | `#F3F5F4` |
| `textMuted` | `#A8B3B0` |
| `textSubtle` | `#7E8A87` |
| `primary` | `#7BA89F` |
| `primarySurface` | `#1F2D29` |
| `accent` | `#E0B26A` |
| `success` | `#5E9E78` |

### Typography

| Face | Family | Used for |
|---|---|---|
| **Display** | **Fraunces** (serif) | Greetings, screen titles, hero moments, empty-state lines |
| **Body / UI** | **General Sans** (humanist sans, Fontshare) | Everything else |
| **Numeric** | **DM Sans** with `font-variant-numeric: tabular-nums` | Timers, streak counts, minute pills |

**Avoid:** Inter, Roboto, Poppins, system-ui as display or body. Too "SaaS-generic."

> **Known deviation in v1 (please help fix in your redesign):**
> General Sans isn't served on a public raw-TTF CDN we can hit from Expo dev builds. Current app substitutes **DM Sans** as the body face. First deliverable we'd love from a designer: guidance on how to legitimately bundle Fontshare's General Sans as an app asset without violating licence — or a same-vibe alternative.

### Spacing (4px grid)

`xs 4 · sm 8 · md 12 · base 16 · lg 24 · xl 32 · xxl 48 · xxxl 64`

### Radius

`sm 4 · md 8 (buttons) · lg 12 (cards) · pill 9999`

### Motion

- Fade only. **No bounce.** No spring physics.
- 150–400 ms ease-out
- Micro-animations OK: subtle press-scale (0.98), FadeInDown for cards on mount
- Never more than one thing animating on a screen at once

### Elevation

- **No drop shadows.** 1px hairline `border` in `#E4E4E7` (light) / `#2C3A36` (dark) does all elevation work.
- No glassmorphism, no glows, no gradients-on-white.

### Iconography

- **lucide-react-native** for utility icons (send, plus, trash, waves, checkmark, sparkles, close, etc.)
- Never emojis in the UI — no 🔥, no 🎉, no 🦦.
- Otter motif = a single restrained line-drawing SVG. Currently in `/app/frontend/src/components/motifs.tsx`. **This is v1 placeholder — a designed replacement is welcome.**

## 6. The screens (v1 — annotated)

### 6.1 Onboarding (3 screens)

**a. `/onboarding/welcome`**
- Full-bleed. Otter glyph large (~160), water-wave underneath.
- Fraunces display of "Otterly" as the hero word.
- Subtitle: *"A calm place to start. One tiny step at a time."*
- Primary CTA: `Begin`. Secondary: `I'll skip and just look around` (soft exit).

**b. `/onboarding/firstshrink`**
- Eyebrow: `STEP ONE`. Title (Fraunces): *"What's one thing you've been avoiding?"*
- Single big textarea with placeholder *"the laundry / that email / the slides…"*
- CTA: `Shrink it` → creates task + kicks off AI shrink.
- The point of this screen is the **aha moment** — user names one dread thing and immediately sees it broken into 3–8 doable steps.

**c. `/onboarding/name`**
- Optional name + reminder-time.
- The reminder copy is important: *"Never more than one nudge a day. We promise."* — this earns trust.

### 6.2 Tabs (bottom navigation, 4 tabs)

`Next · Inbox · Room · You`

Icons: Waves · Inbox · MessageCircle · User (from lucide).

### 6.3 `Next` tab — the anti-overwhelm hero

*The single most important screen in the app.*

- Header: greeting ("hello, [name]") in Fraunces
- Small otter glyph top-right (~72px)
- Energy pill: three chips — `low / medium / good` — segmented pill, teal fill on selected
- **ONE card** below with:
  - Eyebrow: `DO THIS NEXT`
  - Big Fraunces line: the actual micro-step text (e.g. "Open Gmail and start a draft to Jane")
  - A `minutesPill` (e.g. `5 min` in teal on primarySurface)
  - `from · <parent task title>` — one line, textMuted
  - A short warm sentence from the AI, textMuted (e.g. "This one's small enough to start.")
  - Water-wave decoration
  - Primary CTA: `Start` (teal button, generous padding)
  - Soft exit: `Not this — pick another`
  - Tertiary link: *"I'm too tired for this"* (drops energy to `low`)
- If inbox empty, the card flips to *"What's on your mind?"* → `Add something` (routes to Inbox)

### 6.4 `Inbox` tab

- Two modes toggled by a pill row: **Quick add** | **Braindump**
- **Quick add:** single-line input + big teal `+` button
- **Braindump:** multi-line textarea + `Sort it out` button that hands the paragraph to AI and returns a clean list of task titles
- Below: list of existing tasks. Tapping one → `Shrinker`.

### 6.5 `Shrinker` (route `/shrink/[id]`, modal-feeling)

- Header: close (X), eyebrow "shrinker", re-shrink icon
- Big task title in Fraunces
- Difficulty pill: `easy / medium / hard` (changes → auto re-shrinks)
- List of micro-steps as cards:
  - Round checkbox on the left (goes teal-filled `success` when tapped, with haptic)
  - Text "1. Open the drawer next to the sink"
  - Small `▶ 5 min` pill starts a focus timer for that step
- When a timer is running, a persistent teal timer bar appears above the list with `48pt DM Sans` numerals and pause/stop controls
- Below the list: subtle `Deep Shrink (premium)` button in `accent` — this is the paywall trigger for complex tasks

### 6.6 `Room` tab — Sit-With-Me

- Header: eyebrow *sit-with-me*, Fraunces line *"I'm here."*
- Tiny "If you're in crisis" chip that opens `/crisis`
- Water-wave separator
- Chat area — bubbles are big-radius, low-density, spacious:
  - AI (otter) bubbles: `surface` with a hairline border, **Fraunces**, slightly larger
  - User bubbles: `primarySurface` teal wash, General Sans
- Input bar at bottom: `say anything — or nothing`
- The AI is trained to reply in 1–2 short sentences max. Whitespace is a feature. Never cheerlead.

### 6.7 `You` tab

- Fraunces name line
- **Streak card:** concentric `StreakRipple` visual with the day count in DM Sans center, plus the line: *"You showed up 2 of 7 days"* — never "streak broken."
- **Account card:** signed-in email/name, or `Sign in with Google` prompt
- **Upgrade CTA:** `Otter Premium` card with today's usage (*"Free tier: 1 / 3 shrinks today"*) — routes to `/paywall`
- Settings: name, reminder time, dark-mode toggle, "follow device" link

### 6.8 `/paywall`

- Otter glyph + Fraunces title *"One small support keeps Otterly warm."*
- Feature bullets with small teal-outlined circle + checkmark
- Three plan cards:
  - **Founding Otter · $29 once · Lifetime · launch special** (marked BEST in sand `accent` pill — deliberately positioned as the top pick)
  - **Otter Monthly · $4.99/mo**
  - **Otter Yearly · $39/yr · save 33%**
- CTA: `Continue` (if signed in) or `Sign in with Google` (if not — auth is required to purchase)
- Restore purchase link
- Legal small-print about Apple auto-renew

### 6.9 `/crisis`

- Soft, quiet. Otter glyph + Fraunces *"Please reach a real person."*
- Explanation: *"Otterly is a companion, not a therapist. If you're in crisis, someone trained is on the other end of these numbers — right now."*
- Row per country (US 988, PH 1553, UK 116 123, CA, AU) — tap to dial

## 7. What we want a designer to improve

Ranked by impact:

1. **Otter identity system.** The current glyph in `motifs.tsx` is a placeholder line-drawing. We want:
   - A definitive **otter mark** — line-drawing, one weight, teal — that scales from `24px` (favicon) to `160px` (welcome hero) without looking bad
   - App icon (rounded square, iOS + Android)
   - Splash screen
   - Optional: 3–4 "moment" illustrations for empty states — same restrained line-drawing style, no cartoon face

2. **Water-wave motif refinement.** We use it under cards and on the streak screen. A designer could make this feel like *actual moving water* without becoming decorative-for-decorative's-sake. Two ideas we haven't explored:
   - Very subtle animated wave under the `Next` card
   - The wave's "roughness" reflecting the user's energy (calm on `good`, choppier on `low` — a felt cue)

3. **The `Next` card**. This is 80% of the emotional experience. Right now it's competent but generic-card-with-teal-button. It could be:
   - More *moment-like* — larger type, more air, maybe a very subtle "the otter is nearby" visual
   - Better differentiated between the three states: **ready**, **loading (AI thinking)**, **empty**

4. **Room / Sit-With-Me atmosphere.** The chat feels like any chat. It shouldn't. It should feel like sitting in a quiet room with someone. Ideas:
   - No timestamps
   - AI messages appear with a slower fade
   - A "presence dot" showing the otter is there even when silent
   - Long silences aren't awkward — a soft "still here" ambient state

5. **Streak visual.** The `StreakRipple` (concentric rings) is fine but doesn't feel personal. Could this be a **weekly landscape** — 7 tiny water ripples in a row, some filled, some empty, non-punitive? Or an **otter float** that gets more comfortable with each day you show up?

6. **Empty states everywhere.** They're currently competent. They should be **the best writing in the app** — copy is design here. A designer with a copywriter friend welcome.

7. **Micro-interactions.** Right now: haptic on step-check + fade transitions. Room to add:
   - Water-ripple animation when a step is completed
   - Very subtle "the otter breathed" pulse on the Room otter presence dot
   - A pause + fade when the last step is completed — a real "moment", not a modal

## 8. What NOT to touch

- **Don't add purple, ever.** Not a lavender accent, not a violet gradient. This is a differentiation position vs. every ADHD/productivity app on the App Store.
- **Don't add a cartoon otter mascot.** No eyes, no smile, no "Waddle the otter says hi!" The otter is a *reference*, not a character.
- **Don't add fire emojis, XP, level-ups, or streak-breaking punishment.** These are anti-features here.
- **Don't add more than one CTA per screen.** The Next screen has one primary button (Start) and soft exits. Not three ways to "engage."
- **Don't switch to Inter / Roboto / Poppins.** If a font swap is proposed, it must beat Fraunces on warmth and General Sans on humanist-clarity.
- **Don't design a dashboard.** No "Your week in numbers." No charts.

## 9. Assets we need from a designer

- [ ] Otter mark (SVG, single weight, teal, scalable) — hero + tab-bar sizes
- [ ] iOS app icon (1024×1024, all required sizes derived)
- [ ] Android app icon (adaptive icon: foreground + background layers)
- [ ] Splash screen (1284×2778 iOS + Android equivalent)
- [ ] Water-wave motif variants (short, long, animated Lottie optional)
- [ ] Refined empty-state visuals for: Inbox empty, Next empty, Room first-open, Streak week-1
- [ ] Optional: Room "presence" visual (something that says "the otter is here" without being a face)
- [ ] Optional: micro-Lottie for step completion (soft water ripple)

## 10. Technical constraints a designer should know

- **React Native + Expo**, not native iOS. So: no SF Symbols, no iOS blur effects, no material-you dynamic color. Everything must ship cross-platform.
- **SVG is fine** (react-native-svg is installed).
- **Lottie is fine** (would need to install `lottie-react-native` — small perf cost, ~1 MB per animation).
- **Fonts are loaded from CDN** at app boot. If a designer picks a new font, it needs to be either on Google Fonts (raw TTF on jsDelivr works) or bundled as an app asset.
- **Dark mode is not optional** — every visual asset must have a dark counterpart or be color-agnostic (line drawings work great here).
- **The app runs on phone-sized screens only** (390×844 iPhone reference). No tablet, no desktop, no landscape.

## 11. Metrics we're optimizing for

The success metric from the upstream PRD: **WATSBDS** — *Weekly Active Task-Shrinkers Who Also Started A Sit-With-Me Session.* A user who has done both is a user for whom Otterly clicked. Design should push toward that dual-behavior activation, not toward "screens per session" or "notifications enabled."

Secondary: **paywall conversion**. We want a designer's read on whether the paywall (`/paywall`) currently earns the "yes" moment. Suspicion: the Founding-Otter $29 lifetime is the pick that should feel the most human/generous; monthly + yearly should feel more transactional.

## 12. Files & where to look

Everything is in `/app`:

- `app/frontend/app/**` — every screen, file-based routing
- `app/frontend/src/theme/tokens.ts` — the color + spacing + font token exports
- `app/frontend/src/components/motifs.tsx` — the current placeholder otter + waves
- `app/design_guidelines.json` — machine-readable version of this document
- Original repo (fuller product plan): https://github.com/fmacademiajr/otterly (see `DESIGN.md` + `docs/tinystep-prd.md`)

## 13. Working with us

- Feedback loop: propose a change → we implement in Expo → iterate.
- File format: **Figma preferred** with named layers matching the token names above.
- Please ship a **light and dark** version of every asset.
- Please ship a **rationale line** for anything that deviates from this doc. We honor deviations — but they need a reason.

---

**Contact:** [your contact]
**Repo:** [new repo URL once synced]
**Preview app:** https://otterly-next.preview.emergentagent.com

*Thank you for reading all of it. Otterly is a small kind app for a big painful problem — the design carries most of the medicine.*
