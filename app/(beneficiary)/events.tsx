import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Screen } from "@/components/ui/Screen";
import { fetchBeneficiaryEvents } from "@/features/beneficiary/portal";
import { EventItemRecord, EventRecord } from "@/types/domain";

type BeneficiaryEvent = EventRecord & { allocation_items: EventItemRecord[] };

export default function BeneficiaryEventsScreen() {
  const [events, setEvents] = useState<BeneficiaryEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchBeneficiaryEvents()
      .then(setEvents)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load events.")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen
      title="Upcoming events"
      subtitle="Browse active relief operations and preview the items allocated for each event."
    >
      {loading ? <LoadingState label="Loading events..." /> : null}
      {error ? <InlineMessage tone="error" message={error} /> : null}
      {!loading && !error && events.length === 0 ? (
        <EmptyState
          title="No active events yet"
          message="Event allocations will appear here once an administrator publishes a relief operation."
        />
      ) : null}

      <View style={{ gap: 14 }}>
        {events.map((event) => (
          <View key={event.id} style={{ gap: 10, padding: 18, borderRadius: 18, backgroundColor: "#ffffff" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#052e16" }}>{event.title}</Text>
            <Text style={{ color: "#166534" }}>{event.location}</Text>
            <Text style={{ color: "#166534" }}>{new Date(event.starts_at).toLocaleString()}</Text>
            <Text style={{ color: "#14532d", textTransform: "capitalize" }}>Status: {event.status}</Text>
            <View style={{ gap: 6 }}>
              {event.allocation_items.length === 0 ? (
                <Text style={{ color: "#166534" }}>Allocation details will be posted soon.</Text>
              ) : (
                event.allocation_items.map((item) => (
                  <Text key={item.id} style={{ color: "#166534" }}>
                    {item.inventory_item?.name ?? item.inventory_item_id} up to {item.per_beneficiary_quantity}{" "}
                    {item.inventory_item?.unit ?? "unit"}
                  </Text>
                ))
              )}
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}
