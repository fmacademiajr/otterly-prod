import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Phone } from "lucide-react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { OtterGlyph, WaterWave } from "@/src/components/motifs";
import { SoftExit } from "@/src/components/OtterButton";

const LINES = [
  { country: "United States", number: "988", note: "Suicide & Crisis Lifeline (call or text)" },
  { country: "Philippines", number: "1553", note: "NCMH crisis hotline (24/7)" },
  { country: "United Kingdom", number: "116 123", note: "Samaritans (24/7)" },
  { country: "Canada", number: "988", note: "Talk Suicide Canada" },
  { country: "Australia", number: "13 11 14", note: "Lifeline Australia" },
];

export default function CrisisScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const call = (n: string) => {
    const clean = n.replace(/\s/g, "");
    Linking.openURL(`tel:${clean}`).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} testID="crisis-close" style={styles.closeBtn}>
          <X color={colors.textMuted} size={22} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          you're not alone
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <OtterGlyph size={80} color={colors.primary} />
          <View style={{ height: spacing.md }} />
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
            Please reach a real person.
          </Text>
          <WaterWave width={160} color={colors.border} />
        </View>

        <Text style={[styles.body, { color: colors.textMuted, fontFamily: fonts.body }]}>
          Otterly is a companion, not a therapist. If you're in crisis, someone trained is on the other end of these numbers — right now.
        </Text>

        <View style={{ height: spacing.lg }} />

        {LINES.map((l) => (
          <TouchableOpacity
            key={l.country}
            testID={`crisis-${l.country.replace(/\s/g, "-").toLowerCase()}`}
            onPress={() => call(l.number)}
            activeOpacity={0.7}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 15 }}>
                {l.country}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 }}>
                {l.note}
              </Text>
            </View>
            <View style={styles.number}>
              <Phone size={14} color={colors.primary} strokeWidth={1.6} />
              <Text style={{ color: colors.primary, fontFamily: fonts.numeric, fontSize: 16, marginLeft: 6 }}>
                {l.number}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: spacing.xl }} />
        <Text style={[styles.smallPrint, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          Numbers here are correct as of 2026 launch. Please check your local health system for updates.
        </Text>
        <SoftExit label="Come back" testID="crisis-back" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  closeBtn: { padding: spacing.sm },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
  title: { fontSize: 26, lineHeight: 34, textAlign: "center", marginBottom: spacing.base },
  body: { fontSize: 15, lineHeight: 22 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  number: { flexDirection: "row", alignItems: "center" },
  smallPrint: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: spacing.md },
});
