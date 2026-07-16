import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { StreakRipple } from "@/src/components/motifs";
import { api, type StreakStats } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

export default function YouScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [name, setName] = useState("");
  const [reminder, setReminder] = useState("20:00");

  const load = useCallback(async () => {
    try {
      const s = await api.streak();
      setStats(s);
    } catch {}
    const n = await storage.getItem<string>("otterly.userName", "");
    if (n) setName(n);
    const r = await storage.getItem<string>("otterly.reminderTime", "20:00");
    if (r) setReminder(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    storage.setItem("otterly.userName", name);
  }, [name]);
  useEffect(() => {
    storage.setItem("otterly.reminderTime", reminder);
  }, [reminder]);

  const days = stats?.days_this_week ?? 0;
  const streakLine =
    days === 0
      ? "This week is still fresh."
      : days === 1
      ? "You showed up 1 of 7 days."
      : `You showed up ${days} of 7 days.`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          you
        </Text>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
          {name ? name : "Hello, you."}
        </Text>

        <View
          style={[
            styles.streakCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          testID="streak-card"
        >
          <View style={styles.rippleWrap}>
            <StreakRipple size={120} color={colors.primary} />
            <View style={styles.rippleCenter}>
              <Text style={[styles.dayNumber, { color: colors.text, fontFamily: fonts.numeric }]}>
                {days}
              </Text>
              <Text style={[styles.dayLabel, { color: colors.textSubtle, fontFamily: fonts.body }]}>
                of 7
              </Text>
            </View>
          </View>
          <Text style={[styles.streakLine, { color: colors.textMuted, fontFamily: fonts.body }]}>
            {streakLine}
          </Text>
          <Text style={[styles.streakSub, { color: colors.textSubtle, fontFamily: fonts.body }]}>
            {stats?.todays_steps ?? 0} step{stats?.todays_steps === 1 ? "" : "s"} today
          </Text>
        </View>

        <Text style={[styles.section, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          settings
        </Text>

        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Name
          </Text>
          <TextInput
            testID="settings-name"
            value={name}
            onChangeText={setName}
            placeholder="you"
            placeholderTextColor={colors.textSubtle}
            style={[styles.rowInput, { color: colors.text, fontFamily: fonts.body }]}
          />
        </View>

        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Reminder time
          </Text>
          <TextInput
            testID="settings-reminder"
            value={reminder}
            onChangeText={setReminder}
            placeholder="20:00"
            placeholderTextColor={colors.textSubtle}
            style={[styles.rowInput, { color: colors.text, fontFamily: fonts.numeric }]}
          />
        </View>

        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Dark mode
          </Text>
          <Switch
            testID="settings-dark"
            value={isDark}
            onValueChange={(v) => setMode(v ? "dark" : "light")}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.background}
          />
        </View>

        <TouchableOpacity
          testID="settings-follow-system"
          onPress={() => setMode("system")}
          style={{ paddingVertical: spacing.md, alignItems: "center" }}
        >
          <Text style={{
            color: mode === "system" ? colors.primary : colors.textSubtle,
            fontFamily: fonts.body,
            fontSize: 13,
          }}>
            {mode === "system" ? "· following your device ·" : "follow device"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.xs },
  title: { fontSize: 30, lineHeight: 38, marginBottom: spacing.lg },
  streakCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  rippleWrap: { position: "relative", width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  rippleCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  dayNumber: { fontSize: 40, lineHeight: 44 },
  dayLabel: { fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginTop: 4 },
  streakLine: { fontSize: 15, marginTop: spacing.base, textAlign: "center" },
  streakSub: { fontSize: 13, marginTop: 4 },
  section: {
    fontSize: 11,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  rowLabel: { fontSize: 14 },
  rowInput: { fontSize: 15, textAlign: "right", flex: 1, marginLeft: spacing.base },
});
