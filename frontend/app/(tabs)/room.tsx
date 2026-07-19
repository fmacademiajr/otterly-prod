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
import { Send, LifeBuoy } from "lucide-react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { api, type RoomMessage } from "@/src/lib/api";
import { OtterMascot } from "@/src/components/OtterMascot";
import { IdleBreath } from "@/src/components/IdleBreath";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { storage } from "@/src/utils/storage";

const SESSION_KEY = "otterly.roomSession";

function newSessionId() {
  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function WaveDivider() {
  const { colors } = useTheme();
  return (
    <View style={{ height: 32, width: "100%" }}>
      <Svg width="100%" height="32" viewBox="0 0 400 32" preserveAspectRatio="none">
        <Path
          d="M0 16 Q 100 -2, 200 16 T 400 16"
          stroke={colors.tealBandBorder}
          strokeWidth={1.2}
          fill="none"
        />
      </Svg>
    </View>
  );
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
      setMessages([{
        id: `local-${Date.now()}`,
        session_id: sessionId,
        role: "otter",
        text: res.reply,
        created_at: new Date().toISOString(),
      }]);
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
      setMessages((m) => [...m, {
        id: `local-${Date.now()}-o`,
        session_id: sessionId,
        role: "otter",
        text: res.reply,
        created_at: new Date().toISOString(),
      }]);
    } catch {
      setMessages((m) => [...m, {
        id: `local-${Date.now()}-e`,
        session_id: sessionId,
        role: "otter",
        text: "(quiet · I'm here.)",
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={64}
      >
        {/* Teal-tinted hero band */}
        <View style={[styles.band, { backgroundColor: colors.tealBand }]}>
          <TouchableOpacity
            testID="crisis-link"
            onPress={() => router.push("/crisis")}
            style={[styles.crisisPill, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <LifeBuoy size={14} color={colors.danger} strokeWidth={2} />
            <Text style={{ color: colors.text, fontFamily: fonts.body, fontSize: 13, marginLeft: 6 }}>
              If you&apos;re in crisis
            </Text>
          </TouchableOpacity>

          <IdleBreath>
            <OtterMascot size={150} variant="working" />
          </IdleBreath>

          <Text
            testID="room-title"
            style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}
          >
            I&apos;m here.
          </Text>
        </View>

        <WaveDivider />

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
                  color: item.role === "user" ? colors.text : colors.text,
                  fontFamily: fonts.display,
                  fontSize: 16,
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
            placeholder="say anything, or nothing"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, { color: colors.text, fontFamily: fonts.body }]}
            multiline
          />
          <TouchableOpacity
            testID="room-send"
            onPress={send}
            disabled={!text.trim() || sending}
            style={styles.sendBtn}
          >
            <Send color={text.trim() ? colors.primary : colors.textSubtle} size={22} strokeWidth={1.6} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  band: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  crisisPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  title: { fontSize: 32, lineHeight: 40, marginTop: 0 },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  bubble: {
    maxWidth: "82%",
    borderRadius: radii.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  inputBar: {
    flexDirection: "row",
    padding: spacing.md,
    borderTopWidth: 1,
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
