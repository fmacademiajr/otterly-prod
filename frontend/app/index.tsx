import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "@/src/utils/storage";
import { useTheme } from "@/src/theme/ThemeProvider";

export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    (async () => {
      const done = await storage.getItem<boolean>("otterly.onboarded", false);
      router.replace(done ? "/(tabs)/next" : "/onboarding/welcome");
    })();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
