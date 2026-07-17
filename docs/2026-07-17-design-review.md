# Otterly design review

## 1. THE VERDICT

The design is working. The prose copy is the best part of this app and it is not close: "Empty is okay too.", "Nothing is lost.", "Come back later.", "That's real.", "This week is still fresh.", "Please reach a real person." That is model anti-shame writing, and the code comments show the author actively hunting for shame rather than stumbling on it. Four of the six anti-overwhelm principles earn a clean yes on every screen. Next shows exactly one card. You counts steps, not tasks. Every screen has a soft exit. The color tokens match the guidelines exactly, the primary content path runs 12.5-15.3:1 contrast, and the fonts are properly tokenized. Room, You, Inbox and onboarding-welcome need nothing. Nothing in this app actively hurts a distressed user. The failures cluster in one place and one shape: where shame or hierarchy slipped in as a **number, an icon, or a font size** rather than a sentence, so the copy review never caught it. The hero screen inverts its own hierarchy, the energy gate gives no feedback, and a growth-chart arrow sits in the tab bar of an app that defines itself against growth charts. All of it is small diffs.

## 2. HARM

None. No screen shames a distressed user, blocks a crisis path, or traps. The crisis numbers dial, the phone rows are ~60px, and the crisis text runs 12.5:1+. The frozen user's actual action path is legible everywhere.

## 3. BREAKS A STATED PRINCIPLE

Ranked by impact on a frozen user.

### 3.1 The greeting outranks the one thing that matters (P1, brief 6.3)
`next.tsx:259` sets `hello` to 44px. `next.tsx:273` sets `taskTitle` (the micro-step, the whole point) to 26px. The greeting is 1.7x the next action. Line 112 hardcodes a newline, forcing a two-line ~104px block. Brief 6.3 names the hierarchy directly: greeting is a bare "Header", the micro-step is the "Big Fraunces line". The code ships the step as the small thing. Brief 7.3 says this card is "80% of the emotional experience" and asks for "larger type".

Fix (three edits, one file):
```
:259  hello:     { fontSize: 28, lineHeight: 34, letterSpacing: -0.5 }
:273  taskTitle: { fontSize: 34, lineHeight: 42, marginBottom: spacing.md }
:112  Hello,{name ? " " + name : ""}
```
Move lineHeight with fontSize or you clip Fraunces descenders at 34 and leave a dead gap under the greeting. Verify on device, not web.

### 3.2 The energy gate gives zero feedback (P3, brief 6.3 "teal fill on selected")
`EnergyPill.tsx:38-40` sets the active background to `colors.primarySurface`. Against the row's `surfaceMuted` that is **1.04:1 in dark and 1.02:1 in light**. There is no fill in either theme. Dark is worse because the active text cue collapses too (1.23:1). In `1-next.jpg` all three chips read unselected even though state defaults to "medium". `next.tsx:123` gates the spinner on `loading && !data`, so a re-tap shows no loading state either. The user taps "low" and nothing anywhere on screen changes.

Fix. Add a transparent border to the base pill so geometry never shifts, then color it:
```tsx
pill: { ...existing, borderWidth: 1, borderColor: "transparent" },
active && { backgroundColor: colors.primarySurfaceStrong, borderColor: colors.primary },
```
The border carries it (5.2:1 dark). Both tokens exist. Do not add borderWidth only on active — the pill grows 2px and shifts its siblings on every tap. While in the file, add `accessibilityState={{ selected: active }}` — a purely visual selection is invisible to VoiceOver and this ships to the App Store.

### 3.3 The brief's energy-drop escape is missing (P3, brief 6.3)
Brief 6.3:164 specifies a tertiary link: "I'm too tired for this" (drops energy to low). It does not exist. The two shipped exits are "Not this — pick another" (`next.tsx:229`, calls `load(energy)` at the **same** energy, so the next pick is no smaller) and "Skip for now" (`next.tsx:93`, pushes to a 7-item Inbox). Neither lowers energy. The moment the user most needs the gate is the moment they are frozen on a step they cannot start, and the app hands them a re-roll at the same difficulty.

