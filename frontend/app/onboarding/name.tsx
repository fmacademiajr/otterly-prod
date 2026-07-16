import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

export default function NameScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [name, setName] = useState("");

  const finish = async () => {
    if (name.trim()) await storage.setItem("otterly.userName", name.trim());
    await storage.setItem("otterly.onboarded", true);
    router.replace("/(tabs)/next");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top cream band with title */}
      <SafeAreaView edges={["top"]} style={[styles.topBand, { backgroundColor: colors.warmBg }]}>
        <TouchableOpacity
          testID="name-back"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ArrowLeft color={colors.textMuted} size={22} strokeWidth={1.6} />
        </TouchableOpacity>
        <View style={styles.topContent}>
          <Text
            style={[
              styles.eyebrow,
              { color: colors.textMuted, fontFamily: fonts.bodySemibold },
            ]}
          >
            STEP TWO
          </Text>
          <Text
            style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}
          >
            What should I{"\n"}call you?
          </Text>
        </View>
      </SafeAreaView>

      {/* Middle white area with input */}
      <KeyboardAvoidingView
        style={styles.middle}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TextInput
          testID="user-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textSubtle}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.border,
              fontFamily: fonts.body,
            },
          ]}
        />
      </KeyboardAvoidingView>

      {/* Bottom cream band with promise + All set CTA */}
      <View style={[styles.bottomBand, { backgroundColor: colors.warmBg }]}>
        <Text
          style={[styles.promise, { color: colors.textMuted, fontFamily: fonts.body }]}
        >
          Never more than one nudge a day.{"\n"}We promise.
        </Text>
        <SafeAreaView edges={["bottom"]}>
          <TouchableOpacity
            testID="onboarding-finish"
            onPress={finish}
            style={[styles.cta, { backgroundColor: colors.primary }]}
          >
            <Text
              style={{
                color: colors.onPrimary,
                fontFamily: fonts.bodySemibold,
                fontSize: 17,
              }}
            >
              All set
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBand: {
    paddingBottom: spacing.xl,
  },
  backBtn: {
    padding: spacing.md,
    alignSelf: "flex-start",
  },
  topContent: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 40,
    lineHeight: 48,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  middle: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  input: {
    height: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    fontSize: 17,
    textAlign: "center",
  },
  bottomBand: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.base,
    alignItems: "center",
  },
  promise: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  cta: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    minWidth: 280,
  },
});
