import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { MetricCard, Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { SignOutAction } from "@/components/ui/SignOutAction";
import { theme } from "@/constants/theme";
import {
  fetchAssignedEvents,
  fetchRecentDistributions,
  preloadBeneficiaryRosterForEvent
} from "@/features/staff/distribution";
import { useAuth } from "@/providers/AuthProvider";
import { useOperations } from "@/providers/OperationsProvider";
import { DistributionRecord, EventRecord } from "@/types/domain";

export default function StaffHomeScreen() {
  const { profile, signOut } = useAuth();
  const { pendingQueueCount, syncStatus, syncPendingQueue } = useOperations();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [recentDistributions, setRecentDistributions] = useState<DistributionRecord[]>([]);
  const [preloadingRosters, setPreloadingRosters] = useState(false);

  useEffect(() => {
    void fetchAssignedEvents()
      .then(async (nextEvents) => {
        setEvents(nextEvents);
        if (nextEvents.length === 0) {
          return;
        }

        setPreloadingRosters(true);
        await Promise.allSettled(nextEvents.map((event) => preloadBeneficiaryRosterForEvent(event.id)));
      })
      .catch(() => setEvents([]))
      .finally(() => setPreloadingRosters(false));
    void fetchRecentDistributions().then(setRecentDistributions).catch(() => setRecentDistributions([]));
  }, []);

  return (
    <Screen
      title={`Hello, ${profile?.full_name ?? "Staff"}`}
      subtitle="Work only from your assigned events, then scan or manually verify each beneficiary before distribution."
      action={<SignOutAction onConfirm={signOut} />}
    >
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Field Operations"
          title="Assigned event coverage"
          subtitle="Open the scanner from any event you are responsible for today."
        />
      </Panel>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ width: "47%" }}>
          <MetricCard label="Assigned events" value={events.length} tone="accent" />
        </View>
        <View style={{ width: "47%" }}>
          <MetricCard label="Recent distributions" value={recentDistributions.length} />
        </View>
        <View style={{ width: "47%" }}>
          <MetricCard label="Queued offline" value={pendingQueueCount} />
        </View>
      </View>

      {pendingQueueCount > 0 ? (
        <Panel tone={syncStatus === "failed" ? "warning" : "default"}>
          <SectionHeader
            eyebrow="Offline Queue"
            title="Queued field activity"
            subtitle={
              syncStatus === "syncing"
                ? "Queued distributions are syncing now."
                : "Queued distributions will sync automatically when the network is available."
            }
          />
          <Button
            label={syncStatus === "syncing" ? "Syncing..." : "Sync queued distributions"}
            onPress={syncPendingQueue}
            variant="secondary"
          />
        </Panel>
      ) : null}

      {preloadingRosters ? (
        <Panel tone="default">
          <SectionHeader
            eyebrow="Offline readiness"
            title="Preparing scan roster cache"
            subtitle="Assigned event rosters are being cached now so first-time scans can still resolve if the connection drops."
          />
        </Panel>
      ) : null}

      <Panel tone={events.length > 0 ? "success" : "warning"}>
        <SectionHeader
          eyebrow="Assignments"
          title="Assigned events"
          subtitle={events.length > 0 ? "Select an event to begin verification." : "No events assigned yet."}
        />
        {events.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Wait for an administrator to assign an event.</Text>
        ) : (
          events.map((event) => (
            <Pressable
              key={event.id}
              onPress={() =>
                router.push({
                  pathname: "/(staff)/scanner",
                  params: { eventId: event.id }
                })
              }
              style={{
                gap: 4,
                padding: 16,
                borderRadius: theme.radii.md,
                backgroundColor: "rgba(255,255,255,0.6)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.5)"
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>{event.title}</Text>
              <Text style={{ color: theme.colors.textMuted }}>{event.location}</Text>
            </Pressable>
          ))
        )}
      </Panel>

      <Button label="Open scanner" onPress={() => router.push("/(staff)/scanner")} />

      <Panel>
        <SectionHeader
          eyebrow="Activity"
          title="Recent distributions"
          subtitle="Your latest confirmed handoffs are summarized below."
        />
        {recentDistributions.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>No recent distributions yet.</Text>
        ) : (
          recentDistributions.map((distribution) => (
            <View
              key={distribution.id}
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
                {distribution.beneficiary?.full_name ?? distribution.beneficiary_id}
              </Text>
              <Text style={{ color: theme.colors.textMuted }}>
                {distribution.event?.title ?? distribution.event_id}
              </Text>
            </View>
          ))
        )}
      </Panel>
    </Screen>
  );
}
