# Otterly Design Handoff — onboarding redesign + otter integration

A handoff for the Claude Design app. The job is to design the new first-run onboarding, integrate the otter mascot as a felt presence, and lift the existing screens toward the same calm, no-shame aesthetic. You produce visual concepts and mockups. Someone else (Fernando or a Claude Code session) implements them in the React Native app afterward, so your designs must drop cleanly into the real design system described below.

Read this README first, then the four reference files in this folder.

## Using this with the Claude Design app

The Design app works from what it can see. Give it this whole `docs/design-handoff/` folder plus the raw materials it cannot infer:

- Connect the `fmacademiajr/otterly-prod` repo, or upload this folder.
- The otter art is bundled in `otter/` (twelve PNGs). Upload that folder with the rest so the app has the real mascot to place. The mood map below says which otter belongs to which moment.
- Current-screen reference. Screenshots of the live screens (the one-thing home, the Room, Shrink, paywall) help far more than the file paths. Attach them if you have them.

Output target: visual concepts and mockups (an HTML/React artifact prototype is ideal, since one already exists as `onboarding-prototype.html`). Match the real palette, fonts, and otter variants below so the work is implementable, not just pretty.

## Why this exists (the decision)

The old onboarding (`welcome → firstshrink → name`) was a brand splash plus a feature demo plus a name form. The new onboarding is the first act of the help the app promises: it lowers the user's arousal and shame before asking for anything, hands them one real win in the first minute, and never leads with a logo or a form. The reasoning is grounded in a neuropsychology framework (see `psychology-and-product.md`), whose core insight is that a stressed brain's planning cortex is offline, so you must downregulate before offering structure. That is why screen 2 is a breath.

## What is in this folder

- `onboarding-flow-spec.md` — the seven screens, final. Per-screen copy, the one action, the mechanism, and the open product decisions. This is the source of truth for copy and intent.
- `onboarding-prototype.html` — the working visual and motion reference. Open it in a browser. It defines layout, palette, and the breath/ripple timing. It is a reference, not code to embed.
- `onboarding-rn-brief.md` — how to build it in React Native: tokens, state model, animations, accessibility, guardrails, and a worked reference component.
- `psychology-and-product.md` — the product, the audience, the house style, and the science operationalized. The grounding for every design choice.

## The two jobs

### Job 1 — the new onboarding (primary)
Build/skin the seven-screen flow to match the prototype and the flow spec. The `onboarding-rn-brief.md` is the implementation contract. Integrate the otter per the flow spec's staging (this is deliberate):
- Screens 1 to 3 (Arrival, Breath, One thing): **no otter, no logo, no illustration.** These serve the user's state and body. Do not add a mascot here.
- Screen 4 (Shrink): the otter appears for the first time, small, lower corner, and slides the step into view like it is handing it over, then settles.
- Screen 5 (Sit with me): the otter settles into a quiet idle — slow breathing, an occasional blink, saying nothing. No pulsing, no timer.
- Screen 6 (The win): the otter gives one small nod, then stillness. One ripple, no confetti.
- Screen 7 → home: the otter rests in the corner as the flow crossfades into the one-thing home screen.

### Job 2 — lift the existing screens (secondary, non-breaking)
Bring the existing screens toward the same calm register and make the otter a consistent presence, without changing behavior. Screens: `app/(tabs)/next.tsx` (the one-thing home), `app/(tabs)/room.tsx` (the Room), `app/(tabs)/inbox.tsx`, `app/(tabs)/you.tsx`, `app/shrink/[id].tsx`, `app/paywall.tsx`, `app/crisis.tsx`. Improve spacing, hierarchy, motion, and otter usage. Do not redesign flows or move logic.

## The existing design system (respect it)

- **Otter mascot** renders through a component (`src/components/OtterMascot.tsx`) that swaps a pose by name. For art, use the real poses in `otter/` per the mood map above, not the repo's older `assets/otter/` placeholders. Do not invent new otter art or restyle the character; place the existing poses and animate them.
- **Theme + tokens**: `src/theme/tokens.ts` (`colorsLight`, `colorsDark`, `spacing`, `radii`, `fonts`) and `src/theme/ThemeProvider.tsx`. Brand primary is sage/teal (`#5E8B82` light, `#7BA89F` dark). Fonts are Fraunces (display) and GeneralSans (body). **Dark mode is real** — the app has a light/dark toggle. Anything you style must work in both, or be a deliberate, flagged exception.
- **Locked palette**: `design_guidelines.json` at the repo root pins the approved hex codes and says to stick to them strictly. See decision 1 below before introducing the prototype's cream palette.
- Reusable components already exist (`OtterButton`, `OtterMascot`). Prefer them over new one-offs.

## Otter art library and mood map

The real mascot art is in `otter/`. This is the source of truth for the otter, over any older placeholder in the repo's `frontend/assets/otter/`. One character throughout: a soft brown otter wrapped in a plaid blanket, rounded, hand-drawn, warm. Keep that identity. Do not restyle the otter, place it and animate it.

