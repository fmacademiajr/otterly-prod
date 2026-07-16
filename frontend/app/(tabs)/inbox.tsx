import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import { Plus, Trash2, Sparkles } from "lucide-react-native";

import { OtterButton, SoftExit } from "@/src/components/OtterButton";
import { api, type Task } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";

export default function InboxScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState("");
  const [dumping, setDumping] = useState(false);
  const [mode, setMode] = useState<"quick" | "dump">("quick");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const list = await api.listTasks();
      setTasks(list);
    } catch {
      setError("Couldn't reach the server.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
      load();
    } catch {
      setError("Braindump failed. Try again.");
    } finally {
      setDumping(false);
    }
  };

  const del = async (id: string) => {
    await api.deleteTask(id);
    load();
  };

  const open = (task: Task) => {
    router.push({ pathname: "/shrink/[id]", params: { id: task.id } });
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
            inbox
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
            Anything you're avoiding.
          </Text>
        </View>

        <View style={[styles.modeRow, { borderColor: colors.border }]}>
          <TouchableOpacity
            testID="mode-quick"
            style={[styles.modeBtn, mode === "quick" && { backgroundColor: colors.primarySurface }]}
            onPress={() => setMode("quick")}
          >
            <Text style={{
              color: mode === "quick" ? colors.primary : colors.textMuted,
              fontFamily: mode === "quick" ? fonts.bodySemibold : fonts.body,
              fontSize: 14,
            }}>
              Quick add
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="mode-braindump"
            style={[styles.modeBtn, mode === "dump" && { backgroundColor: colors.primarySurface }]}
            onPress={() => setMode("dump")}
          >
            <Text style={{
              color: mode === "dump" ? colors.primary : colors.textMuted,
              fontFamily: mode === "dump" ? fonts.bodySemibold : fonts.body,
              fontSize: 14,
            }}>
              Braindump
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            testID={mode === "quick" ? "quick-add-input" : "braindump-input"}
            value={text}
            onChangeText={setText}
            placeholder={
              mode === "quick"
                ? "One thing…"
                : "Pour it all out. We'll sort it."
            }
            placeholderTextColor={colors.textSubtle}
            multiline={mode === "dump"}
            style={[
              styles.input,
              mode === "dump" && { minHeight: 140, textAlignVertical: "top" },
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                fontFamily: fonts.body,
              },
            ]}
          />
          {mode === "quick" ? (
            <TouchableOpacity
              testID="quick-add-btn"
              onPress={addOne}
              disabled={!text.trim()}
              style={[
                styles.addBtn,
                { backgroundColor: text.trim() ? colors.primary : colors.surfaceMuted },
              ]}
            >
              <Plus color={text.trim() ? colors.onPrimary : colors.textSubtle} size={20} />
            </TouchableOpacity>
          ) : null}
        </View>

        {mode === "dump" ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
            <OtterButton
              label={dumping ? "sorting…" : "Sort it out"}
              testID="braindump-btn"
              onPress={braindump}
              loading={dumping}
              disabled={!text.trim() || dumping}
            />
          </View>
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: colors.danger, fontFamily: fonts.body }]}>
            {error}
          </Text>
        ) : null}

        <FlatList
          contentContainerStyle={styles.listContent}
          data={tasks}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`inbox-task-${item.id}`}
              onPress={() => open(item)}
              activeOpacity={0.7}
              style={[
                styles.taskItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: fonts.body,
                    fontSize: 16,
                    lineHeight: 22,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.textSubtle, fontFamily: fonts.body }]}>
                  {item.shrunk ? "shrunk · tap to open" : "not shrunk yet · tap to shrink"}
                </Text>
              </View>
              {item.shrunk ? (
                <Sparkles size={16} color={colors.primary} strokeWidth={1.5} />
              ) : null}
              <TouchableOpacity
                testID={`del-${item.id}`}
                onPress={() => del(item.id)}
                hitSlop={12}
                style={{ marginLeft: spacing.md }}
              >
                <Trash2 size={18} color={colors.textSubtle} strokeWidth={1.4} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: fonts.body }]}>
                Empty is okay too.
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.xs },
  title: { fontSize: 26, lineHeight: 34 },
  modeRow: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    padding: 4,
    marginBottom: spacing.md,
    alignSelf: "flex-start",
  },
  modeBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  inputWrap: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 52,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontSize: 13, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  itemMeta: { fontSize: 12, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: spacing.xxl },
  emptyText: { fontSize: 15 },
});
