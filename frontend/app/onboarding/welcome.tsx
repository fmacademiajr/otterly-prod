import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { OtterButton } from "@/src/components/OtterButton";
import { OtterMascot } from "@/src/components/OtterMascot";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

// TEAL_DARK ("#2E7268") lived here and was applied to the wordmark regardless of
// theme, so the first screen a new user ever sees rendered the product name at
// 2.97:1 in dark mode. It never consulted isDark, which is why light mode (5.64:1)
// let it ship unnoticed. colors.primary is the token and gives 6.33:1 on dark.
// design_guidelines.json:202 says stick strictly to the provided hex codes.

export default function Welcome() {
  const router = useRouter();
  const { colors } = useTheme();

  const skip = async () => {
    await storage.setItem("otterly.onboarded", true);
    router.replace("/(tabs)/next");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.middle}>
          <OtterMascot size={240} variant="wave" />
          <View style={{ height: spacing.xxl }} />
          <Text style={[styles.title, { color: colors.primary, fontFamily: fonts.displayBold }]}>
            Otterly
          </Text>
          <Text style={[styles.subtitle, { color: colors.text, fontFamily: fonts.body }]}>
            A calm place to start.{"\n"}One tiny step at a time.
          </Text>
        </View>

        <View style={styles.bottom}>
          <OtterButton
            label="Begin"
            testID="onboarding-begin"
            onPress={() => router.push("/onboarding/firstshrink")}
            style={{ borderRadius: radii.pill }}
          />
          <TouchableOpacity onPress={skip} testID="onboarding-skip" style={styles.skipBtn}>
            <Text style={{ color: colors.primary, fontFamily: fonts.body, fontSize: 15 }}>
              I&apos;ll skip and just look around
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: "space-between",
  },
  middle: { alignItems: "center", flex: 1, justifyContent: "center" },
  title: { fontSize: 56, letterSpacing: -1, marginBottom: spacing.lg },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
  },
  bottom: { gap: spacing.md, alignItems: "center" },
  skipBtn: { paddingVertical: spacing.md },
});
