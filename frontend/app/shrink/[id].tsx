import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, X, RotateCcw, Play, Pause, Sparkles, Square } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { SoftExit } from "@/src/components/OtterButton";
import { OtterMascot } from "@/src/components/OtterMascot";
import { api, ApiError, type Step, type Task } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";

type Difficulty = "easy" | "medium" | "hard";
const DIFF: Difficulty[] = ["easy", "medium", "hard"];

export default function ShrinkScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(true);
  const [shrinking, setShrinking] = useState(false);
  const [error, setError] = useState<string>("");

  // Timer state
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const tasks = await api.listTasks();
      const t = tasks.find((x) => x.id === id) || null;
      setTask(t);
      if (t?.difficulty) setDifficulty(t.difficulty as Difficulty);
      const s = await api.listSteps(id);
      setSteps(s);
      if (s.length === 0) {
        setShrinking(true);
        try {
          const shrunk = await api.shrinkTask(id, t?.difficulty || "medium");
          setSteps(shrunk);
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 429) setError(e.detail);
        }
        setShrinking(false);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const doShrink = async (d: Difficulty, deep = false) => {
    if (!id) return;
    setDifficulty(d);
    setError("");
    setShrinking(true);
    try {
      const shrunk = await api.shrinkTask(id, d, deep);
      setSteps(shrunk);
    } catch (e: any) {
      if (e instanceof ApiError) {
        setError(e.status === 429 || e.status === 402 ? e.detail : "Something went wrong. Try again.");
      }
    }
    setShrinking(false);
  };
  const deepShrink = () => doShrink(difficulty, true);

  const toggle = async (step: Step) => {
    if (!step.done) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)));
    try {
      await api.toggleStep(step.id, !step.done);
      if (!step.done) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, done: step.done } : s)));
    }
  };

  const startTimer = (step: Step) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveStep(step.id);
    setSecondsLeft(step.minutes * 60);
    setRunning(true);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const pauseResume = () => {
    if (running) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRunning(false);
    } else if (secondsLeft > 0 && activeStep) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      setRunning(true);
    }
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveStep(null);
    setRunning(false);
    setSecondsLeft(0);
  };

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const timerActive = activeStep !== null;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: timerActive ? colors.primary : colors.warmBg }]}
      edges={["top"]}
    >
      {/* TOP: either timer bar (teal, big time, pause/stop) OR simple header (close, re-shrink) */}
      {timerActive ? (
        <View style={styles.timerHeader}>
          <TouchableOpacity
            testID="timer-toggle"
            onPress={pauseResume}
            style={[styles.timerCircle, { backgroundColor: colors.background }]}
          >
            {running
              ? <Pause size={22} color={colors.primary} fill={colors.primary} strokeWidth={0} />
              : <Play size={22} color={colors.primary} fill={colors.primary} strokeWidth={0} />}
          </TouchableOpacity>
          <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
            <OtterMascot size={44} variant="focused" />
            <Text
              testID="timer-text"
              style={[styles.timerText, { color: colors.onPrimary, fontFamily: fonts.numeric }]}
            >
              {mm}:{ss}
            </Text>
          </View>
          <TouchableOpacity
            testID="timer-stop"
            onPress={stopTimer}
            style={[styles.timerCircle, { backgroundColor: colors.background }]}
          >
            <Square size={20} color={colors.primary} fill={colors.primary} strokeWidth={0} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.simpleHeader, { backgroundColor: colors.warmBg }]}>
          <TouchableOpacity onPress={() => router.back()} testID="shrink-close" style={styles.smallBtn}>
            <X color={colors.textMuted} size={22} strokeWidth={1.5} />
          </TouchableOpacity>
          <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
            shrinker
          </Text>
          <TouchableOpacity
            onPress={() => doShrink(difficulty)}
            disabled={shrinking}
            testID="reshrink"
            style={styles.smallBtn}
          >
            <RotateCcw color={colors.textMuted} size={20} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: colors.warmBg }]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.warmBg }}
      >
        {/* Big Fraunces task title */}
        <Text style={[styles.taskTitle, { color: colors.text, fontFamily: fonts.displayBold }]}>
          {task?.title || "…"}
        </Text>

        {/* Difficulty */}
        <View style={styles.diffRow}>
          {DIFF.map((d) => (
            <TouchableOpacity
              key={d}
              testID={`diff-${d}`}
              onPress={() => doShrink(d)}
              disabled={shrinking}
              style={[
                styles.diffBtn,
                { backgroundColor: d === difficulty ? colors.primarySurfaceStrong : colors.warmSurface, borderColor: d === difficulty ? colors.primary : colors.warmBorder },
              ]}
            >
              <Text style={{
                color: d === difficulty ? colors.primary : colors.textMuted,
                fontFamily: d === difficulty ? fonts.bodySemibold : fonts.body,
                fontSize: 15,
              }}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <TouchableOpacity
            testID="shrink-error-upgrade"
            onPress={() => router.push("/paywall")}
            style={[styles.errorBanner, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>
              {error}
            </Text>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 13, marginTop: 6 }}>
              See Otter Premium →
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Micro-steps */}
        {loading || shrinking ? (
          <View style={{ padding: spacing.xl, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, marginTop: spacing.md, fontSize: 14 }}>
              {shrinking ? "shrinking…" : "loading…"}
            </Text>
          </View>
        ) : steps.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", padding: spacing.xl }}>
            No steps yet. Tap the ↻ to shrink.
          </Text>
        ) : (
          steps.map((step, i) => {
            const isActive = activeStep === step.id;
            return (
              <View
                key={step.id}
                testID={`step-${step.id}`}
                style={[
                  styles.stepCard,
                  { backgroundColor: colors.background, borderColor: isActive ? colors.primary : "transparent", borderWidth: isActive ? 1.5 : 0 },
                ]}
              >
                <TouchableOpacity
                  testID={`step-toggle-${step.id}`}
                  onPress={() => toggle(step)}
                  activeOpacity={0.6}
                  style={[
                    styles.checkboxLg,
                    {
                      borderColor: colors.primary,
                      backgroundColor: step.done ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {step.done ? <Check color={colors.onPrimary} size={22} strokeWidth={2.5} /> : null}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.stepText,
                    {
                      color: step.done ? colors.textSubtle : colors.text,
                      fontFamily: fonts.bodySemibold,
                      textDecorationLine: step.done ? "line-through" : "none",
                    },
                  ]}
                >
                  {i + 1}. {step.text}
                </Text>
                <TouchableOpacity
                  testID={`step-timer-${step.id}`}
                  onPress={() => startTimer(step)}
                  disabled={step.done}
                  style={[
                    styles.timerPill,
                    { backgroundColor: step.done ? colors.warmBorder : colors.primarySurfaceStrong },
                  ]}
                >
                  <Play size={11} color={colors.primary} fill={colors.primary} strokeWidth={0} />
                  <Text style={{
                    color: colors.primary,
                    fontFamily: fonts.numeric,
                    fontSize: 13,
                    marginLeft: 4,
                  }}>
                    {step.minutes} min
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Celebration banner when all steps are done */}
        {steps.length > 0 && steps.every((s) => s.done) ? (
          <View style={[styles.celebrateBanner, { backgroundColor: colors.primarySurface, borderColor: colors.primary }]}>
            <OtterMascot size={70} variant="celebrate" />
            <View style={{ flex: 1, marginLeft: spacing.base }}>
              <Text style={{ color: colors.primary, fontFamily: fonts.displayBold, fontSize: 18 }}>
                Every step done.
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, marginTop: 4 }}>
                That&apos;s real. Come back later.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: spacing.lg }} />
        <TouchableOpacity
          testID="deep-shrink"
          onPress={deepShrink}
          disabled={shrinking}
          style={[styles.deepBtn, { borderColor: colors.accent, backgroundColor: colors.accentSurface }]}
        >
          <Sparkles size={14} color={colors.accent} strokeWidth={1.8} />
          <Text style={{
            color: colors.accent,
            fontFamily: fonts.bodySemibold,
            fontSize: 14,
            marginLeft: 6,
          }}>
            Deep Shrink (premium)
          </Text>
        </TouchableOpacity>

        <SoftExit label="Come back later" testID="shrink-back" onPress={() => router.back()} />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  simpleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  timerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: { fontSize: 44, lineHeight: 48, letterSpacing: 2 },
  smallBtn: { padding: spacing.sm },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  taskTitle: { fontSize: 44, lineHeight: 50, marginBottom: spacing.lg, marginTop: spacing.md },
  diffRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  diffBtn: {
    flex: 1,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  checkboxLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1, fontSize: 16, lineHeight: 22 },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 2,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  deepBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  celebrateBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
});
