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
import { Check, X, RotateCcw, Play, Pause, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { OtterButton, SoftExit } from "@/src/components/OtterButton";
import { WaterWave } from "@/src/components/motifs";
import { api, ApiError, type Step, type Task } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";

type Difficulty = "easy" | "medium" | "hard";
const DIFF: Difficulty[] = ["easy", "medium", "hard"];

export default function ShrinkScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id, focusStep } = useLocalSearchParams<{ id: string; focusStep?: string }>();
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
        // auto-shrink first time
        setShrinking(true);
        try {
          const shrunk = await api.shrinkTask(id, t?.difficulty || "medium");
          setSteps(shrunk);
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 429) {
            setError(e.detail);
          }
        }
        setShrinking(false);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

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
        if (e.status === 429 || e.status === 402) {
          setError(e.detail);
        } else {
          setError("Something went wrong. Try again.");
        }
      }
    }
    setShrinking(false);
  };

  const reshrink = () => doShrink(difficulty);
  const deepShrink = () => doShrink(difficulty, true);

  const toggle = async (step: Step) => {
    // haptics for the completion moment
    if (!step.done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    // optimistic
    setSteps((prev) =>
      prev.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s))
    );
    try {
      await api.toggleStep(step.id, !step.done);
      if (!step.done) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      // revert
      setSteps((prev) =>
        prev.map((s) => (s.id === step.id ? { ...s, done: step.done } : s))
      );
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} testID="shrink-close" style={styles.closeBtn}>
          <X color={colors.textMuted} size={22} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          shrinker
        </Text>
        <TouchableOpacity onPress={reshrink} disabled={shrinking} testID="reshrink" style={styles.closeBtn}>
          <RotateCcw color={colors.textMuted} size={20} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.taskTitle, { color: colors.text, fontFamily: fonts.displayBold }]}>
          {task?.title || "…"}
        </Text>
        <WaterWave width={180} color={colors.border} />

        <View style={{ height: spacing.lg }} />

        {/* Difficulty */}
        <Text style={[styles.section, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          how you're feeling
        </Text>
        <View style={[styles.diffRow, { borderColor: colors.border }]}>
          {DIFF.map((d) => (
            <TouchableOpacity
              key={d}
              testID={`diff-${d}`}
              onPress={() => doShrink(d)}
              disabled={shrinking}
              style={[
                styles.diffBtn,
                d === difficulty && { backgroundColor: colors.primarySurface },
              ]}
            >
              <Text style={{
                color: d === difficulty ? colors.primary : colors.textMuted,
                fontFamily: d === difficulty ? fonts.bodySemibold : fonts.body,
                fontSize: 14,
              }}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />

        {/* Timer bar */}
        {activeStep ? (
          <View style={[styles.timerBar, { backgroundColor: colors.primarySurface, borderColor: colors.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.timerLabel, { color: colors.primary, fontFamily: fonts.body }]}>
                focus
              </Text>
              <Text style={[styles.timerText, { color: colors.text, fontFamily: fonts.numeric }]}>
                {mm}:{ss}
              </Text>
            </View>
            <TouchableOpacity testID="timer-toggle" onPress={pauseResume} style={styles.timerBtn}>
              {running ? (
                <Pause size={22} color={colors.primary} />
              ) : (
                <Play size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity testID="timer-stop" onPress={stopTimer} style={styles.timerBtn}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {error ? (
          <TouchableOpacity
            testID="shrink-error-upgrade"
            onPress={() => router.push("/paywall")}
            style={[
              styles.errorBanner,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>
              {error}
            </Text>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 13, marginTop: 6 }}>
              See Otter Premium →
            </Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.section, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          micro-steps
        </Text>

        {loading || shrinking ? (
          <View style={{ padding: spacing.xl, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{
              color: colors.textMuted,
              fontFamily: fonts.body,
              marginTop: spacing.md,
              fontSize: 14,
            }}>
              {shrinking ? "shrinking…" : "loading…"}
            </Text>
          </View>
        ) : steps.length === 0 ? (
          <View style={{ padding: spacing.xl }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>
              No steps yet. Tap the ↻ to shrink.
            </Text>
          </View>
        ) : (
          steps.map((step, i) => {
            const isActive = activeStep === step.id;
            return (
              <View
                key={step.id}
                testID={`step-${step.id}`}
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: isActive ? colors.primarySurface : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  testID={`step-toggle-${step.id}`}
                  onPress={() => toggle(step)}
                  activeOpacity={0.6}
                  style={[
                    styles.checkbox,
                    {
                      borderColor: step.done ? colors.success : colors.border,
                      backgroundColor: step.done ? colors.success : "transparent",
                    },
                  ]}
                >
                  {step.done ? <Check color="#fff" size={14} strokeWidth={2} /> : null}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.stepText,
                      {
                        color: step.done ? colors.textSubtle : colors.text,
                        fontFamily: fonts.body,
                        textDecorationLine: step.done ? "line-through" : "none",
                      },
                    ]}
                  >
                    {i + 1}. {step.text}
                  </Text>
                  <View style={styles.stepMetaRow}>
                    <TouchableOpacity
                      testID={`step-timer-${step.id}`}
                      onPress={() => startTimer(step)}
                      disabled={step.done}
                      style={[
                        styles.minutesPill,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <Play size={11} color={colors.textMuted} strokeWidth={2} />
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontFamily: fonts.numeric,
                          fontSize: 12,
                          marginLeft: 4,
                        }}
                      >
                        {step.minutes} min
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: spacing.lg }} />
        <TouchableOpacity
          testID="deep-shrink"
          onPress={deepShrink}
          disabled={shrinking}
          style={[styles.deepBtn, { borderColor: colors.accent }]}
        >
          <Sparkles size={14} color={colors.accent} strokeWidth={1.8} />
          <Text style={{
            color: colors.accent,
            fontFamily: fonts.bodySemibold,
            fontSize: 13,
            marginLeft: 6,
          }}>
            Deep Shrink (premium)
          </Text>
        </TouchableOpacity>

        <SoftExit
          label="Come back later"
          testID="shrink-back"
          onPress={() => router.back()}
        />
        <View style={{ height: spacing.xxl }} />
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
    paddingBottom: spacing.sm,
  },
  closeBtn: { padding: spacing.sm },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  taskTitle: { fontSize: 26, lineHeight: 34, marginBottom: spacing.md },
  section: {
    fontSize: 11,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: spacing.md,
  },
  diffRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radii.pill,
    padding: 4,
    alignSelf: "flex-start",
  },
  diffBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepText: { fontSize: 16, lineHeight: 22 },
  stepMetaRow: { flexDirection: "row", marginTop: spacing.sm },
  minutesPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  timerBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  timerLabel: { fontSize: 11, letterSpacing: 3, textTransform: "uppercase" },
  timerText: { fontSize: 40, lineHeight: 44 },
  timerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
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
});
