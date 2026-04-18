import { Share, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { fetchAdminReports } from "@/features/admin/operations";

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<Awaited<ReturnType<typeof fetchAdminReports>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAdminReports()
      .then(setReports)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports.")
      )
      .finally(() => setLoading(false));
  }, []);

  const exportText = useMemo(() => {
    if (!reports) {
      return "No report data available.";
    }

    const trendLines = reports.distributionTrends
      .map((entry) => `${entry.day}: ${entry.count}`)
      .join("\n");

    return [
      "QRelief Admin Report",
      "",
      "Event Summary",
      ...reports.eventSummary.map(
        (entry) =>
          `${entry.event.title}: ${entry.totalDistributions} distributions, ${entry.beneficiariesServed} beneficiaries served`
      ),
      "",
      "Low Stock",
      ...reports.inventoryReport.lowStockItems.map(
        (entry) => `${entry.name}: ${entry.current_stock}/${entry.low_stock_threshold}`
      ),
      "",
      "Staff Activity",
      ...reports.staffActivity.map(
        (entry) =>
          `${entry.staff.profile?.full_name ?? entry.staff.id}: ${entry.totalDistributions} distributions`
      ),
      "",
      "Distribution Trends",
      trendLines
    ].join("\n");
  }, [reports]);

  const shareReport = async () => {
    await Share.share({ message: exportText });
  };

  return (
    <Screen
      title="Reports"
      subtitle="Review event outcomes, inventory health, staff throughput, and distribution trends."
    >
      {loading ? <LoadingState label="Loading reports..." /> : null}
      {error ? <InlineMessage tone="error" message={error} /> : null}
      {!loading && !error && !reports ? (
        <EmptyState
          title="No report data yet"
          message="Reports will populate once events, stock activity, and distributions have been recorded."
        />
      ) : null}

      <Button label="Export report summary" onPress={shareReport} />

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Event summary report</Text>
      <View style={{ gap: 10 }}>
        {(reports?.eventSummary ?? []).map((entry) => (
          <View key={entry.event.id} style={{ gap: 6, padding: 16, borderRadius: 18, backgroundColor: "#ffffff" }}>
            <Text style={{ fontWeight: "800", color: "#052e16" }}>{entry.event.title}</Text>
            <Text style={{ color: "#166534" }}>Beneficiaries served: {entry.beneficiariesServed}</Text>
            <Text style={{ color: "#166534" }}>Total distributions: {entry.totalDistributions}</Text>
            <Text style={{ color: "#166534" }}>
              Items given: {entry.itemsGiven.map((item) => `${item.item_name} x${item.quantity}`).join(", ") || "None yet"}
            </Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Inventory report</Text>
      <View style={{ gap: 10 }}>
        {(reports?.inventoryReport.items ?? []).map((item) => (
          <View key={item.id} style={{ gap: 4, padding: 16, borderRadius: 18, backgroundColor: "#ffffff" }}>
            <Text style={{ fontWeight: "800", color: "#052e16" }}>{item.name}</Text>
            <Text style={{ color: "#166534" }}>
              Stock: {item.current_stock} {item.unit}
            </Text>
            <Text style={{ color: "#166534" }}>Threshold: {item.low_stock_threshold}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10, padding: 16, borderRadius: 18, backgroundColor: "#fff7ed" }}>
        <Text style={{ fontWeight: "800", color: "#9a3412" }}>Low-stock list</Text>
        {(reports?.inventoryReport.lowStockItems ?? []).map((item) => (
          <Text key={item.id} style={{ color: "#92400e" }}>
            {item.name} | {item.current_stock} remaining
          </Text>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Staff activity report</Text>
      <View style={{ gap: 10 }}>
        {(reports?.staffActivity ?? []).map((entry) => (
          <View key={entry.staff.id} style={{ gap: 4, padding: 16, borderRadius: 18, backgroundColor: "#ffffff" }}>
            <Text style={{ fontWeight: "800", color: "#052e16" }}>
              {entry.staff.profile?.full_name ?? entry.staff.id}
            </Text>
            <Text style={{ color: "#166534" }}>Distributions: {entry.totalDistributions}</Text>
            <Text style={{ color: "#166534" }}>
              Per event: {Object.entries(entry.perEvent).map(([event, count]) => `${event} (${count})`).join(", ") || "No activity yet"}
            </Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Distribution trends</Text>
      <View style={{ gap: 10 }}>
        {(reports?.distributionTrends ?? []).map((entry) => (
          <View key={entry.day} style={{ gap: 4, padding: 16, borderRadius: 18, backgroundColor: "#ffffff" }}>
            <Text style={{ fontWeight: "700", color: "#052e16" }}>{entry.day}</Text>
            <Text style={{ color: "#166534" }}>{entry.count} distributions</Text>
            <Text style={{ color: "#65a30d" }}>{Array.from({ length: Math.max(1, entry.count) }).map(() => "#").join("")}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
