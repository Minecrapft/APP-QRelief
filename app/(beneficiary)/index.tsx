import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { MetricCard, Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { SignOutAction } from "@/components/ui/SignOutAction";
import { theme } from "@/constants/theme";
import { fetchBeneficiaryClaimHistory, fetchBeneficiaryEvents } from "@/features/beneficiary/portal";
import { useAuth } from "@/providers/AuthProvider";
import { DistributionRecord, EventItemRecord, EventRecord } from "@/types/domain";

type BeneficiaryEvent = EventRecord & { allocation_items: EventItemRecord[] };

export default function BeneficiaryHomeScreen() {
  const { profile, beneficiaryRecord, signOut } = useAuth();
  const [events, setEvents] = useState<BeneficiaryEvent[]>([]);
  const [history, setHistory] = useState<DistributionRecord[]>([]);

  useEffect(() => {
    void fetchBeneficiaryEvents().then(setEvents).catch(() => setEvents([]));
    void fetchBeneficiaryClaimHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  const isApproved = beneficiaryRecord?.status === "approved";

  return (
    <Screen
      title={`Welcome, ${profile?.full_name ?? "Beneficiary"}`}
      subtitle="View your approval status, upcoming events, QR access, and recent claims from one place."
      action={<SignOutAction onConfirm={signOut} />}
    >
      <Panel tone={isApproved ? "success" : "warning"}>
        <SectionHeader
          eyebrow="Status"
          title="Registration status"
          subtitle={isApproved ? "Approved for relief operations." : "Pending approval from an administrator."}
        />
      </Panel>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ width: "47%" }}>
          <MetricCard label="Available events" value={events.length} tone="accent" />
        </View>
        <View style={{ width: "47%" }}>
          <MetricCard label="Claim records" value={history.length} />
        </View>
      </View>

      <Panel>
        <SectionHeader
          eyebrow="Event Access"
          title="Upcoming or active events"
          subtitle="These are the relief events currently available to your account."
        />
        {events.slice(0, 3).map((event) => (
          <Pressable
            key={event.id}
            onPress={() => router.push("/(beneficiary)/events")}
            style={{
              gap: 4,
              padding: 16,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "800" }}>{event.title}</Text>
            <Text style={{ color: theme.colors.textMuted }}>{event.location}</Text>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
              {event.allocation_items.length} allocated item type(s)
            </Text>
          </Pressable>
        ))}
        {events.length === 0 ? <Text style={{ color: theme.colors.textMuted }}>No events available yet.</Text> : null}
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Claim History"
          title="Recent claims"
          subtitle="Your latest confirmed distributions appear here."
        />
        {history.slice(0, 3).map((entry) => (
          <View
            key={entry.id}
            style={{
              gap: 4,
              padding: 16,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
              {entry.event?.title ?? entry.event_id}
            </Text>
            <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>
              {new Date(entry.distributed_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
        {history.length === 0 ? <Text style={{ color: theme.colors.textMuted }}>No claims recorded yet.</Text> : null}
      </Panel>
    </Screen>
  );
}
