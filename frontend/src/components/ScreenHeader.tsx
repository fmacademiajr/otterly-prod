import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, spacing } from "@/src/theme/tokens";

/**
 * ScreenHeader — teal-washed band with a hand-drawn wavy divider at the bottom.
 * Used on You + Room to match Stitch redesign.
 */
export function ScreenHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.band, { backgroundColor: colors.tealBand }]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          {eyebrow ? (
            <Text
              style={[
                styles.eyebrow,
                { color: colors.textMuted, fontFamily: fonts.body },
              ]}
            >
              {eyebrow}
            </Text>
          ) : null}
          <Text
            style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}
            testID="screen-header-title"
          >
            {title}
          </Text>
        </View>
        {right ? <View style={{ marginLeft: spacing.md }}>{right}</View> : null}
      </View>
      <BandWave color={colors.tealBand} strokeColor={colors.tealBandBorder} />
    </View>
  );
}

/**
 * A soft hand-drawn wave rendered at the bottom of a colored band.
 * Wave is filled with the band color so it appears as a shaped edge.
 */
export function BandWave({
  color,
  strokeColor,
}: {
  color: string;
  strokeColor?: string;
}) {
  return (
    <View style={{ height: 24, width: "100%" }}>
      <Svg width="100%" height="24" viewBox="0 0 400 24" preserveAspectRatio="none">
        <Path
          d="M0 0 L 0 12 Q 80 -4, 160 12 T 320 12 T 400 12 L 400 0 Z"
          fill={color}
          stroke={strokeColor || "transparent"}
          strokeWidth={strokeColor ? 0.75 : 0}
        />
        {/* the shaped underline (bottom edge) */}
        <Path
          d="M0 12 Q 80 -4, 160 12 T 320 12 T 400 12"
          fill="none"
          stroke={strokeColor || "transparent"}
          strokeWidth={strokeColor ? 0.75 : 0}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingTop: spacing.lg,
  },
  top: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
});
