import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { LogOut, Sparkles, ChevronRight } from "lucide-react-native";

import { ScreenHeader } from "@/src/components/ScreenHeader";
import { StreakStrip } from "@/src/components/StreakStrip";
import { OtterMascot } from "@/src/components/OtterMascot";
import { api, type StreakStats, type AccessSnapshot } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";
import { useAuth } from "@/src/auth/AuthProvider";

export default function YouScreen() {
  const { colors, isDark, mode, setMode } = useTheme();
  const router = useRouter();
  const { user, status, signIn, signOut, deleteAccount } = useAuth();
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [access, setAccess] = useState<AccessSnapshot | null>(null);
  const [name, setName] = useState("");
  const [reminder, setReminder] = useState("20:00");
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([api.streak(), api.access()]);
      setStats(s);
      setAccess(a);
    } catch {}
    const n = await storage.getItem<string>("otterly.userName", "");
    if (n) setName(n);
    const r = await storage.getItem<string>("otterly.reminderTime", "20:00");
    if (r) setReminder(r);
    setLoadedFromStorage(true);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (loadedFromStorage) storage.setItem("otterly.userName", name);
  }, [name, loadedFromStorage]);
  useEffect(() => {
    if (loadedFromStorage) storage.setItem("otterly.reminderTime", reminder);
  }, [reminder, loadedFromStorage]);

  const handleDeleteAccount = useCallback(async () => {
    const message =
      "This removes your tasks, braindumps, and Room chats. It cannot be undone.\n\n" +
      "Deleting your account does not cancel a subscription. Cancel it in Settings, Apple ID, Subscriptions.\n\n" +
      "Signed in with Apple? Revoke access in Settings, your name, Sign in with Apple, Otterly.";

    const run = async () => {
      try {
        await deleteAccount();
      } catch {
        const failMsg = "Delete didn't finish. Try again.";
        if (Platform.OS === "web") window.alert(failMsg);
        else Alert.alert("Delete didn't finish", "Try again.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete your account?\n\n${message}`)) await run();
    } else {
      Alert.alert("Delete your account?", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: run },
      ]);
    }
  }, [deleteAccount]);

  const days = stats?.days_this_week ?? 0;
  const streakLine =
    days === 0 ? "This week is still fresh."
    : days === 1 ? "You showed up 1 of 7 days."
    : `You showed up ${days} of 7 days.`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={name ? `Hi, ${name}.` : "You."} />

        <View style={[styles.streakWrap, { backgroundColor: colors.background }]} testID="streak-strip">
          {/* The otter's expression may reflect the present session. It may never
              reflect the user's record. This screen was once titled "Your Progress
              Profile", and mapping mood to streak count put a sleeping otter on it
              after a week away. That is guilt contingency, the Finch mechanic this
              app exists against. At rest, present, always. */}
          <OtterMascot size={110} variant="float" />
          <View style={{ height: spacing.lg }} />
          <StreakStrip daysActive={days} size={44} />
          <Text style={[styles.streakLine, { color: colors.text, fontFamily: fonts.display }]}>
            {streakLine}
          </Text>
          <Text style={[styles.streakSub, { color: colors.textSubtle, fontFamily: fonts.body }]}>
            {stats?.todays_steps ?? 0} step{stats?.todays_steps === 1 ? "" : "s"} today
          </Text>
        </View>

        <View style={styles.content}>
          {status === "authed" && user ? (
            <View
              style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              testID="account-card-authed"
            >
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 16 }}>
                {user.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 }}>
                {user.email}
              </Text>
              <TouchableOpacity
                testID="signout"
                onPress={signOut}
                style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md }}
              >
                <LogOut size={14} color={colors.textSubtle} strokeWidth={1.5} />
                <Text style={{ color: colors.textSubtle, fontFamily: fonts.body, fontSize: 13, marginLeft: 6 }}>
                  Sign out
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              testID="signin"
              onPress={signIn}
              activeOpacity={0.7}
              style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.md }]}
            >
              <View style={[styles.googleBadge, { borderColor: colors.border }]}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 18 }}>G</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 16 }}>
                  Sign in with Google
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
                  Sync across devices. Required to purchase.
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            testID="upgrade-cta"
            onPress={() => router.push("/paywall")}
            activeOpacity={0.7}
            style={[
              styles.upgradeCard,
              {
                backgroundColor: access?.premium ? colors.primarySurface : colors.surface,
                borderColor: access?.premium ? colors.primary : colors.border,
              },
            ]}
          >
            <Sparkles size={18} color={access?.premium ? colors.primary : colors.primary} strokeWidth={1.6} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodySemibold, fontSize: 16 }}>
                {access?.premium ? "Otter Premium — active" : "Otter Premium"}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 }}>
                {access?.premium
                  ? `You're supporting Otterly. Thanks.`
                  : `Free tier: ${access?.limits?.shrinks_today ?? 0} / ${access?.limits?.shrinks_cap ?? 3} shrinks today.`}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSubtle} strokeWidth={1.4} />
          </TouchableOpacity>

          <Text style={[styles.section, { color: colors.textSubtle, fontFamily: fonts.body }]}>
            settings
          </Text>

          <View style={[styles.settingsGroup, { borderColor: colors.border }]}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: fonts.bodySemibold }]}>
                Name
              </Text>
              <TextInput
                testID="settings-name"
                value={name}
                onChangeText={setName}
                placeholder="you"
                placeholderTextColor={colors.textSubtle}
                style={[styles.rowInput, { color: colors.textMuted, fontFamily: fonts.body }]}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: fonts.bodySemibold }]}>
                Reminder time
              </Text>
              <TextInput
                testID="settings-reminder"
                value={reminder}
                onChangeText={setReminder}
                placeholder="20:00"
                placeholderTextColor={colors.textSubtle}
                style={[styles.rowInput, { color: colors.textMuted, fontFamily: fonts.numeric }]}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text, fontFamily: fonts.bodySemibold }]}>
                Dark mode
              </Text>
              <Switch
                testID="settings-dark"
                value={isDark}
                onValueChange={(v) => setMode(v ? "dark" : "light")}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#FFFFFF"
              />
            </View>
            {status === "authed" ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity
                  testID="delete-account"
                  style={styles.row}
                  onPress={handleDeleteAccount}
                >
                  <Text style={[styles.rowLabel, { color: colors.danger, fontFamily: fonts.bodySemibold }]}>
                    Delete account
                  </Text>
                  <ChevronRight size={18} color={colors.danger} strokeWidth={1.4} />
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          <TouchableOpacity
            testID="settings-follow-system"
            onPress={() => setMode("system")}
            style={{ paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm }}
          >
            <Text style={{
              color: mode === "system" ? colors.primary : colors.textSubtle,
              fontFamily: fonts.body,
              fontSize: 13,
            }}>
              {mode === "system" ? "· following your device ·" : "follow device"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  streakWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  streakLine: {
    fontSize: 20,
    lineHeight: 28,
    marginTop: spacing.xl,
    textAlign: "center",
  },
  streakSub: { fontSize: 13, marginTop: 6 },
  content: { paddingHorizontal: spacing.lg },
  accountCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  googleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  section: {
    fontSize: 11,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  settingsGroup: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    minHeight: 56,
  },
  rowLabel: { fontSize: 15 },
  rowInput: {
    fontSize: 15,
    textAlign: "right",
    flex: 1,
    marginLeft: spacing.base,
  },
  divider: { height: 1, marginHorizontal: spacing.base },
});
