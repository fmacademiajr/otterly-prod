import React from "react";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { ViewStyle } from "react-native";

/**
 * Subtle entrance animations — fade + short rise from below.
 * DESIGN.md rules: no bounce, no spring, 150–400ms ease-out.
 */

type FadeProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
};

export function FadeUp({ children, delay = 0, duration = 320, style }: FadeProps) {
  return (
    <Animated.View style={style} entering={FadeInDown.duration(duration).delay(delay)}>
      {children}
    </Animated.View>
  );
}

export function SoftFade({ children, delay = 0, duration = 250, style }: FadeProps) {
  return (
    <Animated.View style={style} entering={FadeIn.duration(duration).delay(delay)}>
      {children}
    </Animated.View>
  );
}
