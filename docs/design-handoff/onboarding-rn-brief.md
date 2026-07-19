# Otterly onboarding. React Native implementation brief.

For a coding agent (Claude Code or similar) running inside the existing Otterly repo. Goal: build the seven-screen first-run onboarding to match the approved prototype and the B1 flow spec, in React Native, and open a pull request.

Read first, in this order:
1. `OTTERLY-B1-ONBOARDING-FLOW.md` (the spec: per-screen copy, action, mechanism, labels)
2. `otterly-onboarding-prototype.html` (the working visual reference: layout, palette, motion)
3. This brief (how to build it in RN)

Match the repo's existing conventions where they exist. Where the repo is silent, use the recommended defaults below. Do not restyle the rest of the app. Do not add dependencies without flagging them in the PR description.

## Stack assumptions and defaults

- React Native. Detect Expo vs bare from the repo and follow it.
- Navigation: use the repo's existing navigator (likely React Navigation). Add an `Onboarding` stack shown only on first run.
- Language: match the repo (TypeScript preferred if the repo uses it).
- Styling: match the repo (StyleSheet, styled-components, or NativeWind). If none is dominant, use StyleSheet with a tokens file.
- Animation: use `react-native-reanimated` for the breath and ripple. If it is already a dependency, use it. If not, flag it in the PR and fall back to the `Animated` API rather than adding it silently.
- No web view. These are native screens, not the HTML file embedded.

## Design tokens (create `onboarding/tokens.ts` or merge into the existing theme)

Colors:
- bg `#eef1ee`
- screen `#f7f5f0`
- screenWarm `#f1ede4`
- ink `#39403b` (never pure black)
- inkSoft `#6c746d`
- inkFaint `#9aa39b` (skip, low-contrast)
- otter `#8a6f52`
- water `#7fa8a0` (accent, ripples)
- waterSoft `#cfe0db`
- line `#e2ddd2`
- card `#fffdf8`

Radii: card 26, button 16, field 16.
Spacing scale: 8, 10, 14, 18, 22, 30.
Type: headline 25 to 26, weight 600, lineHeight ~1.25. Support 15, color inkSoft, lineHeight ~1.55. Kicker 12, uppercase, letterSpacing 0.6, color water.
Button: height ~52, primary bg ink, text screen. Soft bg water, text white. Ghost transparent, border line, text inkSoft.
Motion: slow cross-fade between screens, ~600 to 700ms, ease `cubic-bezier(.4,0,.2,1)`. No spring bounce. No sound.

## Screen inventory

Build one component per screen under `onboarding/screens/`. Copy is final and lives in a strings file, not inline, so a Taglish locale set can be added later without touching components.

1. `Arrival` — headline "Can't start? You're not broken." support "Stress takes your planning brain offline. Otterly holds the plan for you." One button: Okay.
2. `Breath` — kicker "One breath first". Animated breath circle. support "Ten seconds. Long, slow exhale." No primary button. Low-contrast Skip in a corner. Auto-advances after one full breath cycle.
3. `OneThing` — headline "What's the one thing you can't start?" support "Type it or say it. Your words are enough." One text input plus a press-and-hold mic button. Button Okay enables when the field is non-empty.
4. `Shrink` — the generated first step shown in a card as the focal element. support "I'm holding the rest. You only ever see one thing." Otter mark appears here for the first time, small, lower corner. One button: Okay.
5. `SitWithMe` — otter mark, headline "I'll sit with you while you do it." support "No timer. No watching. Tap Done whenever you get back." Button Done. Low-contrast Not now below.
6. `TheWin` — single ripple animation, headline "That counts." support "You started. That was the hard part." A seven-dot soft streak with one dot filled. One button: Okay.
7. `HowOtterlyBehaves` — headline "No lists. No badges. No nagging." support "Want me to check in gently sometimes? Either answer is right." Two equal-weight buttons: Check in gently and Stay quiet. On tap, transition to the app's one-thing home screen showing the user's next step.

## State model (the whole flow has exactly three user decisions)