`server.py:833` already instructs the model: "If energy is 'low': pick the shortest / lowest-friction step." So the fix is real, not theater. Insert below "Not this — pick another":
```tsx
{energy !== "low" ? (
  <TouchableOpacity testID="next-too-tired" onPress={() => onEnergy("low")} style={styles.softExit}>
    <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 15 }}>
      I&apos;m too tired for this
    </Text>
  </TouchableOpacity>
) : null}
```
Gate on `energy !== "low"` — the label lies when already at low. `onEnergy` exists at line 80. No backend change. Leave "Skip for now" alone, that is a separate call.

### 3.4 "NOTHING SHRUNK YET" is a verdict in an instruction slot (P2 and P5)
`next.tsx:149`. Same slot, same caps, same 3px letterspacing that says "DO THIS NEXT" when a step exists. `welcome.tsx:44` ships "I'll skip and just look around", which lands the user directly on this screen, so it is a first impression.

The thing that makes this core is not the tone. `server.py:809-811` returns `empty=True` off `db.steps.find({"done": False})`. That is empty in **two** cases: the user never added anything, and **the user just completed every step**. `next.tsx:143` catches both and there is no all-done intercept. So a user who just finished all their steps opens home and reads "NOTHING SHRUNK YET" in caps. It is factually false, and it lands at the exact moment principle 2 demands credit for micro-steps done.

Fix: delete lines 148-150. Do not substitute "START HERE" — it is false in the all-done case too, same defect one word over. The three lines below already carry the whole job.

### 3.5 The Next tab icon is a rising growth chart (P5, brief 6.2, section 3)
`_layout.tsx:2` imports `TrendingUp`. Line 37 renders it as the Next tab. Brief 6.2:146 specifies `Waves · Inbox · MessageCircle · User`. Brief line 23 says "No numbers-go-up dopamine." Line 25 says "not enterprise-blue-and-charts." A go-up-and-to-the-right chart arrow is the literal semiotics of the category Otterly defines itself against, and it sits in the tab bar on every screen. Room also renders `Home` (line 51) while Next is the actual home screen, so the house glyph points at the wrong tab.

Fix, verified both glyphs ship in the installed lucide-react-native 1.24.0:
```
:2   import { Mail, Waves, MessageCircle, User } from "lucide-react-native";
:37  <Waves color={color} size={22} strokeWidth={1.6} />
:51  <MessageCircle color={color} size={22} strokeWidth={1.6} />
```
`Mail`→`Inbox` is also a 6.2 deviation but semantically harmless. Skip it if time is short. `Waves` also earns its place against brief line 46, the calm-water motif.

