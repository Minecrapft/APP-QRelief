import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { Button } from "@/components/ui/Button";
import { MetricCard, Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { theme } from "@/constants/theme";
import { fetchAdminDashboard } from "@/features/admin/operations";
import { useAuth } from "@/providers/AuthProvider";

export default function AdminHomeScreen() {
  const { profile, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);

  useEffect(() => {
    void fetchAdminDashboard().then(setDashboard).catch(() => setDashboard(null));
  }, []);

  const recentActivity = dashboard?.recentActivity ?? [];

  return (
    <Screen
      title="Admin dashboard"
      subtitle={`Signed in as ${profile?.full_name ?? "Administrator"}. Monitor approvals, operations, and reports from one place.`}
    >
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Operations Center"
          title="Relief oversight at a glance"
          subtitle="Track approvals, event readiness, and field activity without jumping between modules."
        />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {[
            { icon: "notifications-active", label: "Live alerts" },
            { icon: "inventory-2", label: "Stock control" },
            { icon: "map", label: "Field visibility" }
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 10, minHeight: 28, borderRadius: theme.radii.sm, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.08)" }}>
              <MaterialIcons name={item.icon as never} size={14} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.textOnDark, fontSize: 12, fontFamily: theme.fonts.ui }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ width: "47%" }}>
          <MetricCard label="Pending approvals" value={dashboard?.kpis.pendingApprovals ?? 0} tone="accent" />
        </View>
        <View style={{ width: "47%" }}>
          <MetricCard label="Active events" value={dashboard?.kpis.activeEvents ?? 0} />
        </View>
        <View style={{ width: "47%" }}>
          <MetricCard label="Low-stock items" value={dashboard?.kpis.lowStockCount ?? 0} />
        </View>
        <View style={{ width: "47%" }}>
          <MetricCard label="Total distributions" value={dashboard?.kpis.totalDistributions ?? 0} />
        </View>
      </View>

      <Panel>
        <SectionHeader
          eyebrow="Quick Actions"
          title="Keep the operation moving"
          subtitle="Jump into the core admin tasks that unblock field teams."
        />
        <Button
          label="Review beneficiary applications"
          onPress={() => router.push("/(admin)/beneficiaries")}
        />
        <Button label="Manage events" onPress={() => router.push("/(admin)/events")} />
        <Button label="Manage inventory" onPress={() => router.push("/(admin)/inventory")} />
        <Button label="Manage staff" onPress={() => router.push("/(admin)/staff")} />
        <Button label="Open reports" onPress={() => router.push("/(admin)/reports")} />
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Recent Activity"
          title="Latest operational updates"
          subtitle="Approvals, stock changes, and distributions appear here as they happen."
        />
        <View style={{ gap: 10 }}>
          {recentActivity.map((entry) => (
            <Pressable
              key={entry.id}
              style={{
                gap: 6,
                padding: 16,
                borderRadius: theme.radii.sm,
                backgroundColor: theme.colors.panel,
                borderWidth: 1,
                borderColor: theme.colors.divider
              }}
            >
              <Text style={{ fontWeight: "800", color: theme.colors.text }}>{entry.type}</Text>
              <Text style={{ color: theme.colors.textMuted }}>{entry.detail}</Text>
              <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
                {new Date(entry.created_at).toLocaleString()}
              </Text>
            </Pressable>
          ))}
          {recentActivity.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>No activity recorded yet.</Text>
          ) : null}
        </View>
      </Panel>

      <Button label="Sign out" onPress={signOut} variant="secondary" />
    </Screen>
  );
}
