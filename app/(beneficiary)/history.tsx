import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Screen } from "@/components/ui/Screen";
import { fetchBeneficiaryClaimHistory } from "@/features/beneficiary/portal";
import { DistributionRecord } from "@/types/domain";

export default function BeneficiaryHistoryScreen() {
  const [history, setHistory] = useState<DistributionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchBeneficiaryClaimHistory()
      .then(setHistory)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load claim history.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen
      title="Claim history"
      subtitle="Review the distributions you have already received, including dates and item quantities."
    >
      {loading ? <LoadingState label="Loading claim history..." /> : null}
      {error ? <InlineMessage tone="error" message={error} /> : null}
      {!loading && !error && history.length === 0 ? (
        <EmptyState
          title="No claims yet"
          message="Once you receive relief items, your claim history will appear here."
        />
      ) : null}

      <View style={{ gap: 14 }}>
        {history.map((entry) => (
          <View key={entry.id} style={{ gap: 8, padding: 18, borderRadius: 18, backgroundColor: "#ffffff" }}>
            <Text style={{ fontWeight: "800", color: "#052e16" }}>
              {entry.event?.title ?? entry.event_id}
            </Text>
            <Text style={{ color: "#166534" }}>{new Date(entry.distributed_at).toLocaleString()}</Text>
            {entry.items.map((item, index) => (
              <Text key={`${entry.id}-${index}`} style={{ color: "#166534" }}>
                {item.item_name} x{item.quantity} {item.unit}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
