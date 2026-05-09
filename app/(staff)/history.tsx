import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { MetricCard, Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { theme } from "@/constants/theme";
import { fetchRecentDistributions } from "@/features/staff/distribution";
import { DistributionRecord } from "@/types/domain";

export default function StaffHistoryScreen() {
  const [recentDistributions, setRecentDistributions] = useState<DistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchRecentDistributions()
      .then(setRecentDistributions)
      .catch(() => setRecentDistributions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen
      title="Activity Logs"
      subtitle="View your latest confirmed distributions and field activity summaries."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <View style={{ width: "100%" }}>
          <MetricCard label="Total handoffs" value={recentDistributions.length} tone="accent" />
        </View>
      </View>

      <Panel>
        <SectionHeader
          eyebrow="Distribution History"
          title="Recent Field Activity"
          subtitle="The last 15 distributions you completed are summarized here."
        />
        {loading ? (
          <Text style={{ color: theme.colors.textMuted }}>Loading history...</Text>
        ) : recentDistributions.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>No recent distributions found.</Text>
        ) : (
          recentDistributions.map((distribution) => (
            <View
              key={distribution.id}
              style={{
                gap: 6,
                padding: 16,
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.surfaceMuted,
                borderWidth: 1,
                borderColor: theme.colors.cardBorder,
                marginBottom: 8
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: theme.colors.text, fontSize: 16 }}>
                    {distribution.beneficiary?.full_name ?? "Unknown Beneficiary"}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                    {distribution.event?.title ?? "Unknown Event"}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 12 }}>
                  {new Date(distribution.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontStyle: "italic" }}>
                {new Date(distribution.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </Panel>
    </Screen>
  );
}
