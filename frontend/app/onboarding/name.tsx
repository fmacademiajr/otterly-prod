import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { OtterButton, SoftExit } from "@/src/components/OtterButton";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

export default function NameScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [reminder, setReminder] = useState("20:00");

  const finish = async () => {
    if (name.trim()) await storage.setItem("otterly.userName", name.trim());
    if (reminder.trim()) await storage.setItem("otterly.reminderTime", reminder.trim());
    await storage.setItem("otterly.onboarded", true);
    router.replace("/(tabs)/next");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              styles.eyebrow,
              { color: colors.textSubtle, fontFamily: fonts.body },
            ]}
          >
            almost there
          </Text>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontFamily: fonts.displayBold },
            ]}
          >
            One last thing.
          </Text>
          <Text
            style={[
              styles.sub,
              { color: colors.textMuted, fontFamily: fonts.body },
            ]}
          >
            So Otterly can say hi properly.
          </Text>

          <View style={{ height: spacing.xl }} />

          <Text style={[styles.label, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Your name (optional)
          </Text>
          <TextInput
            testID="user-name-input"
            value={name}
            onChangeText={setName}
            placeholder="Fernando"
            placeholderTextColor={colors.textSubtle}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontFamily: fonts.body },
            ]}
          />

          <View style={{ height: spacing.lg }} />

          <Text style={[styles.label, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Gentle reminder time
          </Text>
          <TextInput
            testID="reminder-time-input"
            value={reminder}
            onChangeText={setReminder}
            placeholder="20:00"
            placeholderTextColor={colors.textSubtle}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontFamily: fonts.numeric },
            ]}
          />
          <Text style={[styles.help, { color: colors.textSubtle, fontFamily: fonts.body }]}>
            Never more than one nudge a day. We promise.
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <OtterButton
            label="I'm ready"
            testID="onboarding-finish"
            onPress={finish}
          />
          <SoftExit label="Skip for now" testID="onboarding-skip-name" onPress={finish} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.md },
  title: { fontSize: 32, lineHeight: 40, marginBottom: spacing.xs },
  sub: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.sm },
  input: {
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    fontSize: 17,
  },
  help: { fontSize: 13, marginTop: spacing.sm },
  actions: { padding: spacing.lg, gap: spacing.xs },
});
