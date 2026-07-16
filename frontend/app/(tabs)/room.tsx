import { useCallback, useEffect, useRef, useState } from "react";
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
import { useRouter } from "expo-router";
import { Send, LifeBuoy } from "lucide-react-native";

import { WaterWave } from "@/src/components/motifs";
import { api, type RoomMessage } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

const SESSION_KEY = "otterly.roomSession";

function newSessionId() {
  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function RoomScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const listRef = useRef<FlatList<RoomMessage>>(null);

  useEffect(() => {
    (async () => {
      let sid = await storage.getItem<string>(SESSION_KEY, "");
      if (!sid) {
        sid = newSessionId();
        await storage.setItem(SESSION_KEY, sid);
      }
      setSessionId(sid);
      try {
        const hist = await api.roomHistory(sid);
        setMessages(hist);
        setGreeted(hist.length > 0);
      } catch {}
    })();
  }, []);

  const greet = useCallback(async () => {
    if (!sessionId || greeted) return;
    setSending(true);
    try {
      const res = await api.roomSend(sessionId, "(user just opened the room)");
      const otterMsg: RoomMessage = {
        id: `local-${Date.now()}`,
        session_id: sessionId,
        role: "otter",
        text: res.reply,
        created_at: new Date().toISOString(),
      };
      setMessages([otterMsg]);
      setGreeted(true);
    } catch {}
    setSending(false);
  }, [sessionId, greeted]);

  useEffect(() => {
    if (sessionId && !greeted && messages.length === 0) greet();
  }, [sessionId, greeted, messages.length, greet]);

  const send = async () => {
    const clean = text.trim();
    if (!clean || !sessionId) return;
    const optimistic: RoomMessage = {
      id: `local-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      text: clean,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setText("");
    setSending(true);
    try {
      const res = await api.roomSend(sessionId, clean);
      const otterMsg: RoomMessage = {
        id: `local-${Date.now()}-o`,
        session_id: sessionId,
        role: "otter",
        text: res.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, otterMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `local-${Date.now()}-e`,
          session_id: sessionId,
          role: "otter",
          text: "(quiet · I'm here.)",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const newSession = async () => {
    const sid = newSessionId();
    await storage.setItem(SESSION_KEY, sid);
    setSessionId(sid);
    setMessages([]);
    setGreeted(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={64}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
              sit-with-me
            </Text>
            <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
              I'm here.
            </Text>
          </View>
          <TouchableOpacity
            testID="new-session"
            onPress={newSession}
            style={styles.newBtn}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 }}>
              new
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="crisis-link"
          onPress={() => router.push("/crisis")}
          style={[styles.crisisLink, { borderColor: colors.border }]}
        >
          <LifeBuoy size={13} color={colors.textSubtle} strokeWidth={1.6} />
          <Text style={{ color: colors.textSubtle, fontFamily: fonts.body, fontSize: 12, marginLeft: 6 }}>
            If you're in crisis
          </Text>
        </TouchableOpacity>

        <View style={styles.waveWrap}>
          <WaterWave width={220} color={colors.border} />
        </View>

        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View
              testID={`msg-${item.role}`}
              style={[
                styles.bubble,
                item.role === "user"
                  ? { alignSelf: "flex-end", backgroundColor: colors.primarySurface }
                  : { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text
                style={{
                  color: item.role === "user" ? colors.primary : colors.text,
                  fontFamily: item.role === "user" ? fonts.body : fonts.display,
                  fontSize: item.role === "user" ? 15 : 17,
                  lineHeight: 24,
                }}
              >
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            sending ? (
              <View style={{ padding: spacing.md, alignItems: "flex-start" }}>
                <ActivityIndicator color={colors.textSubtle} />
              </View>
            ) : null
          }
        />

        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            testID="room-input"
            value={text}
            onChangeText={setText}
            placeholder="say anything — or nothing"
            placeholderTextColor={colors.textSubtle}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, fontFamily: fonts.body },
            ]}
            multiline
          />
          <TouchableOpacity
            testID="room-send"
            onPress={send}
            disabled={!text.trim() || sending}
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.surfaceMuted },
            ]}
          >
            <Send color={text.trim() ? colors.onPrimary : colors.textSubtle} size={18} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.xs },
  title: { fontSize: 30, lineHeight: 38 },
  newBtn: { padding: spacing.sm },
  waveWrap: { paddingHorizontal: spacing.lg, marginVertical: spacing.md },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  bubble: {
    maxWidth: "82%",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  inputBar: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  crisisLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
});
