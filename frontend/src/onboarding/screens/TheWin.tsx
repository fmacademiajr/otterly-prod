import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { OtterMascot } from "@/src/components/OtterMascot";
import { C, OnbButton, Screen, tx } from "../ui";
import { strings } from "../strings";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

// S6 The win — Tier 4, competence. One quiet ripple, one small nod, then stillness.
// The ripple marks showing up, so it plays whether they did the step or not.
export function TheWin({
  active,
  didStep,
  reduced,
  onNext,
}: {
  active: boolean;
  didStep: boolean;
  reduced: boolean | null;
  onNext: () => void;
}) {
  const copy = didStep ? strings.s6.done : strings.s6.notNow;
  const rp = useSharedValue(0); // ripple scale progress
  const ro = useSharedValue(0); // ripple opacity
  const nod = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced === null) {
      rp.value = 0;
      ro.value = 0;
      nod.value = 0;
      return;
    }
    if (reduced) {
      rp.value = 110 / 150; // fixed size, no scale
      ro.value = withDelay(200, withSequence(withTiming(0.45, { duration: 770 }), withTiming(0, { duration: 1430 })));
      nod.value = 0;
      return;
    }
    rp.value = withDelay(200, withTiming(1, { duration: 2600, easing: EASE }));
    ro.value = withDelay(200, withSequence(withTiming(0.65, { duration: 0 }), withTiming(0, { duration: 2600, easing: Easing.linear })));
    nod.value = withDelay(900, withSequence(
      withTiming(1, { duration: 520, easing: EASE }),
      withTiming(0, { duration: 780, easing: EASE }),
    ));
  }, [active, reduced, rp, ro, nod]);

  const ring = useAnimatedStyle(() => ({
    opacity: ro.value,
    transform: [{ scale: 0.147 + rp.value * (1 - 0.147) }],
  }));
  const otter = useAnimatedStyle(() => ({
    transform: [{ translateY: nod.value * 5 }, { rotate: `${nod.value * -2.5}deg` }],
  }));

  return (
    <Screen bg={C.screen}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View style={styles.stage}>
          <Animated.View style={[styles.ring, ring]} />
          <Animated.View style={otter}>
            <OtterMascot size={92} variant="hands-raised" />
          </Animated.View>
        </View>
        <Text style={[tx.headline, { marginTop: 10, textAlign: "center" }]}>{copy.headline}</Text>
        <Text style={[tx.support, { marginTop: 14, textAlign: "center" }]}>{copy.support}</Text>
      </View>
      <OnbButton label={strings.s6.button} onPress={onNext} accessibilityLabel="Continue" testID="onb-s6-okay" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { width: 150, height: 150, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  ring: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: C.water,
  },
});