### 3.6 "Your Progress Profile." titles a settings screen as a scoreboard (P5, brief 6.7)
`you.tsx:65`. The tab says "You". The screen is mostly account, subscription, name, reminder time, dark mode. So changing your reminder time means walking past a record of your progress. Brief 6.7:199 specifies a "Fraunces **name line**" as the first bullet — the brief spells out the person's name elsewhere (6.3:152, 'greeting ("hello, [name]")') and says "title" when it means a screen title (6.8:207). Brief line 25: "Not clinical SaaS." The screen's own comment at `you.tsx:68` already names this title as half a guilt mechanism, and the prior fix removed only the other half (the otter's mood).

Fix, one line. `name` is already in state (line 30, loaded line 40):
```tsx
<ScreenHeader title={name ? `Hi, ${name}.` : "You."} />
```
Drop the `eyebrow` prop. Keeping `eyebrow="you"` alongside a "You." title stutters. `eyebrow` is optional and this is the only ScreenHeader call site.

## 4. MEASURABLE FIXES

| What | Anchor | Measured | Bar | Fix |
|---|---|---|---|---|
| Energy pill active fill | `EnergyPill.tsx:38-40` | 1.04:1 dark, 1.02:1 light | visible | §3.2 above |
| Welcome wordmark, dark | `welcome.tsx:10,27` | **2.97:1** (#2E7268 on #14201D) | tokens only | Delete `TEAL_DARK`, use `colors.primary` → 6.33:1 |
| `textSubtle` dark on elevated surfaces | `tokens.ts:69` | 4.34 warmBg / 4.22 surface / 3.86 surfaceMuted / 3.84 warmSurface | 4.5 | `#7E8A87` → `#8F9B98` (clears all six: 5.83/5.40/5.25/4.81/4.78/4.99, still under textMuted's 6.4-7.8) |
| Close buttons ×4 | `crisis.tsx:38`, `paywall.tsx:129`, `shrink/[id].tsx:258`, `firstshrink.tsx:88` | **38×38** (22px icon + spacing.sm ×2) | 48 (guidelines:175), 44 (HIG) | `hitSlop={5}` → exactly 48. Not minWidth/minHeight — that grows each topRow 10px and resizes the spacer at `shrink/[id].tsx:266` |
| Type scale token | `tokens.ts:93-100` | absent; **18 distinct fontSize values** across app/ | guidelines:63-71 defines 7 | Add the `type` object. Do **not** migrate call sites |
| Screen padding | app-wide | spacing.lg = 24 vs typical 16 → ~1.5x | brief 4.6 says 2-3x | Hero screens breathe. Not worth a redesign |

**Welcome wordmark detail.** `welcome.tsx:10` declares `const TEAL_DARK = "#2E7268"` and line 27 applies it over `colors.background`. It never consults `isDark`. Light mode is 5.64:1, which is how it shipped unnoticed. It is a leftover from the retired line-drawing motif (`OtterMascot.tsx:170` holds the same hex as the `line` variant fallback). Welcome renders `variant="wave"`. Justify the fix on `design_guidelines.json:202` ("stick strictly to the exact hex codes provided"), not on WCAG — WCAG 1.4.3 exempts logotypes from contrast entirely. Do not touch `OtterMascot.tsx` as part of this.

**Type scale detail.** `grep -rho 'fontSize: [0-9]*' app/` returns 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 26, 28, 30, 32, 40, 44, 56. The guideline's h2=24 is used zero times. Three sizes (13/14/15) do one job across 41 call sites. Three competing heroes: 40, 44, 56. The 56 reserved for the timer is spent on the welcome wordmark while the real timer (`shrink/[id].tsx:490`) runs 44. **Do not fix this before launch.** Collapsing 41 call sites is a text-reflow regression risk with no user-visible payoff — the drift is cross-screen, and principle 1 means the user never sees 13 vs 14 vs 15 side by side. Ship the token only, so new code has somewhere to land:

```ts
export const type = {
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32 },
  h3: { fontFamily: fonts.bodySemibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyMuted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  timer: { fontFamily: fonts.numeric, fontSize: 56 },
  button: { fontFamily: fonts.bodySemibold, fontSize: 16 },
} as const;
```
Five lines, zero runtime risk. Migrate opportunistically post-launch as screens are edited.

**textSubtle detail.** Three readable sites fail, not two: `paywall.tsx:264` (legal), `shrink/[id].tsx:261` (eyebrow, compounded by 12px + letterSpacing 4 + uppercase), and `you.tsx:102` — the "Sign out" label at 13px on `colors.surface`, 4.22:1, the worst of the three and the only one labeling a live control. The single token edit lifts every call site including the placeholders, which moots the argument about whether placeholders are WCAG-exempt. Leave light-mode textSubtle alone. `textMuted` is healthy everywhere (7.77/7.20/7.00).

## 5. POLISH

- **Crisis numbers do not look tappable.** `crisis.tsx:61-78` renders flag + plain text with a hairline divider. No icon, no chevron, no tint. Reads as a printed table. Fix: one line, `crisis.tsx:70`, change the number's color from `colors.text` to `colors.primary`. Tinted text is the native "this dials" signal. Do **not** bump padding — the finding's proposed `spacing.md` (12) is *smaller* than the current `spacing.base` (16), and the row is already ~60px. Skip the Phone icon, it adds density to the one screen the brief calls "soft, quiet".
- **Paywall asks for money before it says why.** `paywall.tsx` renders hero → plans (:148) → features (:202-216) → CTA. Brief 6.8 orders title → bullets → plans → CTA. Cut :202-216 and paste above :148. No state crosses the blocks. Bonus: it also puts the plan cards adjacent to the CTA. After the move, check that the `spacing.xl` spacer at :218 does not double with planRow's marginBottom (:301). This affects conversion, not the frozen user.
- **"0 steps today".** `you.tsx:80` interpolates the raw number while the line above it (`:58`) has a hand-written gentle zero ("This week is still fresh."). Fix: render nothing at zero — `{!!stats?.todays_steps && (...)}`. Do not add a second reassurance under the first, two soothing lines read as protesting too much. Note the brief's own exemplar (line 37, "You showed up 2 of 7 days") *prints a low number*, so principle 5 bans verdict language, not counts. This is brief line 249 ("empty states should be the best writing in the app"), nothing more.
- **`CRISIS_OTTER` is dead.** `crisis.tsx:12`. Never referenced. Delete the line. Keep 10-11, used at :28.
- **Stale comment.** `StreakStrip.tsx:14` claims "from-the-left model — day 1 is Monday". False twice: a count cannot position by weekday, and `server.py:996` uses a rolling 7-day window (`today - timedelta(days=6)`), not a calendar week. Fix the comment, not the component.
- **Inbox is the one average-density screen.** 7 rows at base-16 pitch with hairline dividers, and `2-inbox.jpg` shows dead space below "2 more waiting". The rows could breathe for free. Not worth touching days from launch.

## 6. WHERE THE BRIEF IS NOW WRONG

- **Section 5, "Never emojis in the UI."** `crisis.tsx:15-22` uses flag emojis as country identifiers. `design_guidelines.json:180` and `:203` back the ban categorically, so this is a real double violation — and it should stay violated. Flags are functional identifiers where lucide ships no glyph. VoiceOver announces them fine. Impact on a distressed user is zero to positive. Amend narrowly, post-launch, in the same pass that fixes the otter line: *"Never emojis in the UI — no fire, no party, no otter. Exception: functional flag glyphs as country identifiers where no icon exists. The ban on decorative and gamification emoji stands."* Do **not** soften it to "no decorative emoji" — that accidentally unbans fire, party, and XP across the product and guts the anti-gamification stance.
- **Section 5, Typography, specifies faces only.** Fraunces/General Sans/DM Sans, no size scale. That is why 18 sizes drifted with no rule to break. The scale lives only in `design_guidelines.json:63-71`. Once the `type` token lands, add a one-line pointer in the brief so the two documents stop disagreeing by omission.
- **Section 6.8 still lists the yearly tier.** Already superseded and approved. Amend the text so the section stops looking like an active spec — the stale line is what let the bullets/plans ordering deviation hide.
- **Section 10: "No tablet, no desktop, no landscape."** This is correct and should be *louder*. It already correctly kills the "nothing constrains width on web" class of finding at 1568px. Nobody should spend an hour on it.

## 7. THE ONE THING

**Invert the type scale on the Next card.** `next.tsx:259` and `:273`, plus the newline at `:112`.

The brief calls this screen "the anti-overwhelm hero, the single most important screen in the app" and "80% of the emotional experience." It specifies the micro-step as the "Big Fraunces line." The app ships the step at 26px under a 44px salutation. A frozen user opens the app and reads the app's name for them, then a control they cannot tell the state of, and reaches their actual next action third. The whole product is one promise: here is the one small thing, it is smaller than you fear. That promise is currently rendered at 60% the size of "Hello."

Three lines. It costs ten minutes and it fixes the screen the entire app exists to deliver.