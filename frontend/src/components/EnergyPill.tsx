import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import type { Energy } from "@/src/lib/api";

const OPTIONS: { key: Energy; label: string }[] = [
  { key: "low", label: "low" },
  { key: "medium", label: "medium" },
  { key: "good", label: "good" },
];

export function EnergyPill({
  value,
  onChange,
}: {
  value: Energy;
  onChange: (e: Energy) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      {OPTIONS.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            testID={`energy-${o.key}`}
            onPress={() => onChange(o.key)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[
              styles.pill,
              active && {
                backgroundColor: colors.primarySurfaceStrong,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? colors.primary : colors.textMuted,
                  fontFamily: active ? fonts.bodySemibold : fonts.body,
                },
              ]}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    // The selected fill was primarySurface on surfaceMuted: 1.04:1 in dark, 1.02:1
    // in light. Invisible. The energy check-in gates the whole Next pick and tapping
    // it changed nothing you could see. The border does the work now.
    // Transparent here, not added on `active`, or the pill grows 2px and shoves its
    // siblings sideways on every tap.
    borderWidth: 1,
    borderColor: "transparent",
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
