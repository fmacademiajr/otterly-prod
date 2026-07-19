import React, { useEffect, useState } from "react";
import { AccessibilityInfo, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// A slow 5.6s breath loop for a resting otter: scaleY 1 -> 1.022 with a 1px lift,
// anchored near the base. Honors reduce-motion (static). Matches the onboarding idle.
export function IdleBreath({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const p = useSharedValue(0);
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced === null || reduced) {
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
  }, [reduced, p]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + p.value * 0.022 }, { translateY: -p.value }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
