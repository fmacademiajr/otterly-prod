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
import { Check, X, Play, Pause, Sparkles, Square } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { SoftExit } from "@/src/components/OtterButton";
import { OtterMascot } from "@/src/components/OtterMascot";
import { FadeUp } from "@/src/components/animations";
import { api, ApiError, type Step, type Task } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";

type Difficulty = "easy" | "medium" | "hard";

// ponytail: one rung down, and "easy" is the floor. A second tap has nowhere to go,
// which is the Binary Choice Rule, not a maximizer's "keep searching" affordance.
const SMALLER: Record<Difficulty, Difficulty | null> = { hard: "medium", medium: "easy", easy: null };

type BannerKind = "" | "upsell" | "confirm" | "retry";

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
  const [banner, setBanner] = useState<BannerKind>("");
  // Carries tooBig too: confirming a 409 must re-send the SAME request plus force,
  // otherwise "Still too big" -> confirm silently re-shrinks without the hint.
  const [pending, setPending] = useState<{ d: Difficulty; deep: boolean; tooBig: boolean } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [tooBigUsed, setTooBigUsed] = useState(false);

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
          // ponytail: was 429-only, so every other failure left an empty screen with no reason.
          if (e instanceof ApiError && (e.status === 429 || e.status === 402)) {
            setBanner("upsell");
            setError(e.detail);
          } else {
            setBanner("retry");
            setError("Otterly could not shrink this one. Nothing is lost.");
          }
        }
        setShrinking(false);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Next tab sends focusStep. It was pushed but never read, so "start this one"
  // dropped you at the top of an undifferentiated list.
  //
  // ponytail: one-shot. `steps` is a dep (we cannot focus a step before it loads),
  // and toggle() replaces the array on every tap, so without this guard every
  // checkbox re-applied focus and yanked activeStep away from a running timer.
  const focusApplied = useRef(false);
  useEffect(() => {
    if (focusApplied.current || !focusStep || !steps.length) return;
    const idx = steps.findIndex((s) => s.id === focusStep);
    if (idx === -1) return;
    focusApplied.current = true;
    setActiveStep(focusStep);
    // Only break the one-at-a-time view if the step we were sent to is actually hidden.
    const firstUndoneIdx = steps.findIndex((s) => !s.done);
    if (firstUndoneIdx !== -1 && idx > firstUndoneIdx && !steps[idx].done) setShowAll(true);
  }, [focusStep, steps]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const doShrink = async (
    d: Difficulty,
    deep = false,
    opts: { force?: boolean; tooBig?: boolean } = {}
  ) => {
    if (!id) return;
    setError("");
    setBanner("");
    setShrinking(true);
    try {
      const shrunk = await api.shrinkTask(id, d, deep, opts);
      setSteps(shrunk);
      // Only on success. A failed "Still too big" must not strand difficulty at a
      // rung the backend never applied, which would hide the button on the retry.
      setDifficulty(d);
      setShowAll(false);
      if (opts.tooBig) setTooBigUsed(true);
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 429 || e.status === 402) {
          setBanner("upsell");
          setError(e.detail);
        } else if (e.status === 409) {
          // ponytail: the banner is already a tappable action surface. No Modal needed.
          setBanner("confirm");
          setPending({ d, deep, tooBig: opts.tooBig ?? false });
          setError(`${e.detail}. Re-shrink anyway?`);
        } else {
          setBanner("retry");
          setError("Otterly could not shrink this one. Nothing is lost.");
        }
      }
    }
    setShrinking(false);
  };
  const deepShrink = () => doShrink(difficulty, true);

  const smaller = SMALLER[difficulty];
  const stillTooBig = () => smaller && doShrink(smaller, false, { tooBig: true });

  // Next-Action Method: only the immediate next physical action is a demand.
  // Finished steps stay visible, they are evidence of competence, not a demand.
  // This is a disclosure and not a deletion, so the externalized list survives.
  const firstUndone = steps.findIndex((s) => !s.done);
  const visibleSteps =
    showAll || firstUndone === -1
      ? steps
      : steps.filter((s, i) => s.done || i <= firstUndone);
  const hiddenCount = steps.length - visibleSteps.length;

  const onBannerPress = () => {
    if (banner === "upsell") return router.push("/paywall");
    if (banner === "confirm" && pending)
      return doShrink(pending.d, pending.deep, { force: true, tooBig: pending.tooBig });
    return doShrink(difficulty);
  };

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
          {/* ponytail: the re-shrink icon lived here and silently destroyed finished
              steps. "Still too big" below the list replaces it, once, with words. */}
          <View style={styles.smallBtn} />
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

        {/* ponytail: the easy/medium/hard pills lived here. They asked a frozen person to
            size a task they had not decomposed yet, and load() auto-shrank on "medium"
            before anyone could tap. That is a decision spent for nothing. */}

        {error ? (
          // ponytail: an upsell, a failure and a confirm are different events. Only the upsell sells.
          <TouchableOpacity
            testID={`shrink-banner-${banner || "retry"}`}
            onPress={onBannerPress}
            style={[styles.errorBanner, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>
              {error}
            </Text>
            <Text style={{ color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 13, marginTop: 6 }}>
              {banner === "upsell" ? "See Otter Premium →" : banner === "confirm" ? "Re-shrink anyway" : "Try again"}
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
          // ponytail: pointed at the ↻ icon, which no longer exists. The banner above
          // now carries the retry, so the empty state only has to be kind.
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", padding: spacing.xl }}>
            No steps yet.
          </Text>
        ) : (
          visibleSteps.map((step, i) => {
            const isActive = activeStep === step.id;
            // Numbering must follow the real list, not the visible slice, or a
            // collapsed list renumbers itself every time a step is finished.
            const stepNo = steps.findIndex((s) => s.id === step.id) + 1;
            return (
              <FadeUp key={step.id} delay={i * 60} duration={320}>
                <View
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
                    {stepNo}. {step.text}
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
              </FadeUp>
            );
          })
        )}

        {hiddenCount > 0 ? (
          <TouchableOpacity
            testID="reveal-rest"
            onPress={() => setShowAll(true)}
            style={styles.revealBtn}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 }}>
              {hiddenCount} more step{hiddenCount > 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* One rung down, once. At "easy" the button is gone, so there is nothing to maximize. */}
        {steps.length > 0 && !tooBigUsed && smaller && !shrinking ? (
          <TouchableOpacity
            testID="still-too-big"
            onPress={stillTooBig}
            style={[styles.tooBigBtn, { borderColor: colors.warmBorder }]}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 }}>
              Still too big
            </Text>
          </TouchableOpacity>
        ) : null}

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

        {/* ponytail: only offered once a shrink worked. Selling a premium tier to someone
            whose shrink just failed monetizes the failure. */}
        {steps.length > 0 ? (
          <>
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
          </>
        ) : null}

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
  revealBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  tooBigBtn: {
    alignSelf: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
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
