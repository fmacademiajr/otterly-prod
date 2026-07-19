import React, { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/src/theme/ThemeProvider";

// A calm layered background for the home screen: a time-of-day cream gradient, a
// faint drifting water horizon the otter lives on, and a soft vignette. No scenery,
// no imagery, zero added load. The step card stays solid so the one thing always
// has the highest contrast on screen.
//
// Contrast note: the night look binds to dark mode, not the wall clock. Overriding
// a light-theme screen with a dark gradient at 10pm would strand dark text on dark.
// So dark theme -> night; light theme picks morning/midday/dusk and never goes dark.
//
// Omitted vs the reference: the feTurbulence paper grain. react-native-svg has no
// reliable feTurbulence renderer (no Skia in this project), so the grain layer is
// dropped. Gradient + water + vignette carry the effect.

export type Period = "morning" | "midday" | "dusk" | "night";

type Cfg = {
  gradient: [string, string, string];
  locations: [number, number, number];
  water: string;
  waterOpacity: [number, number, number];
  waterY: [number, number, number];
  vignetteRGB: string;
  vignetteAlpha: number;
  vignetteInner: number;
  otter: "wave" | "float-awake" | "sleep";
  otterSize: number;
  breathe: boolean;
};

const PERIODS: Record<Period, Cfg> = {
  morning: { gradient: ["#f9f4e6", "#f7f3ea", "#f0ebdd"], locations: [0, 0.45, 1], water: "#7fa8a0", waterOpacity: [0.28, 0.18, 0.1], waterY: [560, 590, 622], vignetteRGB: "57,64,59", vignetteAlpha: 0.05, vignetteInner: 0.6, otter: "wave", otterSize: 76, breathe: true },
  midday: { gradient: ["#f7f5f0", "#f7f5f0", "#f7f5f0"], locations: [0, 0.5, 1], water: "#7fa8a0", waterOpacity: [0.28, 0.18, 0.1], waterY: [560, 590, 622], vignetteRGB: "57,64,59", vignetteAlpha: 0.05, vignetteInner: 0.6, otter: "wave", otterSize: 76, breathe: true },
  dusk: { gradient: ["#f2f0ea", "#edece4", "#e2e4dc"], locations: [0, 0.4, 1], water: "#6f9a92", waterOpacity: [0.34, 0.22, 0.12], waterY: [545, 578, 612], vignetteRGB: "47,58,54", vignetteAlpha: 0.07, vignetteInner: 0.58, otter: "float-awake", otterSize: 86, breathe: true },
  night: { gradient: ["#16231f", "#14201D", "#101a17"], locations: [0, 0.45, 1], water: "#7BA89F", waterOpacity: [0.22, 0.13, 0.07], waterY: [545, 578, 612], vignetteRGB: "0,0,0", vignetteAlpha: 0.16, vignetteInner: 0.58, otter: "sleep", otterSize: 80, breathe: false },
};

function periodFor(isDark: boolean): Period {
  if (isDark) return "night";
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "midday";
  return "dusk";
}

/** The current period plus which otter belongs in the home header. */
export function useAtmosphere() {
  const { isDark } = useTheme();
  const cfg = PERIODS[periodFor(isDark)];
  return { otter: { variant: cfg.otter, size: cfg.otterSize, breathe: cfg.breathe } };
}

function useReduced(): boolean | null {
  const [r, setR] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setR(v));
    return () => {
      alive = false;
    };
  }, []);
  return r;
}

function DriftPath({ y, color, opacity, amp, durMs }: { y: number; color: string; opacity: number; amp: number; durMs: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    if (amp === 0 || durMs === 0) {
      cancelAnimation(tx);
      tx.value = 0;
      return;
    }
    tx.value = withRepeat(
      withSequence(
        withTiming(amp, { duration: durMs / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: durMs / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(tx);
  }, [amp, durMs, tx]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const d = `M-20 ${y} Q 65 ${y - 12}, 150 ${y} T 360 ${y}`;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st]}>
      <Svg viewBox="0 0 340 700" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d={d} stroke={color} strokeWidth={1.1} fill="none" opacity={opacity} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

export function Atmosphere({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const cfg = PERIODS[periodFor(isDark)];
  const reduced = useReduced();
  const moving = reduced === false;
  const rgb = cfg.vignetteRGB;
  return (
    <View style={styles.root}>
      <LinearGradient colors={[...cfg.gradient]} locations={[...cfg.locations]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <DriftPath y={cfg.waterY[0]} color={cfg.water} opacity={cfg.waterOpacity[0]} amp={moving ? -10 : 0} durMs={14000} />
      <DriftPath y={cfg.waterY[1]} color={cfg.water} opacity={cfg.waterOpacity[1]} amp={moving ? 10 : 0} durMs={18000} />
      <DriftPath y={cfg.waterY[2]} color={cfg.water} opacity={cfg.waterOpacity[2]} amp={0} durMs={0} />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="38%" r="75%">
            <Stop offset={cfg.vignetteInner} stopColor={`rgb(${rgb})`} stopOpacity={0} />
            <Stop offset={1} stopColor={`rgb(${rgb})`} stopOpacity={cfg.vignetteAlpha} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#vignette)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
