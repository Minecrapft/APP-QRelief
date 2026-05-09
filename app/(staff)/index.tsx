import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { MetricCard, Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { SignOutAction } from "@/components/ui/SignOutAction";
import { theme } from "@/constants/theme";
import {
  fetchAssignedEvents,
  preloadBeneficiaryRosterForEvent
} from "@/features/staff/distribution";
import { useAuth } from "@/providers/AuthProvider";
import { useOperations } from "@/providers/OperationsProvider";
import { EventRecord } from "@/types/domain";

export default function StaffHomeScreen() {
  const { profile, signOut } = useAuth();
  const { pendingQueueCount, syncStatus, syncPendingQueue } = useOperations();
  const [events, setEvents] = useState<EventRecord[]>([]);
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
  }, []);

  return (
    <Screen
      title={`Hello, ${profile?.full_name ?? "Staff"}`}
      subtitle="Work from your assigned events, scan beneficiaries, and monitor your offline sync status."
      action={<SignOutAction onConfirm={signOut} />}
    >
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Field Operations"
          title="Assigned event coverage"
          subtitle="Select an event below to begin scanning or jump straight to the Scanner tab."
        />
      </Panel>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ width: "47%" }}>
          <MetricCard label="My assignments" value={events.length} tone="accent" />
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
          title="Events assigned to you"
          subtitle={events.length > 0 ? "Tap an event to pre-configure the scanner." : "No active assignments."}
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
                borderColor: "rgba(255,255,255,0.5)",
                marginBottom: 8
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>{event.title}</Text>
              <Text style={{ color: theme.colors.textMuted }}>{event.location}</Text>
            </Pressable>
          ))
        )}
      </Panel>
    </Screen>
  );
}
