import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { theme } from "@/constants/theme";
import { DRRMChat } from "@/components/DRRMChat";

export default function StaffLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.cardBorder,
            height: Platform.OS === "ios" ? 88 : 68,
            paddingBottom: Platform.OS === "ios" ? 30 : 12,
            paddingTop: 12,
            borderTopWidth: 1,
            elevation: 8,
            shadowColor: theme.shadow.shadowColor,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            title: "Scanner",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "qr-code" : "qr-code-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="verify"
          options={{
            title: "Verify",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "checkmark-circle" : "checkmark-circle-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "Activity",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
            ),
          }}
        />
      </Tabs>
      <DRRMChat />
    </>
  );
}
