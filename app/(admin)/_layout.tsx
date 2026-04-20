import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { theme } from "@/constants/theme";
import { DRRMChat } from "@/components/DRRMChat";

export default function AdminLayout() {
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
        name="beneficiaries"
        options={{
          title: "Applicants",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Staff",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="intelligence"
        options={{
          title: "Intelligence",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "analytics" : "analytics-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null, // Hide Reports from the tab bar but keep it in the stack context
        }}
      />
      <Tabs.Screen
        name="beneficiary/[id]"
        options={{
          href: null, // Dynamic routes should not be in the tab bar
        }}
      />
      <Tabs.Screen
        name="event/[id]"
        options={{
          href: null, // Dynamic routes should not be in the tab bar
        }}
      />
    </Tabs>
    <DRRMChat />
    </>
  );
}
