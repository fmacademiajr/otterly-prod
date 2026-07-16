import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { OtterButton, SoftExit } from "@/src/components/OtterButton";
import { WaterWave } from "@/src/components/motifs";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { api } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

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
      // Kick off a shrink so the user experiences the "aha" — we ignore result here,
      // Shrinker screen will re-fetch.
      api.shrinkTask(task.id, "medium").catch(() => {});
      await storage.setItem("otterly.firstTaskId", task.id);
      router.push({ pathname: "/onboarding/name", params: { taskId: task.id } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <Text
            style={[
              styles.eyebrow,
              { color: colors.textSubtle, fontFamily: fonts.body },
            ]}
          >
            step one
          </Text>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontFamily: fonts.displayBold },
            ]}
          >
            What's one thing{"\n"}you've been avoiding?
          </Text>
          <WaterWave width={180} color={colors.border} />

          <View style={{ height: spacing.xl }} />

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
                backgroundColor: colors.surface,
                borderColor: colors.border,
                fontFamily: fonts.body,
              },
            ]}
          />

          <Text
            style={[
              styles.hint,
              { color: colors.textMuted, fontFamily: fonts.body },
            ]}
          >
            Just name it. We'll shrink it in a second.
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <OtterButton
            label={loading ? "…" : "Shrink it"}
            testID="onboarding-shrink"
            loading={loading}
            disabled={!title.trim() || loading}
            onPress={submit}
          />
          <SoftExit
            label="Not right now"
            testID="onboarding-skip-shrink"
            onPress={async () => {
              await storage.setItem("otterly.onboarded", true);
              router.replace("/(tabs)/next");
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  title: { fontSize: 30, lineHeight: 38, marginBottom: spacing.base },
  input: {
    minHeight: 96,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: "top",
  },
  hint: { fontSize: 14, marginTop: spacing.md, lineHeight: 20 },
  actions: { padding: spacing.lg, gap: spacing.xs },
});
