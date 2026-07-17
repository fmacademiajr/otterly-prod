import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { useOtterFonts } from "@/src/hooks/use-otter-fonts";
import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";
import { AuthProvider, useAuth } from "@/src/auth/AuthProvider";
import { revenuecat } from "@/src/lib/revenuecat";
import { initSentry, setUser as setSentryUser } from "@/src/lib/observability";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();
initSentry();

function RevenueCatBootstrap() {
  const { user } = useAuth();
  useEffect(() => {
    revenuecat.initRevenueCat(user?.user_id);
    setSentryUser(user?.user_id ?? null);
  }, [user?.user_id]);
  return null;
}

function ThemedStack() {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade",
        }}
      />
      <RevenueCatBootstrap />
    </View>
  );
}

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  const [otterLoaded, otterError] = useOtterFonts();

  const ready = (iconsLoaded || iconsError) && (otterLoaded || otterError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
