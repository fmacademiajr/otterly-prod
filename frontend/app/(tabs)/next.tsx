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

import { EnergyPill } from "@/src/components/EnergyPill";
import { OtterButton, SoftExit } from "@/src/components/OtterButton";
import { OtterGlyph, WaterWave } from "@/src/components/motifs";
import { api, type Energy, type NextResponse } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

export default function NextScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [energy, setEnergy] = useState<Energy>("medium");
  const [data, setData] = useState<NextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");

  const load = useCallback(
    async (e: Energy) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.next(e);
        setData(res);
      } catch (err: any) {
        setError("Otterly couldn't reach the server. Try again in a moment.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      const n = await storage.getItem<string>("otterly.userName", "");
      if (n) setName(n);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(energy);
    }, [energy, load])
  );

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

  const notThis = () => load(energy);

  const emptyGoToInbox = () => router.push("/(tabs)/inbox");

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(energy);
            }}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.hello, { color: colors.textSubtle, fontFamily: fonts.body }]}>
              hello{name ? "," : ""}
            </Text>
            {name ? (
              <Text
                style={[styles.name, { color: colors.text, fontFamily: fonts.displayBold }]}
              >
                {name}
              </Text>
            ) : (
              <Text
                style={[styles.name, { color: colors.text, fontFamily: fonts.displayBold }]}
              >
                let's start small.
              </Text>
            )}
          </View>
          <OtterGlyph size={72} color={colors.primary} />
        </View>

        <View style={{ height: spacing.xl }} />

        <Text style={[styles.energyLabel, { color: colors.textMuted, fontFamily: fonts.body }]}>
          how's your energy?
        </Text>
        <EnergyPill value={energy} onChange={onEnergy} />

        <View style={{ height: spacing.xl }} />

        {loading && !data ? (
          <View style={[styles.card, styles.centered, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text
              style={[
                styles.reason,
                { color: colors.textMuted, fontFamily: fonts.body, marginTop: spacing.md },
              ]}
            >
              Picking one small thing…
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reason, { color: colors.danger, fontFamily: fonts.body }]}>
              {error}
            </Text>
            <View style={{ height: spacing.base }} />
            <OtterButton label="Try again" onPress={() => load(energy)} testID="next-retry" />
          </View>
        ) : data?.empty || !data?.step ? (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            testID="next-empty"
          >
            <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
              nothing shrunk yet
            </Text>
            <Text style={[styles.taskTitle, { color: colors.text, fontFamily: fonts.displayBold }]}>
              What's on your mind?
            </Text>
            <Text style={[styles.reason, { color: colors.textMuted, fontFamily: fonts.body }]}>
              Add one thing you've been avoiding. We'll shrink it together.
            </Text>
            <View style={{ height: spacing.lg }} />
            <OtterButton
              label="Add something"
              testID="next-go-inbox"
              onPress={emptyGoToInbox}
            />
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            testID="next-card"
          >
            <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
              do this next
            </Text>
            <Text
              style={[styles.taskTitle, { color: colors.text, fontFamily: fonts.displayBold }]}
              testID="next-step-text"
            >
              {data.step.text}
            </Text>

            <View style={styles.metaRow}>
              <View style={[styles.minutesPill, { backgroundColor: colors.primarySurface }]}>
                <Text style={[styles.minutesText, { color: colors.primary, fontFamily: fonts.numeric }]}>
                  {data.step.minutes} min
                </Text>
              </View>
              {data.task?.title ? (
                <Text
                  style={[styles.taskMeta, { color: colors.textMuted, fontFamily: fonts.body }]}
                  numberOfLines={1}
                >
                  from · {data.task.title}
                </Text>
              ) : null}
            </View>

            {data.reason ? (
              <Text
                style={[styles.reason, { color: colors.textMuted, fontFamily: fonts.body }]}
              >
                {data.reason}
              </Text>
            ) : null}

            <View style={styles.waveRow}>
              <WaterWave width={220} color={colors.border} />
            </View>

            <OtterButton label="Start" testID="next-start" onPress={start} />
            <SoftExit label="Not this — pick another" testID="next-pick-another" onPress={notThis} />
            <TouchableOpacity
              testID="next-too-tired"
              onPress={() => onEnergy("low")}
              style={{ alignItems: "center", paddingVertical: spacing.xs }}
            >
              <Text style={[styles.tiredLink, { color: colors.textSubtle, fontFamily: fonts.body }]}>
                I'm too tired for this
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hello: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.xs },
  name: { fontSize: 32, lineHeight: 40, maxWidth: 240 },
  energyLabel: { fontSize: 13, marginBottom: spacing.md, letterSpacing: 0.5 },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  centered: { alignItems: "center", justifyContent: "center", minHeight: 220 },
  eyebrow: { fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.md },
  taskTitle: { fontSize: 26, lineHeight: 34, marginBottom: spacing.base },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.base },
  minutesPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
  minutesText: { fontSize: 13 },
  taskMeta: { fontSize: 13, flexShrink: 1 },
  reason: { fontSize: 15, lineHeight: 22 },
  waveRow: { alignItems: "center", marginVertical: spacing.lg },
  tiredLink: { fontSize: 13 },
});
