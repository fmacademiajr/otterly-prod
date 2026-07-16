import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

import { api } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

/**
 * Decorative stylized waves that appear at the bottom of the firstshrink screen.
 * Multiple concentric wavy lines, teal thin strokes.
 */
function StylizedWaves({ color, opacity = 0.35 }: { color: string; opacity?: number }) {
  return (
    <View style={{ height: 140, width: "100%", justifyContent: "flex-end" }}>
      <Svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="none">
        {[0, 8, 16, 24, 32, 40, 48].map((offset, i) => (
          <Path
            key={i}
            d={`M-40 ${100 + offset} Q 40 ${60 + offset}, 120 ${100 + offset} T 280 ${100 + offset} T 440 ${100 + offset}`}
            stroke={color}
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            opacity={opacity - i * 0.03}
          />
        ))}
      </Svg>
    </View>
  );
}

export default function FirstShrink() {
  const router = useRouter();
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const clean = title.trim();
    if (!clean) return;
    setLoading(true);
    try {
      const task = await api.createTask(clean);
      api.shrinkTask(task.id, "medium").catch(() => {});
      await storage.setItem("otterly.firstTaskId", task.id);
      router.push({ pathname: "/onboarding/name", params: { taskId: task.id } });
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    await storage.setItem("otterly.onboarded", true);
    router.replace("/(tabs)/next");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.warmBg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <TouchableOpacity
            testID="firstshrink-back"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft color={colors.textMuted} size={22} strokeWidth={1.6} />
          </TouchableOpacity>

          <View style={styles.headerBlock}>
            <Text
              style={[styles.eyebrow, { color: colors.textMuted, fontFamily: fonts.bodySemibold }]}
            >
              STEP ONE
            </Text>
            <Text
              style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}
            >
              What&apos;s one thing{"\n"}you&apos;ve been avoiding?
            </Text>
          </View>

          <TextInput
            testID="first-task-input"
            value={title}
            onChangeText={setTitle}
            placeholder="the laundry / that email / the slides…"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.primary,
                fontFamily: fonts.body,
              },
            ]}
          />

          <View style={{ height: spacing.lg }} />

          <TouchableOpacity
            testID="onboarding-shrink"
            onPress={submit}
            disabled={!title.trim() || loading}
            style={[
              styles.cta,
              { backgroundColor: title.trim() ? colors.primary : colors.warmBorder },
            ]}
          >
            <Text
              style={{
                color: title.trim() ? colors.onPrimary : colors.textSubtle,
                fontFamily: fonts.bodySemibold,
                fontSize: 17,
              }}
            >
              {loading ? "…" : "Shrink it"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View pointerEvents="none" style={styles.waves}>
          <StylizedWaves color={colors.primary} />
        </View>

        <TouchableOpacity onPress={skip} testID="onboarding-skip-shrink" style={styles.skipBtn}>
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 }}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  backBtn: { padding: spacing.sm, marginLeft: -spacing.sm, alignSelf: "flex-start" },
  headerBlock: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.xl },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  input: {
    minHeight: 160,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  cta: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  waves: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
  },
  skipBtn: { alignItems: "center", padding: spacing.base },
});
