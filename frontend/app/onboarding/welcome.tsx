import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { OtterButton } from "@/src/components/OtterButton";
import { OtterMascot } from "@/src/components/OtterMascot";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

const TEAL_DARK = "#2E7268";

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
          <OtterMascot size={260} variant="line" color={colors.primary} />
          <View style={{ height: spacing.xxl }} />
          <Text style={[styles.title, { color: TEAL_DARK, fontFamily: fonts.displayBold }]}>
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
