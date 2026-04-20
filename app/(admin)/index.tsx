import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { MetricCard, Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { SignOutAction } from "@/components/ui/SignOutAction";
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
      action={<SignOutAction onConfirm={signOut} />}
    >
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Operations Center"
          title="Relief oversight at a glance"
          subtitle="Track approvals, event readiness, and field activity without jumping between modules."
        />
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
          eyebrow="Secondary Actions"
          title="Operational reports"
          subtitle="Generate and view detailed reports on distributions and inventory."
        />
        <Button label="Open reports" onPress={() => router.push("/(admin)/reports")} variant="secondary" />
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
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.surfaceMuted,
                borderWidth: 1,
                borderColor: theme.colors.cardBorder
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
    </Screen>
  );
}
