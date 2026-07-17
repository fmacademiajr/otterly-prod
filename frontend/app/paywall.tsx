import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Check } from "lucide-react-native";

import { OtterMascot } from "@/src/components/OtterMascot";
import { FadeUp } from "@/src/components/animations";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts, radii, spacing } from "@/src/theme/tokens";
import { useAuth } from "@/src/auth/AuthProvider";
import { revenuecat } from "@/src/lib/revenuecat";
import { api, type AccessSnapshot } from "@/src/lib/api";

type PlanKey = "monthly" | "founding" | "yearly";

const PLAN_ORDER: PlanKey[] = ["monthly", "founding", "yearly"];
const PLAN: Record<PlanKey, { title: string; price: string; unit: string; sub: string; packageIdentifier: string; best?: boolean }> = {
  monthly: {
    title: "Monthly",
    price: "$4.99",
    unit: "/month",
    sub: "Billed monthly.\nCancel anytime.",
    packageIdentifier: "$rc_monthly",
  },
  founding: {
    title: "Founding Otter",
    price: "$29",
    unit: "once",
    sub: "Forever access +\nspecial thanks.",
    packageIdentifier: "$rc_lifetime",
    best: true,
  },
  yearly: {
    title: "Yearly",
    price: "$29.99",
    unit: "/year",
    sub: "Save 50%\nBilled annually.",
    packageIdentifier: "$rc_annual",
  },
};

const FEATURES = [
  "Unlimited focus companions to sit with you",
  "Customizable micro-step workflows & templates",
  "Detailed progress insights & mood tracking",
  "Exclusive gentle sounds and ambient backgrounds",
  "Ad-free, calming experience forever",
];

