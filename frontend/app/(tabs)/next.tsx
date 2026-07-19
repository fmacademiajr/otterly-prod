import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { EnergyPill } from "@/src/components/EnergyPill";
import { OtterMascot } from "@/src/components/OtterMascot";
import { OtterButton } from "@/src/components/OtterButton";
import { IdleBreath } from "@/src/components/IdleBreath";
import { Atmosphere, useAtmosphere } from "@/src/components/Atmosphere";
import { FadeUp } from "@/src/components/animations";
import { api, type Energy, type NextResponse } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

function CardWave({ color }: { color: string }) {
  return (
    <View style={{ height: 18, width: "100%" }}>
      <Svg width="100%" height="18" viewBox="0 0 300 18" preserveAspectRatio="none">
        <Path
          d="M0 8 Q 30 0, 60 8 T 120 8 T 180 8 T 240 8 T 300 8"
          stroke={color}
          strokeWidth={0.9}
          fill="none"
          opacity={0.6}
        />
        <Path
          d="M0 14 Q 30 6, 60 14 T 120 14 T 180 14 T 240 14 T 300 14"
          stroke={color}
          strokeWidth={0.9}
          fill="none"
          opacity={0.4}
        />
      </Svg>
    </View>
  );
}

export default function NextScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  // The reason band sits on accentSurface, where accent (#D4A24F) fails WCAG AA.
  // #8a6a2e clears it in light mode; dark mode keeps the token.
  const reasonColor = isDark ? colors.accent : "#8a6a2e";
  const atm = useAtmosphere();
  const [energy, setEnergy] = useState<Energy>("medium");
  const [data, setData] = useState<NextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (e: Energy) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.next(e);
      setData(res);
    } catch {
      setError("Otterly couldn't reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const n = await storage.getItem<string>("otterly.userName", "");
      if (n) setName(n);
    })();
  }, []);

  useFocusEffect(useCallback(() => { load(energy); }, [energy, load]));

  const onEnergy = (e: Energy) => {
    setEnergy(e);
    load(e);
  };

  const start = () => {
    if (!data?.step) return;
    router.push({
      pathname: "/shrink/[id]",
      params: { id: data.step.task_id, focusStep: data.step.id },
    });
  };

  const skipForNow = () => router.push("/(tabs)/inbox");

  return (
    <Atmosphere>
    <SafeAreaView style={[styles.safe, { backgroundColor: "transparent" }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(energy); }}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Big greeting + waving otter */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: colors.text, fontFamily: fonts.displayBold }]}>
              {name ? `Hello, ${name}` : "Hello"}
            </Text>
          </View>
          {atm.otter.breathe ? (
            <IdleBreath>
              <OtterMascot size={atm.otter.size} variant={atm.otter.variant} />
            </IdleBreath>
          ) : (
            <OtterMascot size={atm.otter.size} variant={atm.otter.variant} />
          )}
        </View>

        <View style={{ height: spacing.md }} />

        <EnergyPill value={energy} onChange={onEnergy} />

        <View style={{ height: spacing.lg }} />

        {loading && !data ? (
          <View
            style={[styles.card, styles.centered, { borderColor: colors.border }]}
          >
            <ActivityIndicator color={colors.primary} />
            <Text
              style={[styles.reason, { color: colors.textMuted, fontFamily: fonts.body, marginTop: spacing.md }]}
            >
              Picking one small thing…
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.card, { borderColor: colors.border }]}>
            <Text style={[styles.reason, { color: colors.danger, fontFamily: fonts.body }]}>
              {error}
            </Text>
            <View style={{ height: spacing.base }} />
            <OtterButton label="Try again" onPress={() => load(energy)} testID="next-retry" />
          </View>
        ) : data?.empty || !data?.step ? (
          <View style={[styles.card, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]} testID="next-empty">
            <View style={{ alignItems: "center", marginBottom: spacing.base }}>
              <OtterMascot size={100} variant="sleep" />
            </View>
            {/* The eyebrow here read "NOTHING SHRUNK YET" in the same caps slot that
                says "DO THIS NEXT" when a step exists. /next returns empty=True in
                TWO cases (server.py:809-811): nothing added, and every step finished.
                So the person who just cleared their list opened the app and was told,
                in capitals, that they had shrunk nothing. The three lines below already
                do the job without asserting anything false. */}
            <Text
              style={[styles.taskTitle, { color: colors.text, fontFamily: fonts.displayBold }]}
            >
              What&apos;s on your mind?
            </Text>
            <Text style={[styles.parent, { color: colors.textMuted, fontFamily: fonts.body }]}>
              Add one thing you&apos;ve been avoiding.
            </Text>
            <View style={styles.reasonBand}>
              <Text style={[styles.reasonText, { color: reasonColor, fontFamily: fonts.body }]}>
                We&apos;ll shrink it together.
              </Text>
            </View>
            <CardWave color={colors.textSubtle} />
          </View>
        ) : (
          <FadeUp key={data.step.id} duration={360}>
            <View style={[styles.card, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]} testID="next-card">
              <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.bodySemibold }]}>
                DO THIS NEXT
              </Text>
              <Text
                style={[styles.taskTitle, { color: colors.text, fontFamily: fonts.displayBold }]}
                testID="next-step-text"
              >
                {data.step.text}
              </Text>
              <View style={[styles.minutesPill, { backgroundColor: colors.primary }]}>
                <Text style={[styles.minutesText, { color: colors.onPrimary, fontFamily: fonts.numeric }]}>
                  {data.step.minutes} min
                </Text>
              </View>
              {data.task?.title ? (
                <Text
                  style={[styles.parent, { color: colors.textMuted, fontFamily: fonts.body }]}
                  numberOfLines={1}
                >
                  Parent task: {data.task.title}
                </Text>
              ) : null}
              {data.reason ? (
                <View style={[styles.reasonBand, { backgroundColor: colors.accentSurface }]}>
                  <Text style={[styles.reasonText, { color: reasonColor, fontFamily: fonts.body }]}>
                    {data.reason}
                  </Text>
                </View>
              ) : null}
              <CardWave color={colors.textSubtle} />
            </View>
          </FadeUp>
        )}

        <View style={{ height: spacing.xl }} />

        {data?.step ? (
          <TouchableOpacity
            testID="next-start"
            onPress={start}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.onPrimary, fontFamily: fonts.bodySemibold, fontSize: 17 }}>
              Start
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="next-go-inbox"
            onPress={() => router.push("/(tabs)/inbox")}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.onPrimary, fontFamily: fonts.bodySemibold, fontSize: 17 }}>
              Add something
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          testID="next-pick-another"
          onPress={() => load(energy)}
          style={styles.softExit}
        >
          <Text style={{ color: colors.primary, fontFamily: fonts.body, fontSize: 15 }}>
            Not this one. Pick another
          </Text>
        </TouchableOpacity>

        {/* The brief specifies this escape and it was never built. The two exits that
            shipped both fail the moment it matters: "Not this one" re-rolls at the SAME
            energy, so the next pick is no smaller, and "Skip for now" drops you into a
            7-item inbox. Someone frozen on a step they cannot start was offered a
            re-roll at the same difficulty. NEXT_SYSTEM already instructs the model to
            pick the shortest step at low energy, so this is real, not theatre.
            Hidden at low, because the label would be a lie. */}
        {energy !== "low" ? (
          <TouchableOpacity
            testID="next-too-tired"
            onPress={() => onEnergy("low")}
            style={styles.softExit}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 15 }}>
              I&apos;m too tired for this
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          testID="next-skip-for-now"
          onPress={skipForNow}
          style={styles.softExit}
        >
          <Text style={{ color: colors.primary, fontFamily: fonts.body, fontSize: 15 }}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  // The greeting was 44px and the micro-step 26px, so the app rendered its own
  // salutation 1.7x larger than the one thing it exists to deliver. The brief
  // calls this screen "80% of the emotional experience" and names the micro-step
  // the Big Fraunces line. It is now the biggest thing on the screen.
  hello: { fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
    overflow: "hidden",
  },
  centered: { alignItems: "center", justifyContent: "center", minHeight: 220 },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  taskTitle: { fontSize: 32, lineHeight: 39, marginBottom: spacing.md },
  minutesPill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: spacing.base,
  },
  minutesText: { fontSize: 14 },
  parent: { fontSize: 14, marginBottom: spacing.base },
  reasonBand: {
    marginHorizontal: -spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reasonText: { fontSize: 15, lineHeight: 22, fontStyle: "italic" },
  reason: { fontSize: 15, lineHeight: 22 },
  startBtn: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  softExit: { paddingVertical: spacing.md, alignItems: "center" },
});
