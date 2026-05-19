import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { colors } from "../../src/theme";

type IconName = keyof typeof Feather.glyphMap;

const icons: Record<string, IconName> = {
  index: "grid",
  estimate: "bar-chart-2",
  ideas: "layout",
  contractors: "users",
};

const labels: Record<string, string> = {
  index: "Home",
  estimate: "ROI",
  ideas: "Design",
  contractors: "Build",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === "ios" ? 84 : 70,
          paddingBottom: Platform.OS === "ios" ? 26 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0,
          textTransform: "uppercase",
        },
        tabBarAccessibilityLabel: `${labels[route.name] ?? route.name} tab`,
        tabBarIcon: ({ color }) => <Feather name={icons[route.name] ?? "circle"} color={color} size={21} strokeWidth={2.25} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="estimate" options={{ title: "ROI" }} />
      <Tabs.Screen name="ideas" options={{ title: "Design" }} />
      <Tabs.Screen name="contractors" options={{ title: "Build" }} />
    </Tabs>
  );
}
