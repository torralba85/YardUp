import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";

import { colors, radii, spacing, typography } from "../../src/theme";

type IconName = keyof typeof Feather.glyphMap;

const icons: Record<string, IconName> = {
  index: "trending-up",
  estimate: "bar-chart-2",
  contractors: "send",
  guide: "shield",
  ideas: "move",
  inspiration: "image",
};

const labels: Record<string, string> = {
  index: "Home",
  estimate: "Estimate",
  contractors: "Build",
  guide: "Permit",
  ideas: "Studio",
  inspiration: "Ideas",
};

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const sideRail = Platform.OS === "web" && width >= 980;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: sideRail ? colors.mint : colors.emerald,
        tabBarInactiveTintColor: sideRail ? "rgba(237,243,238,0.68)" : colors.muted,
        tabBarActiveBackgroundColor: sideRail ? "rgba(31,157,99,0.2)" : "transparent",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarPosition: sideRail ? "left" : "bottom",
        tabBarVariant: sideRail ? "material" : "uikit",
        tabBarStyle: {
          backgroundColor: colors.rail,
          borderColor: "rgba(255,255,255,0.08)",
          borderRightWidth: sideRail ? 1 : 0,
          borderTopWidth: sideRail ? 0 : 1,
          height: sideRail ? "100%" : Platform.OS === "ios" ? 86 : 72,
          maxWidth: sideRail ? 208 : undefined,
          minWidth: sideRail ? 208 : undefined,
          paddingBottom: sideRail ? spacing.lg : Platform.OS === "ios" ? 25 : 10,
          paddingHorizontal: sideRail ? spacing.sm : 0,
          paddingTop: sideRail ? spacing.xl : 10,
          width: sideRail ? 208 : undefined,
        },
        tabBarItemStyle: {
          borderRadius: radii.md,
          height: sideRail ? 58 : undefined,
          marginHorizontal: sideRail ? spacing.xs : 0,
          marginVertical: sideRail ? 3 : 0,
          paddingHorizontal: sideRail ? spacing.sm : 0,
        },
        tabBarLabelStyle: {
          fontFamily: typography.label.fontFamily,
          fontSize: sideRail ? 13 : 10,
          fontWeight: "700" as const,
          letterSpacing: 0,
          textTransform: "none",
        },
        tabBarAccessibilityLabel: `${labels[route.name] ?? route.name} tab`,
        tabBarIcon: ({ color, focused }) => (
          <Feather name={icons[route.name] ?? "circle"} color={color} size={sideRail ? 20 : 21} strokeWidth={focused ? 2.45 : 2.1} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="estimate" options={{ title: "Estimate" }} />
      <Tabs.Screen name="contractors" options={{ title: "Build" }} />
      <Tabs.Screen name="guide" options={{ title: "Permit" }} />
      <Tabs.Screen name="ideas" options={{ title: "Studio" }} />
      <Tabs.Screen name="inspiration" options={{ href: null }} />
    </Tabs>
  );
}
