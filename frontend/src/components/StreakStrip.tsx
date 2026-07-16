import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/src/theme/ThemeProvider";

/**
 * StreakStrip — a horizontal row of 7 concentric-ring day markers.
 * Filled if the day was active. Non-punitive: missing days are just quiet outlines.
 */
export function StreakStrip({
  daysActive,
  size = 44,
}: {
  daysActive: number; // 0..7 (from-the-left model — day 1 is Monday)
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: 7 }).map((_, i) => (
        <DayRing
          key={i}
          size={size}
          active={i < daysActive}
          primary={colors.primary}
          primarySurface={colors.primarySurfaceStrong}
          border={colors.border}
        />
      ))}
    </View>
  );
}

function DayRing({
  size,
  active,
  primary,
  primarySurface,
  border,
}: {
  size: number;
  active: boolean;
  primary: string;
  primarySurface: string;
  border: string;
}) {
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer soft fill (only active) */}
      {active ? (
        <Circle cx={half} cy={half} r={half - 1} fill={primarySurface} opacity={0.55} />
      ) : null}
      {/* Outer ring */}
      <Circle
        cx={half}
        cy={half}
        r={half - 1}
        fill="none"
        stroke={active ? primary : border}
        strokeWidth={1.25}
      />
      {/* Middle ring */}
      <Circle
        cx={half}
        cy={half}
        r={half * 0.65}
        fill="none"
        stroke={active ? primary : border}
        strokeWidth={1.25}
        opacity={active ? 0.9 : 0.9}
      />
      {/* Inner ring / dot */}
      <Circle
        cx={half}
        cy={half}
        r={half * 0.3}
        fill={active ? primary : "none"}
        stroke={active ? primary : border}
        strokeWidth={1.25}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
});