Keep onboarding state in a single reducer or context, `useOnboarding`:
- `task: string` — set on OneThing (decision 1)
- `firstStep: string` — from the Shrinker for `task`
- `didStep: boolean` — Done or Not now on SitWithMe (decision 2)
- `checkins: boolean` — Check in gently or Stay quiet on S7 (decision 3)

No other choices exist in onboarding. No categories, no priority, no settings screen, no account step before The Win. If auth is required, present it after S6 at the earliest, ideally deferred to session two (see open decision 1 in the flow spec).

## Animations

Breath (S2): a circle that scales from 0.7 to 1.25 over ~4s (inhale) and back to 0.7 over ~6s (exhale), one cycle, then `onDone` advances. This 4 to 6 breaths per minute pace is a mechanism requirement, not decoration. Respect the OS reduced-motion setting: if reduce-motion is on, hold a static circle and a "Breathe slowly" label for ten seconds, then advance.

Ripple (S6): one ring expands from 20 to 120 over 2.6s and fades, single play, then rests. No confetti, no repeat, no sound. Under reduce-motion, fade the ring in and out once with no scale.

Haptics: one soft haptic on the breath exhale and one on The Win are build decisions, not user settings. Do not add a toggle. Gate them behind the OS haptics setting only.

## Accessibility (non-negotiable for this audience)

- Support Dynamic Type. No fixed pixel heights that clip at large text sizes. Buttons grow, text wraps.
- Every button has an `accessibilityLabel` and `accessibilityRole="button"`.
- Reduced-motion honored on both animations as above.
- Skip and Not now are reachable by screen reader and are announced as low-priority, never as the primary action.
- Color contrast: body text on `screen` meets WCAG AA. inkFaint is used only for skip affordances, never for content the user must read.

## Guardrails (fail the PR if any is violated)

- No visible list anywhere. No progress bar and no step counter in the flow. A progress indicator is a list.
- One primary action per screen. Skip and Not now are secondary and cost nothing. No confirmation dialog on either.
- No streak that punishes, no fire, no badge, no points, no "don't break the chain".
- No shame, guilt, urgency, or FOMO copy. No medical claims.
- Onboarding ends inside the product on the one-thing home screen, not on a signup wall.
- Do not invent copy. Use the strings file. Do not add screens.

## Reference component (the pattern to follow)

One fully worked screen so the rest match. Adapt imports and styling to the repo.

```tsx
// onboarding/screens/Breath.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import { tokens as t } from '../tokens';

export function Breath({ onDone }: { onDone: () => void }) {
  const scale = useSharedValue(0.7);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        const id = setTimeout(onDone, 10000);
        return () => clearTimeout(id);
      }
      scale.value = withSequence(
        withTiming(1.25, { duration: 4000, easing: Easing.inOut(Easing.ease) }),   // inhale
        withTiming(0.7, { duration: 6000, easing: Easing.inOut(Easing.ease) }, (finished) => {
          if (finished) runOnJS(onDone)();                                          // exhale, then advance
        }),
      );
    });
    return () => { cancelled = true; };
  }, []);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.kicker}>ONE BREATH FIRST</Text>
        <Animated.View style={[styles.circle, circle]} />
        <Text style={styles.sub}>Ten seconds. Long, slow exhale.</Text>
      </View>
      <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Skip the breath" hitSlop={12}>
        <Text style={styles.skip}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.color.screen, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: t.color.water, marginBottom: 30 },
  circle: { width: 90, height: 90, borderRadius: 45, backgroundColor: t.color.water, opacity: 0.85 },
  sub: { fontSize: 15, lineHeight: 22, color: t.color.inkSoft, marginTop: 30, textAlign: 'center', maxWidth: 250 },
  skip: { fontSize: 14, color: t.color.inkFaint, textAlign: 'center', padding: 12 },
});
```

## Deliverable

Open a pull request that adds the `onboarding/` module (tokens, strings, seven screens, the `useOnboarding` state, and an `OnboardingStack`), wired to show on first run and to hand off to the existing home screen at the end. In the PR description, list any new dependency, any repo convention you had to guess, and any of the flow spec's open decisions (sign-in placement, shrink latency fallback, mic and notification permission timing, S3 stall path) that touch code, so Fernando can answer them in review.
