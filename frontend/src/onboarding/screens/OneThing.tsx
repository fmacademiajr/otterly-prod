import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";
import { C, OnbButton, Screen, tx } from "../ui";
import { strings } from "../strings";
import { fonts } from "@/src/theme/tokens";
import { api, ApiError } from "@/src/lib/api";

// S3 One thing in — Tier 2 begins. Externalize the task: their words, untouched.
// The only screen without a zero-cost exit, so after 20s idle on an empty field
// one tappable pill appears (never more than one, so it cannot read as a list).
export function OneThing({
  active,
  value,
  onChangeText,
  onOk,
}: {
  active: boolean;
  value: string;
  onChangeText: (t: string) => void;
  onOk: () => void;
}) {
  const s = strings.s3;
  const inputRef = useRef<TextInput>(null);
  const [stall, setStall] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micNote, setMicNote] = useState("");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const empty = !value.trim();

  // Keyboard opens on arrival; only when this screen is the active layer.
  useEffect(() => {
    if (!active) {
      inputRef.current?.blur();
      return;
    }
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, [active]);

  // Stall path: 20s idle with an empty field on the active screen.
  useEffect(() => {
    setStall(false);
    if (!active || !empty) return;
    const id = setTimeout(() => setStall(true), 20000);
    return () => clearTimeout(id);
  }, [active, empty]);

  const startMic = async () => {
    setMicNote("");
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setMicNote("Microphone permission is needed for voice.");
        return;
      }
      await recorder.prepareToRecordAsync();
      await recorder.record();
      setRecording(true);
    } catch {
      setMicNote("Couldn't start the recorder.");
    }
  };

  const stopMic = async () => {
    if (!recording) return;
    setRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      setTranscribing(true);
      const res = await api.transcribe(uri);
      onChangeText(value ? `${value.trim()} ${res.text}` : res.text);
    } catch (e: any) {
      setMicNote(e instanceof ApiError && e.status === 429 ? e.detail : "Couldn't transcribe.");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <Screen bg={C.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ height: 34 }} />
        <Text style={tx.kicker}>Just one</Text>
        <Text style={[tx.headlineSmall, { marginTop: 12 }]}>{s.headline}</Text>
        <Text style={[tx.support, { marginTop: 10, marginBottom: 16, maxWidth: undefined }]}>{s.support}</Text>

        <TextInput
          ref={inputRef}
          testID="onb-s3-input"
          value={value}
          onChangeText={onChangeText}
          placeholder={s.placeholder}
          placeholderTextColor={C.inkFaint}
          accessibilityLabel="The one thing you can't start"
          multiline
          style={styles.input}
        />

        <Pressable
          onPressIn={startMic}
          onPressOut={stopMic}
          accessibilityRole="button"
          accessibilityLabel="Hold to say it out loud"
          style={styles.micRow}
        >
          <View style={[styles.dot, recording && { backgroundColor: C.ink }]} />
          <Text style={styles.micText}>
            {recording ? "Listening. Release to add." : transcribing ? "Writing it down…" : s.mic}
          </Text>
        </Pressable>
        {micNote ? <Text style={styles.micNote}>{micNote}</Text> : null}

        <View style={{ flex: 1 }} />

        {stall && empty ? (
          <Pressable
            testID="onb-s3-stall"
            onPress={() => onChangeText(s.stallTask)}
            accessibilityRole="button"
            accessibilityLabel={`Use this as your task: ${s.stallTask}`}
            style={styles.stallPill}
          >
            <Text style={styles.stallText}>{s.stallPill}</Text>
          </Pressable>
        ) : null}

        <OnbButton
          label={s.button}
          onPress={onOk}
          disabled={empty}
          accessibilityLabel="Continue"
          testID="onb-s3-okay"
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    width: "100%",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.body,
    color: C.ink,
    minHeight: 96,
    textAlignVertical: "top",
  },
  micRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.water },
  micText: { color: C.water, fontSize: 14, fontFamily: fonts.body },
  micNote: { color: C.inkSoft, fontSize: 13, fontFamily: fonts.body, textAlign: "center", marginTop: 6 },
  stallPill: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  stallText: { color: C.inkSoft, fontSize: 14, fontFamily: fonts.body },
});
