import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { OtterMascot } from "@/src/components/OtterMascot";
import { C, OnbButton, Screen, tx } from "../ui";
import { strings } from "../strings";
import { fonts } from "@/src/theme/tokens";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

// S4 The shrink — the otter's first appearance. It slides the step into view like
// it is handing it over, then settles. The full path is stored but never rendered.
export function Shrink({
  active,
  firstStep,
  reduced,
  onNext,
}: {
  active: boolean;
  firstStep: string;
  reduced: boolean | null;
  onNext: () => void;
}) {
  const s = strings.s4;
  const step = useSharedValue(0);
  const otter = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      step.value = 0;
      otter.value = 0;
      return;
    }
    step.value = withDelay(450, withTiming(1, { duration: 700, easing: EASE }));
    otter.value = withTiming(1, { duration: 900, easing: EASE });
  }, [active, step, otter]);

  const stepStyle = useAnimatedStyle(() => ({
    opacity: step.value,
    transform: [{ translateY: reduced ? 0 : (1 - step.value) * 14 }],
  }));
  const otterStyle = useAnimatedStyle(() => ({
    opacity: otter.value,
    transform: reduced
      ? []
      : [{ translateX: (1 - otter.value) * 26 }, { translateY: (1 - otter.value) * 34 }],
  }));

  return (
    <Screen bg={C.screen}>
      <View style={{ height: 44 }} />
      <Animated.View style={stepStyle}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{s.stepLabel}</Text>
          <Text style={styles.stepText}>{firstStep}</Text>
        </View>
        <Text style={[tx.support, { marginTop: 18 }]}>{s.support}</Text>
      </Animated.View>

      <View style={{ flex: 1 }} />

      <Animated.View style={[styles.otterRow, otterStyle]}>
        <OtterMascot size={96} variant="sit-attentive" />
      </Animated.View>

      <OnbButton label={s.button} onPress={onNext} accessibilityLabel="Continue" testID="onb-s4-okay" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 20,
    padding: 22,
    // Approved onboarding-specific shadow (design_guidelines.json's flat rule is
    // relaxed for this one card — flagged in the PR for a ruling).
    shadowColor: "#39403b",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  cardLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: C.water,
    fontFamily: fonts.bodyMedium,
  },
  stepText: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 28.6, color: C.ink, marginTop: 10 },
  otterRow: { alignItems: "flex-end", marginBottom: 8 },
});
