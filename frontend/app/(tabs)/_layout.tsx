import { Tabs } from "expo-router";
import { Mail, TrendingUp, Home, User } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme/ThemeProvider";
import { fonts } from "@/src/theme/tokens";

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.body,
          fontSize: 11,
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="next"
        options={{
          title: "Next",
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={22} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => <Mail color={color} size={22} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="room"
        options={{
          title: "Room",
          tabBarIcon: ({ color }) => <Home color={color} size={22} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ color }) => <User color={color} size={22} strokeWidth={1.6} />,
        }}
      />
    </Tabs>
  );
}