export default function PaywallScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, status, signIn } = useAuth();
  const [selected, setSelected] = useState<PlanKey>("founding");
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

  useEffect(() => { load(); }, [load]);

  const findPackage = (identifier: string) =>
    packages.find((p) => p.identifier === identifier || p.packageType?.toLowerCase().includes(identifier.replace("$rc_", "")));

  const onBuy = async () => {
    setMessage("");
    if (status !== "authed") {
      setMessage("Sign in first — we need to link your purchase to your account.");
      return;
    }
    const plan = PLAN[selected];
    const pkg = findPackage(plan.packageIdentifier);
    if (!pkg) {
      setMessage(
        !revenuecat.canRunNativeIAP
          ? (revenuecat.isExpoGo
              ? "In-app purchases only work in the built app, not in Expo Go. Publish to test."
              : "In-app purchases only work in the native iOS build.")
          : "Product not configured yet in App Store Connect + RevenueCat."
      );
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.warmBg }]} edges={["top"]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} testID="paywall-close" style={styles.closeBtn}>
          <X color={colors.textMuted} size={22} strokeWidth={1.5} />
        </TouchableOpacity>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <OtterMascot size={140} variant="default" />
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.displayBold }]}>
            One small support keeps Otterly warm.
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Invest in your focus and help Otterly thrive.
          </Text>
        </View>

        {/* Plans — horizontal 3 cards */}
        <View style={styles.planRow}>
          {PLAN_ORDER.map((k, idx) => {
            const p = PLAN[k];
            const active = selected === k;
            return (
              <FadeUp key={k} delay={100 + idx * 80} duration={340} style={{ flex: 1 }}>
                <TouchableOpacity
                  testID={`plan-${k}`}
                  activeOpacity={0.85}
                  onPress={() => setSelected(k)}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: active ? colors.accent : colors.warmBorder,
                      borderWidth: active ? 2 : 1,
                      transform: [{ translateY: active ? -8 : 0 }],
                      zIndex: active ? 2 : 1,
                    },
                  ]}
                >
                  {p.best ? (
                    <View style={[styles.bestPill, { backgroundColor: colors.accent }]}>
                      <Text style={{ color: colors.onAccent, fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 1.5 }}>
                        BEST
                      </Text>
                    </View>
                  ) : null}
                  {k === "founding" ? (
                    <View style={{ alignItems: "center", marginBottom: spacing.sm }}>
                      <OtterMascot size={72} variant="crown" />
                    </View>
                  ) : null}
                  <Text style={[styles.planTitle, { color: k === "founding" ? colors.accent : colors.text, fontFamily: fonts.displayBold }]}>
                    {p.title}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceMain, { color: colors.text, fontFamily: fonts.displayBold }]}>
                      {p.price}
                    </Text>
                    <Text style={[styles.priceUnit, { color: colors.textMuted, fontFamily: fonts.body }]}>
                      {p.unit}
                    </Text>
                  </View>
                  <Text style={[styles.planSub, { color: colors.textMuted, fontFamily: fonts.body }]}>
                    {p.sub}
                  </Text>
                </TouchableOpacity>
              </FadeUp>
            );
          })}
        </View>

        {/* Features */}
        <Text style={[styles.featureHead, { color: colors.text, fontFamily: fonts.bodySemibold }]}>
          What you get with Otterly Premium:
        </Text>
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={[styles.featureDot, { backgroundColor: colors.primary }]}>
                <Check size={12} color={colors.onPrimary} strokeWidth={3} />
              </View>
              <Text style={[styles.featureText, { color: colors.text, fontFamily: fonts.body }]}>
                {f}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: spacing.xl }} />

        {status !== "authed" ? (
          <View>
            <TouchableOpacity
              testID="paywall-signin"
              onPress={signIn}
              style={[styles.primaryCta, { backgroundColor: colors.accent }]}
            >
              <Text style={{ color: colors.onAccent, fontFamily: fonts.bodySemibold, fontSize: 17 }}>
                Sign in to continue
              </Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, textAlign: "center", marginTop: spacing.sm }}>
              Purchases must be linked to your account.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            testID="paywall-buy"
            onPress={onBuy}
            disabled={busy}
            style={[styles.primaryCta, { backgroundColor: colors.accent, opacity: busy ? 0.6 : 1 }]}
          >
            <Text style={{ color: colors.onAccent, fontFamily: fonts.bodySemibold, fontSize: 17 }}>
              {busy ? "…" : "Continue"}
            </Text>
          </TouchableOpacity>
        )}

        {message ? (
          <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, textAlign: "center", marginTop: spacing.md }}>
            {message}
          </Text>
        ) : null}

        <TouchableOpacity
          testID="paywall-restore"
          onPress={onRestore}
          style={{ paddingVertical: spacing.md, alignItems: "center" }}
        >
          <Text style={{ color: colors.primary, fontFamily: fonts.bodySemibold, fontSize: 14 }}>
            Restore purchase
          </Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.textSubtle, fontFamily: fonts.body }]}>
          Payment is processed by Apple. Subscriptions auto-renew unless canceled 24h before the period ends. Manage in Settings › Apple ID › Subscriptions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  closeBtn: { padding: spacing.sm },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: "center", marginTop: spacing.md, marginBottom: spacing.xl },
  title: {
    fontSize: 30,
    lineHeight: 38,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  planRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  planCard: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    minHeight: 200,
    alignItems: "center",
    position: "relative",
  },
  bestPill: {
    position: "absolute",
    top: -14,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    zIndex: 3,
  },
  planTitle: { fontSize: 15, textAlign: "center", marginBottom: spacing.sm },
  priceRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center" },
  priceMain: { fontSize: 22 },
  priceUnit: { fontSize: 12, marginLeft: 2 },
  planSub: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  featureHead: { fontSize: 17, marginBottom: spacing.md, marginTop: spacing.md },
  features: { gap: spacing.md },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureDot: {
    width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center",
  },
  featureText: { fontSize: 15, flex: 1, lineHeight: 20 },
  primaryCta: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  legal: {
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
