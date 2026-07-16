import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { OtterButton, SoftExit } from "@/src/components/OtterButton";
import { OtterGlyph, WaterWave } from "@/src/components/motifs";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, spacing } from "@/src/theme/tokens";

export default function Welcome() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.top}>
          <OtterGlyph size={160} color={colors.primary} />
          <View style={{ height: spacing.md }} />
          <WaterWave width={220} color={colors.border} />
        </View>

        <View style={styles.middle}>
          <Text style={[styles.hello, { color: colors.textMuted, fontFamily: fonts.body }]}>hi</Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
            Otterly
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: fonts.body }]}>
            A calm place to start.{"\n"}One tiny step at a time.
          </Text>
        </View>

        <View style={styles.bottom}>
          <OtterButton
            label="Begin"
            testID="onboarding-begin"
            onPress={() => router.push("/onboarding/firstshrink")}
          />
          <SoftExit
            label="I'll skip and just look around"
            testID="onboarding-skip"
            onPress={async () => {
              const { storage } = await import("@/src/utils/storage");
              await storage.setItem("otterly.onboarded", true);
              router.replace("/(tabs)/next");
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, justifyContent: "space-between" },
  top: { alignItems: "center", marginTop: spacing.xl },
  middle: { alignItems: "center", paddingHorizontal: spacing.lg },
  hello: { fontSize: 14, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.md },
  title: { fontSize: 56, letterSpacing: -1, marginBottom: spacing.base },
  subtitle: { fontSize: 17, textAlign: "center", lineHeight: 26 },
  bottom: { gap: spacing.sm },
});
