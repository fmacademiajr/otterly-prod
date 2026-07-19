import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";
import { C, useReducedMotion } from "./ui";
import { strings } from "./strings";
import { useOnboardingState } from "./state";
import { Arrival } from "./screens/Arrival";
import { Breath } from "./screens/Breath";
import { OneThing } from "./screens/OneThing";
import { Shrink } from "./screens/Shrink";
import { SitWithMe } from "./screens/SitWithMe";
import { TheWin } from "./screens/TheWin";
import { HowOtterlyBehaves } from "./screens/HowOtterlyBehaves";
import { SafetyPause } from "./screens/SafetyPause";

const EASE = Easing.bezier(0.4, 0, 0.2, 1);

/** One crossfade layer. All screens stay mounted, stacked; only the active one is
 *  visible and interactive. Screens gate their own timers/animations on `active`. */
function Layer({ active, children }: { active: boolean; children: React.ReactNode }) {
  const o = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    o.value = withTiming(active ? 1 : 0, { duration: 700, easing: EASE });
  }, [active, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={[StyleSheet.absoluteFill, style]}
    >
      {children}
    </Animated.View>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const store = useOnboardingState();
  const [step, setStep] = useState(1); // 1..7, or 8 = safety pause
  const [safety, setSafety] = useState<{ message: string } | null>(null);

  // S3 -> S4: create the task, run the Shrinker, and race it against a ~2.5s
  // window. A frozen user cannot wait, so if generation is slow or the device is
  // offline we show a cached universal first step; the real shrink still lands
  // server-side, so the home screen shows the true step.
  const runShrink = async (clean: string) => {
    const fallback = strings.s4.fallbackStep;
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        store.setFirstStep(fallback);
      }
    }, 2500);
    try {
      const task = await api.createTask(clean);
      await storage.setItem("otterly.firstTaskId", task.id);
      const steps = await api.shrinkTask(task.id, "medium");
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        store.setFirstStep((steps && steps[0]?.text) || fallback);
      }
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        store.setFirstStep(fallback);
      }
    }
  };

  const onOk3 = async () => {
    const clean = store.task.trim();
    if (!clean) return;
    // Safety pre-check BEFORE creating or shrinking anything, so a crisis / medical /
    // harm disclosure is never persisted and never gets a fake "first step". If the
    // check is unreachable (offline), fall through — the backend shrink gate still
    // backstops the same classes server-side.
    try {
      const res = await api.classifyTask(clean);
      if (res.category !== "ok") {
        setSafety({ message: res.message });
        setStep(8);
        return;
      }
    } catch {}
    runShrink(clean);
    setStep(4);
  };

  const finish = async (checkins: boolean) => {
    store.setCheckins(checkins);
    try {
      await storage.setItem("otterly.checkins", checkins);
      await storage.setItem("otterly.onboarded", true);
    } catch {}
    router.replace("/(tabs)/next");
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Layer active={step === 1}>
        <Arrival onNext={() => setStep(2)} />
      </Layer>
      <Layer active={step === 2}>
        <Breath active={step === 2} reduced={reduced} onDone={() => setStep(3)} onSkip={() => setStep(3)} />
      </Layer>
      <Layer active={step === 3}>
        <OneThing active={step === 3} value={store.task} onChangeText={store.setTask} onOk={onOk3} />
      </Layer>
      <Layer active={step === 4}>
        <Shrink active={step === 4} firstStep={store.firstStep} reduced={reduced} onNext={() => setStep(5)} />
      </Layer>
      <Layer active={step === 5}>
        <SitWithMe
          active={step === 5}
          firstStep={store.firstStep}
          reduced={reduced}
          onDone={() => {
            store.setDidStep(true);
            setStep(6);
          }}
          onNotNow={() => {
            store.setDidStep(false);
            setStep(6);
          }}
        />
      </Layer>
      <Layer active={step === 6}>
        <TheWin active={step === 6} didStep={store.didStep} reduced={reduced} onNext={() => setStep(7)} />
      </Layer>
      <Layer active={step === 7}>
        <HowOtterlyBehaves onChoose={finish} />
      </Layer>
      <Layer active={step === 8}>
        {safety ? <SafetyPause message={safety.message} onDone={() => finish(false)} /> : null}
      </Layer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
});
