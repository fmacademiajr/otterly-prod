import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Check } from "lucide-react-native";

import { OtterButton, SoftExit } from "@/src/components/OtterButton";
import { OtterGlyph, WaterWave } from "@/src/components/motifs";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { useAuth } from "@/src/auth/AuthProvider";
import { revenuecat } from "@/src/lib/revenuecat";
import { api, type AccessSnapshot } from "@/src/lib/api";

const PLAN_COPY: {
  key: string;
  title: string;
  price: string;
  sub: string;
  best?: boolean;
  packageIdentifier: string; // matches RevenueCat package identifier
}[] = [
  {
    key: "founding",
    title: "Founding Otter",
    price: "$29 once",
    sub: "Lifetime · launch special",
    best: true,
    packageIdentifier: "$rc_lifetime",
  },
  {
    key: "monthly",
    title: "Otter Monthly",
    price: "$4.99",
    sub: "Per month · cancel anytime",
    packageIdentifier: "$rc_monthly",
  },
  {
    key: "yearly",
    title: "Otter Yearly",
    price: "$39",
    sub: "Per year · save 33%",
    packageIdentifier: "$rc_annual",
  },
];

const FEATURES = [
  "Unlimited task shrinks",
  "Deep Shrink (Opus-4-8) for scary tasks",
  "Unlimited braindumps",
  "Unlimited Sit-With-Me time",
  "Cloud sync across devices",
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, status, signIn } = useAuth();
  const [selected, setSelected] = useState<string>("founding");
  const [packages, setPackages] = useState<any[]>([]);
  const [access, setAccess] = useState<AccessSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const [pkgs, acc] = await Promise.all([
        revenuecat.fetchPackages(),
        api.access(),
      ]);
      setPackages(pkgs);
      setAccess(acc);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const findPackage = (identifier: string) =>
    packages.find((p) => p.identifier === identifier || p.packageType?.toLowerCase().includes(identifier.replace("$rc_", "")));

  const onBuy = async () => {
    setMessage("");
    if (status !== "authed") {
      setMessage("Sign in first — we need to link your purchase to your account.");
      return;
    }
    const plan = PLAN_COPY.find((p) => p.key === selected);
    if (!plan) return;
    const pkg = findPackage(plan.packageIdentifier);
    if (!pkg) {
      if (!revenuecat.canRunNativeIAP) {
        setMessage(
          revenuecat.isExpoGo
            ? "In-app purchases only work in the built app, not in Expo Go. Publish to test."
            : "In-app purchases only work in the native iOS build."
        );
      } else {
        setMessage("Product not configured yet in App Store Connect + RevenueCat.");
      }
      return;
    }
    setBusy(true);
    const ok = await revenuecat.purchase(pkg);
    setBusy(false);
    if (ok) {
      setMessage("You're in. Thanks for backing Otterly.");
      setTimeout(() => router.back(), 1200);
    } else {
      setMessage("Purchase didn't complete. Try again in a moment.");
    }
  };

  const onRestore = async () => {
    setBusy(true);
    const ok = await revenuecat.restore();
    setBusy(false);
    setMessage(ok ? "Restored." : "No prior purchase found.");
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} testID="paywall-close" style={styles.closeBtn}>
          <X color={colors.textMuted} size={22} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={[styles.eyebrow, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          otter premium
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <OtterGlyph size={100} color={colors.primary} />
          <View style={{ height: spacing.md }} />
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
            One small support{"\n"}keeps Otterly warm.
          </Text>
          <WaterWave width={180} color={colors.border} />
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={[styles.featureDot, { borderColor: colors.primary }]}>
                <Check size={12} color={colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={[styles.featureText, { color: colors.text, fontFamily: fonts.body }]}>
                {f}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.section, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          choose your plan
        </Text>

        {PLAN_COPY.map((plan) => {
          const active = selected === plan.key;
          return (
            <TouchableOpacity
              key={plan.key}
              testID={`plan-${plan.key}`}
              onPress={() => setSelected(plan.key)}
              activeOpacity={0.7}
              style={[
                styles.plan,
                {
                  backgroundColor: active ? colors.primarySurface : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 1.5 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Text style={[styles.planTitle, { color: colors.text, fontFamily: fonts.bodySemibold }]}>
                    {plan.title}
                  </Text>
                  {plan.best ? (
                    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                      <Text style={{ color: "#fff", fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 1 }}>
                        BEST
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.planSub, { color: colors.textMuted, fontFamily: fonts.body }]}>
                  {plan.sub}
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: colors.text, fontFamily: fonts.numeric }]}>
                {plan.price}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: spacing.lg }} />

        {status !== "authed" ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }}>
              To purchase, sign in first. Your progress transfers automatically.
            </Text>
            <View style={{ height: spacing.md }} />
            <OtterButton label="Sign in with Google" testID="paywall-signin" onPress={signIn} />
          </View>
        ) : (
          <OtterButton
            label={busy ? "…" : "Continue"}
            testID="paywall-buy"
            onPress={onBuy}
            loading={busy}
          />
        )}

        {message ? (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: fonts.body,
              fontSize: 13,
              textAlign: "center",
              marginTop: spacing.md,
            }}
          >
            {message}
          </Text>
        ) : null}

        <SoftExit label="Restore purchase" testID="paywall-restore" onPress={onRestore} />

        <Text
          style={[
            styles.legal,
            { color: colors.textSubtle, fontFamily: fonts.body },
          ]}
        >
          Payment is processed by Apple. Subscriptions auto-renew unless canceled 24h before the period ends. Manage in Settings › Apple ID › Subscriptions.
        </Text>
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
  },
  closeBtn: { padding: spacing.sm },
  eyebrow: { fontSize: 12, letterSpacing: 4, textTransform: "uppercase" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
  title: { fontSize: 28, lineHeight: 36, textAlign: "center", marginBottom: spacing.base },
  features: { marginTop: spacing.lg, marginBottom: spacing.xl, gap: spacing.md },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  featureText: { fontSize: 15 },
  section: {
    fontSize: 11, letterSpacing: 4, textTransform: "uppercase", marginBottom: spacing.md,
  },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  planTitle: { fontSize: 16 },
  planSub: { fontSize: 13, marginTop: 2 },
  planPrice: { fontSize: 20 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  notice: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  legal: {
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
});
