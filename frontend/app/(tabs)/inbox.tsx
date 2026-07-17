import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Plus, Trash2, Sparkles, Mic, MicOff } from "lucide-react-native";
import { AudioModule, RecordingPresets, useAudioRecorder } from "expo-audio";

import { api, ApiError, type Task } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";

export default function InboxScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);

  // The inbox IS a menu, you pick one task from many, so the choice-overload
  // threshold applies here. Revealed on tap, never silently dropped: a task you
  // typed and cannot find is worse than a long list.
  const TASK_CAP = 7;
  const [text, setText] = useState("");
  const [dumping, setDumping] = useState(false);
  const [mode, setMode] = useState<"quick" | "dump">("quick");
  const [error, setError] = useState("");
  const [referral, setReferral] = useState("");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const load = useCallback(async () => {
    try {
      const list = await api.listTasks();
      setTasks(list);
    } catch {
      setError("Couldn't reach the server.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addOne = async () => {
    const clean = text.trim();
    if (!clean) return;
    setError("");
    try {
      await api.createTask(clean);
      setText("");
      load();
    } catch {
      setError("Couldn't save. Try again.");
    }
  };

  const visibleTasks = showAllTasks ? tasks : tasks.slice(0, TASK_CAP);
  const hiddenTasks = tasks.length - visibleTasks.length;

  const braindump = async () => {
    const clean = text.trim();
    if (!clean) return;
    setDumping(true);
    setError("");
    try {
      const res = await api.braindump(clean);
      for (const t of res.tasks) {
        await api.createTask(t);
      }
      setText("");
      setReferral(res.referral || "");
      load();
    } catch (e: any) {
      setError(e instanceof ApiError && e.status === 429 ? e.detail : "Braindump failed. Try again.");
    } finally {
      setDumping(false);
    }
  };

  const del = async (id: string) => {
    await api.deleteTask(id);
    load();
  };

  const toggleRecord = async () => {
    setError("");
    if (recording) {
      try {
        await recorder.stop();
        const uri = recorder.uri;
        setRecording(false);
        if (!uri) return;
        setTranscribing(true);
        const res = await api.transcribe(uri);
        setText((prev) => (prev ? `${prev.trim()} ${res.text}` : res.text));
      } catch (e: any) {
        setError(e instanceof ApiError && e.status === 429 ? e.detail : "Couldn't transcribe.");
      } finally {
        setTranscribing(false);
      }
      return;
    }
    // Start
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission is needed for voice notes.");
        return;
      }
      await recorder.prepareToRecordAsync();
      await recorder.record();
      setRecording(true);
    } catch {
      setError("Couldn't start the recorder.");
    }
  };

  const open = (task: Task) => {
    router.push({ pathname: "/shrink/[id]", params: { id: task.id } });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.warmBg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Centered Fraunces title */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
            Inbox
          </Text>
        </View>

        {/* Segmented pill: Quick add | Braindump */}
        <View style={[styles.segmented, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]}>
          <TouchableOpacity
            testID="mode-quick"
            style={[
              styles.segBtn,
              mode === "quick" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setMode("quick")}
          >
            <Text style={{
              color: mode === "quick" ? colors.onPrimary : colors.textMuted,
              fontFamily: fonts.bodySemibold,
              fontSize: 14,
            }}>
              Quick add
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="mode-braindump"
            style={[
              styles.segBtn,
              mode === "dump" && { backgroundColor: colors.primary },
            ]}
            onPress={() => setMode("dump")}
          >
            <Text style={{
              color: mode === "dump" ? colors.onPrimary : colors.textMuted,
              fontFamily: fonts.bodySemibold,
              fontSize: 14,
            }}>
              Braindump
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input */}
        {mode === "quick" ? (
          <View style={styles.inputRow}>
            <TextInput
              testID="quick-add-input"
              value={text}
              onChangeText={setText}
              placeholder="One thing…"
              placeholderTextColor={colors.textSubtle}
              style={[styles.quickInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.warmBorder, fontFamily: fonts.body }]}
            />
            <TouchableOpacity
              testID="quick-add-btn"
              onPress={addOne}
              disabled={!text.trim()}
              style={[
                styles.addBtn,
                { backgroundColor: text.trim() ? colors.primary : colors.warmBorder },
              ]}
            >
              <Plus color={text.trim() ? colors.onPrimary : colors.textSubtle} size={22} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <TextInput
              testID="braindump-input"
              value={text}
              onChangeText={setText}
              placeholder={transcribing ? "Transcribing…" : "Just let it all out…"}
              placeholderTextColor={colors.textSubtle}
              multiline
              editable={!recording && !transcribing}
              style={[styles.dumpInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.warmBorder, fontFamily: fonts.body }]}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.base }}>
              <TouchableOpacity
                testID="voice-record"
                onPress={toggleRecord}
                disabled={transcribing}
                style={[
                  styles.micBtn,
                  { backgroundColor: recording ? colors.danger : colors.warmSurface, borderColor: colors.warmBorder },
                ]}
              >
                {recording
                  ? <MicOff color={colors.onPrimary} size={20} strokeWidth={1.8} />
                  : <Mic color={colors.textMuted} size={20} strokeWidth={1.8} />}
              </TouchableOpacity>
              <TouchableOpacity
                testID="braindump-btn"
                onPress={braindump}
                disabled={!text.trim() || dumping}
                style={[
                  styles.sortBtn,
                  { flex: 1, backgroundColor: text.trim() ? colors.primary : colors.warmBorder },
                ]}
              >
                <Text style={{
                  color: text.trim() ? colors.onPrimary : colors.textSubtle,
                  fontFamily: fonts.bodySemibold,
                  fontSize: 16,
                }}>
                  {dumping ? "sorting…" : "Sort it out"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error ? (
          <Text style={[styles.error, { color: colors.danger, fontFamily: fonts.body }]}>{error}</Text>
        ) : null}

        {referral ? (
          <View
            testID="braindump-referral"
            style={[styles.referral, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>
              {referral}
            </Text>
          </View>
        ) : null}

        {/* ponytail: "Today's Focus" headed a list that is neither today's nor a focus.
            It was the whole inbox wearing a promise the app does not keep. */}
        <View style={[styles.divider, { backgroundColor: colors.warmBorder }]} />

        <FlatList
          contentContainerStyle={styles.list}
          data={visibleTasks}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`inbox-task-${item.id}`}
              onPress={() => open(item)}
              activeOpacity={0.6}
              style={styles.taskItem}
            >
              <View style={[styles.itemCheckbox, { borderColor: colors.textSubtle }]} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.bodySemibold,
                    fontSize: 16,
                    lineHeight: 22,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
              {item.shrunk ? (
                <Sparkles size={14} color={colors.primary} strokeWidth={1.5} />
              ) : null}
              <TouchableOpacity
                testID={`del-${item.id}`}
                onPress={() => del(item.id)}
                hitSlop={12}
                style={{ marginLeft: spacing.sm, padding: 4 }}
              >
                <Trash2 size={16} color={colors.textSubtle} strokeWidth={1.4} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => (
            <View style={[styles.itemDivider, { backgroundColor: colors.warmBorder }]} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: fonts.body }]}>
                Empty is okay too.
              </Text>
            </View>
          }
          ListFooterComponent={
            hiddenTasks > 0 ? (
              <TouchableOpacity testID="inbox-reveal-rest" onPress={() => setShowAllTasks(true)} style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: fonts.body }]}>
                  {hiddenTasks} more waiting
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: { alignItems: "center", paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 28, lineHeight: 36 },
  segmented: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  segBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  inputRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickInput: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 52,
  },
  dumpInput: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: "top",
    marginBottom: spacing.base,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  sortBtn: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontSize: 13, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  referral: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  section: {
    fontSize: 22,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  divider: { height: 1, marginHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.base,
    gap: spacing.md,
  },
  itemCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  itemDivider: { height: 1, marginHorizontal: 0 },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyText: { fontSize: 15 },
});
