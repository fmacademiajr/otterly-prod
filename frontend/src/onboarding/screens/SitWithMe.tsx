import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { OtterMascot } from "@/src/components/OtterMascot";
import { C, OnbButton, Screen, SkipLink, tx } from "../ui";
import { strings } from "../strings";
import { fonts } from "@/src/theme/tokens";

// S5 Sit with me — body-doubling in miniature. The otter idles, breathing slowly,
// asking nothing. No timer, no pulsing, nothing scolds on backgrounding.
export function SitWithMe({
  active,
  firstStep,
  reduced,
  onDone,
  onNotNow,
}: {
  active: boolean;
  firstStep: string;
  reduced: boolean | null;
  onDone: () => void;
  onNotNow: () => void;
}) {
  const s = strings.s5;
  const p = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(p);
      p.value = 0;
      return;
    }
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(p);
  }, [active, reduced, p]);

  const idle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + p.value * 0.022 }, { translateY: -p.value }],
  }));

  return (
    <Screen bg="#efebe2">
      <View style={{ alignItems: "center", marginTop: 14 }}>
        <Text style={[tx.kicker, { letterSpacing: 0.6 }]}>{s.stepLabel}</Text>
        <Text style={styles.step}>{firstStep}</Text>
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Animated.View style={[{ marginBottom: 18 }, idle]}>
          <OtterMascot size={128} variant="sit-calm" />
        </Animated.View>
        <Text style={[tx.headline, { fontSize: 25, lineHeight: 31.25, textAlign: "center" }]}>
          {s.headline}
        </Text>
        <Text style={[tx.support, { marginTop: 14, maxWidth: 260, textAlign: "center" }]}>
          {s.support}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <OnbButton label={s.done} onPress={onDone} variant="soft" accessibilityLabel="Done" testID="onb-s5-done" />
        <SkipLink label={s.notNow} onPress={onNotNow} accessibilityLabel="Not now" testID="onb-s5-notnow" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { fontFamily: fonts.display, fontSize: 16, lineHeight: 22.4, color: "#4c534d", marginTop: 6 },
});
