import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  style?: ViewStyle;
  testID?: string;
};

export function OtterButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  style,
  testID,
}: Props) {
  const { colors } = useTheme();
  const bg =
    variant === "primary"
      ? disabled
        ? colors.surfaceMuted
        : colors.primary
      : "transparent";
  const border =
    variant === "ghost" ? colors.border : "transparent";
  const fg =
    variant === "primary"
      ? disabled
        ? colors.textSubtle
        : colors.onPrimary
      : colors.textMuted;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === "ghost" ? 1 : 0 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function SoftExit({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.6}
      style={styles.softExit}
    >
      <Text style={[styles.softExitLabel, { color: colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  softExit: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  softExitLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
  },
});