Twelve poses, and where each one belongs. The onboarding staging (nothing on screens 1 to 3, first appearance on screen 4) still governs.

| File | Pose and mood | Where it fits |
| --- | --- | --- |
| `otter-sit-attentive.png` | Sitting, paws together, leaning in, calm | Screen 4 hand-over. The otter offering the step. Primary S4 pick. |
| `otter-sit-calm.png` | Sitting, paws tucked under blanket, settled | Screen 5 sit-with-me idle. Quiet, present, asking nothing. Primary S5 pick. |
| `otter-float-awake.png` | Floating on back, eyes open, fully relaxed | Alt S5 idle, or a calm empty state. Most at-ease pose. |
| `otter-hands-raised.png` | Arms up, gentle closed-mouth smile | Screen 6 the win, the restrained version. One small nod energy. Primary S6 pick. |
| `otter-celebrate.png` | Arms thrown up, big open grin | The loud win. Use sparingly, not for S6 (spec says no confetti). Save for a bigger milestone. |
| `otter-wave.png` | One paw raised, warm smile | A hello. Room entry or a returning-user greeting. Not onboarding S1 (no otter there). |
| `otter-working.png` | Sitting with a laptop, "workin' on stuff" | The Room / body-double. Co-presence while the user works. |
| `otter-working-bed.png` | Lying down at a laptop, cozy, transparent bg | Alt Room / body-double, softer and sleepier. |
| `otter-focus-timer.png` | Blanket-wrapped, mildly grumpy, "active time running" badge | A focus/timer state, if a timer surface ever exists. Grumpy, so use with care given the no-pressure rule. |
| `otter-float-asleep.png` | Floating on back asleep, serene | Rest, end of session, a very quiet state. |
| `otter-sleep.png` | Curled in a ball asleep, transparent bg | Deep rest, night, or an idle-too-long state. |
| `otter-pickleball.png` | Holding a pickleball paddle | Playful extra. Marketing, stickers, a fun empty state. Not core flow. |

Two of these (`otter-working-bed.png`, `otter-sleep.png`) have transparent backgrounds; the rest sit on white. If you place one on a colored surface, knock out the white or ask for a transparent cut.

## Design decisions to resolve (flag them in your notes)

1. **Palette reconciliation.** The prototype uses a warm cream and water palette (bg `#eef1ee`, screen `#f7f5f0`, water `#7fa8a0`). The app's theme uses white/sage plus dark mode, and `design_guidelines.json` locks the hexes. Decide: either (a) extend the design system by adding the onboarding palette to `design_guidelines.json` and the tokens as a named, intentional set, or (b) map the prototype's intent onto the existing tokens. Recommendation: (a), scoped to onboarding, because the calm cream is load-bearing for the psychology — but it must be added to the system, not sprinkled inline. Also decide whether onboarding renders one fixed light look regardless of theme, or adapts to dark mode.
2. **Otter variant mapping.** Choose which existing variant (or a new idle animation composed from one) serves screens 4 to 7. Do not add new art without flagging it.

## Design constraints (so the work is implementable)

- **Design and style only.** These screens already have working logic and navigation. Redesign how they look and move, not what they do. Do not invent new flows, new steps, or new buttons that would need new behavior. If a visual idea needs a behavior change, call it out as a proposal, do not assume it.
- Use the real palette. Match `design_guidelines.json` and the tokens below. If you introduce the onboarding cream palette, present it as a named set to add to the system, not as scattered one-off colors (see decision 1).
- Design for light and dark mode both, or say plainly where an exception is intended. The app has a real theme toggle.
- Honor the onboarding flow rules: no visible list anywhere, no progress bar or step counter, one primary action per screen, no streak-that-punishes, no badges, no shame or urgency copy, no medical claims. Onboarding ends inside the product, not on a signup wall.
- House style for any copy you touch: short sentences, active voice, no em dashes, no semicolons, no hashtags in prose, no exclamation hype. Do not rewrite the flow spec's final copy; use it verbatim.
- Accessibility is non-negotiable for this audience: designs must survive large Dynamic Type without clipping, motion must have a calm/reduced-motion version (the breath and the ripple especially), controls need clear labels, and body text needs WCAG AA contrast.
- Motion is already available in code: `react-native-reanimated` and `expo-haptics` are installed. Design within gentle, interruptible motion; nothing that pulses, nags, or demands attention.

## What to hand back

- Visual concepts or an artifact prototype for the seven onboarding screens, with the otter staged exactly as the flow spec says (nothing on screens 1 to 3, first appearance on screen 4).
- The otter variant mapping: which of the twelve existing variants serves each moment (screen 4 hand-over, screen 5 idle sit, screen 6 the nod), and the calm idle motion for the sit.
- Refreshed concepts for the existing screens in priority order: the one-thing home first, then Room, Shrink, paywall.
- A short notes section listing your answer to the two design decisions above, any new color or asset you are proposing to add, and any of the flow spec's open product decisions your design touches (sign-in placement, shrink latency fallback, mic/notification timing, the screen-3 stall, crisis-line placement, Taglish), so Fernando can rule on them before anyone writes code.
