import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { fonts, onboardingLight } from "@/src/theme/tokens";

// Fixed onboarding palette. Screens never read the app theme — the flow is a
// single light look regardless of device theme (approved 2026-07-19).
export const C = onboardingLight;

// Font-family aliases for the spec's weights.
const FRAUNCES_SEMI = fonts.displayBold; // Fraunces SemiBold (600)
const FRAUNCES_MED = fonts.display; // Fraunces Medium (500)
const GS_REG = fonts.body; // General Sans Regular
const GS_MED = fonts.bodyMedium; // General Sans Medium

export const tx = StyleSheet.create({
  kicker: {
    fontFamily: GS_MED,
    fontSize: 12,
    letterSpacing: 0.72,
    textTransform: "uppercase",
    color: C.water,
  },
  headline: {
    fontFamily: FRAUNCES_SEMI,
    fontSize: 26,
    lineHeight: 32.5,
    letterSpacing: -0.26,
    color: C.ink,
  },
  headlineSmall: {
    // S3 headline is 23px
    fontFamily: FRAUNCES_SEMI,
    fontSize: 23,
    lineHeight: 28.75,
    letterSpacing: -0.23,
    color: C.ink,
  },
  support: {
    fontFamily: GS_REG,
    fontSize: 15.5,
    lineHeight: 24,
    color: C.inkSoft,
    maxWidth: 250,
  },
});

/** Reduce-motion, read once. Screens hold a static state until it resolves. */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  return reduced;
}

/** One soft haptic, gated only by the OS haptics setting. Never a user toggle. */
export function softHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
}

/** Full-bleed screen frame: fixed light bg, 64 top / 30 sides / 30 bottom, safe-area aware. */
export function Screen({
  bg = C.screen,
  children,
  style,
}: {
  bg?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: bg,
          paddingTop: Math.max(64, insets.top + 16),
          paddingBottom: Math.max(30, insets.bottom + 8),
          paddingHorizontal: 30,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "soft" | "choice";
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Primary = ink on screen text. Soft (S5 Done) = water on white.
 * Choice (S7) = ink text on card with a hairline border — the two answers carry
 * identical geometry and weight so neither reads as preselected.
 */
export function OnbButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: BtnProps) {
  const bg = variant === "soft" ? C.water : variant === "choice" ? C.card : C.ink;
  const fg = variant === "soft" ? "#ffffff" : variant === "choice" ? C.ink : C.screen;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        variant === "choice" && { borderWidth: 1, borderColor: C.line },
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      <Text style={[styles.btnLabel, { color: fg }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

/** Skip / Not now — borderless, low-contrast, centered. Never the primary action. */
export function SkipLink({
  label,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={12}
      style={[styles.skip, style]}
    >
      <Text style={styles.skipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnLabel: {
    fontFamily: GS_MED,
    fontSize: 16,
  },
  skip: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  skipLabel: {
    fontFamily: GS_REG,
    fontSize: 14,
    color: C.inkFaint,
    textAlign: "center",
  },
});
