import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";

import { OtterMascot } from "@/src/components/OtterMascot";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";

const CRISIS_BG = "#E5EBF1";       // pale blue-gray (light)
const CRISIS_BG_DARK = "#1F2A34";  // deep blue-gray (dark)
const CRISIS_OTTER = "#7A98B0";

const LINES = [
  { flag: "🇺🇸", label: "US", number: "988", tel: "988" },
  { flag: "🇵🇭", label: "PH", number: "1553", tel: "1553" },
  { flag: "🇬🇧", label: "UK", number: "111", tel: "111" },
  { flag: "🇨🇦", label: "CA", number: "988", tel: "988" },
  { flag: "🇦🇺", label: "AU", number: "13 11 14", tel: "131114" },
];

export default function CrisisScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const bg = isDark ? CRISIS_BG_DARK : CRISIS_BG;

  const call = (n: string) => {
    Linking.openURL(`tel:${n}`).catch(() => {});
  };

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} testID="crisis-close" style={styles.closeBtn}>
            <X color={colors.textMuted} size={22} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.center}>
          <OtterMascot size={110} variant="default" />
          <View style={{ height: spacing.lg }} />
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
            Please reach a real person.
          </Text>
          <Text style={[styles.body, { color: colors.text, fontFamily: fonts.body }]}>
            Otterly is a companion, not a therapist.{"\n"}
            For immediate help, please connect with{"\n"}
            professional support below.
          </Text>

          <View style={{ height: spacing.xl }} />

          <View style={[styles.card, { backgroundColor: colors.background }]}>
            {LINES.map((l, i) => (
              <View key={l.label}>
                <TouchableOpacity
                  testID={`crisis-${l.label.toLowerCase()}`}
                  onPress={() => call(l.tel)}
                  activeOpacity={0.6}
                  style={styles.row}
                >
                  <Text style={styles.flag}>{l.flag}</Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: fonts.bodySemibold,
                      fontSize: 17,
                      marginLeft: spacing.base,
                    }}
                  >
                    {l.label} - {l.number}
                  </Text>
                </TouchableOpacity>
                {i < LINES.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  closeBtn: { padding: spacing.sm },
  center: { flex: 1, alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: {
    fontSize: 26,
    lineHeight: 34,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  card: {
    width: "100%",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.base,
  },
  flag: { fontSize: 26 },
  divider: { height: 1, marginLeft: spacing.base + 26 + spacing.base },
});
