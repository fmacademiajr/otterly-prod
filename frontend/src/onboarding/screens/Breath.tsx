import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { C, Screen, SkipLink, softHaptic, tx } from "../ui";
import { strings } from "../strings";
import { fonts } from "@/src/theme/tokens";

const EASE = Easing.inOut(Easing.ease);

// S2 The breath — Tier 1 downregulation. One paced cycle (4s inhale, 6s exhale),
// then auto-advance. The 4-to-6 breaths-per-minute pace is a mechanism, not decor.
export function Breath({
  active,
  reduced,
  onDone,
  onSkip,
}: {
  active: boolean;
  reduced: boolean | null;
  onDone: () => void;
  onSkip: () => void;
}) {
  const s = strings.s2;
  const p = useSharedValue(0);
  const [label, setLabel] = useState<string>(s.inhale);
  const started = useRef(false);

  useEffect(() => {
    if (!active || reduced === null || started.current) return;
    started.current = true;

    if (reduced) {
      setLabel(s.reduced);
      const id = setTimeout(onDone, 10000);
      return () => clearTimeout(id);
    }

    setLabel(s.inhale);
    p.value = withSequence(
      withTiming(1, { duration: 4000, easing: EASE }),
      withTiming(0, { duration: 6000, easing: EASE }, (fin) => {
        if (fin) runOnJS(onDone)();
      }),
    );
    // Exhale begins after the 4s inhale: swap the label and give one soft haptic.
    const t = setTimeout(() => {
      setLabel(s.exhale);
      softHaptic();
    }, 4000);
    return () => {
      clearTimeout(t);
      cancelAnimation(p);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced]);

  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 0.7 + p.value * 0.55 }] }));
  const core = useAnimatedStyle(() => ({ transform: [{ scale: 0.72 + p.value * 0.43 }] }));

  return (
    <Screen bg={C.screenWarm}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={[tx.kicker, { marginBottom: 30 }]}>{s.kicker}</Text>
        <View style={styles.stage}>
          <Animated.View style={[styles.fill, reduced ? undefined : ring]}>
            <Svg width={150} height={150}>
              <Defs>
                <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={C.waterSoft} stopOpacity={1} />
                  <Stop offset="0.68" stopColor={C.waterSoft} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={75} cy={75} r={75} fill="url(#halo)" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.core, reduced ? undefined : core]} />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          {label}
        </Text>
        <Text style={[tx.support, { marginTop: 22, textAlign: "center" }]}>{s.support}</Text>
      </View>
      <SkipLink label={s.skip} onPress={onSkip} accessibilityLabel="Skip the breath" testID="onb-s2-skip" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { width: 150, height: 150, alignItems: "center", justifyContent: "center" },
  fill: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  core: { width: 74, height: 74, borderRadius: 37, backgroundColor: C.water, opacity: 0.85 },
  label: { marginTop: 26, minHeight: 22, fontSize: 15, color: C.inkSoft, fontFamily: fonts.body },
});
