import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { theme } from "@/constants/theme";
import { DRRMChat } from "@/components/DRRMChat";

export default function BeneficiaryLayout() {
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
          name="qr"
          options={{
            title: "QR Pass",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "qr-code" : "qr-code-outline"} size={22} color={color} />
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
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            ),
          }}
        />
        
        {/* Hidden Screens */}
        <Tabs.Screen
          name="pending"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
      <DRRMChat />
    </>
  );
}
