import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { fetchEvents, saveEvent } from "@/features/admin/operations";
import { EventRecord, EventStatus } from "@/types/domain";

const EVENT_STATUSES: EventStatus[] = ["draft", "active", "cancelled", "archived"];

export default function EventsScreen() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<EventStatus>("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchEvents());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setLocation("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setStatus("draft");
  };

  const startEdit = (event: EventRecord) => {
    setEditing(event);
    setTitle(event.title);
    setLocation(event.location);
    setDescription(event.description ?? "");
    setStartsAt(event.starts_at.slice(0, 16));
    setEndsAt(event.ends_at?.slice(0, 16) ?? "");
    setStatus(event.status);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveEvent({
        id: editing?.id,
        title,
        location,
        description,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        status
      });
      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Events" subtitle="Create, update, and manage relief events before assigning items and staff.">
      <Input label="Event title" value={title} onChangeText={setTitle} placeholder="Flood response - Zone 4" />
      <Input label="Location" value={location} onChangeText={setLocation} placeholder="Covered court, Barangay 12" />
      <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional notes" multiline />
      <Input label="Starts at" value={startsAt} onChangeText={setStartsAt} placeholder="2026-04-18T09:00" />
      <Input label="Ends at" value={endsAt} onChangeText={setEndsAt} placeholder="2026-04-18T16:00" />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {EVENT_STATUSES.map((option) => (
          <Pressable
            key={option}
            onPress={() => setStatus(option)}
            accessibilityRole="button"
            accessibilityLabel={`Set event status to ${option}`}
            accessibilityState={{ selected: status === option }}
            style={{
              paddingHorizontal: 14,
              minHeight: 40,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: status === option ? "#166534" : "#f0fdf4",
              borderWidth: 1,
              borderColor: status === option ? "#166534" : "#bbf7d0"
            }}
          >
            <Text style={{ color: status === option ? "#f0fdf4" : "#14532d", fontWeight: "700", textTransform: "capitalize" }}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <InlineMessage tone="error" message={error} /> : null}

      <View style={{ gap: 12 }}>
        <Button label={saving ? "Saving..." : editing ? "Update event" : "Create event"} onPress={submit} />
        {editing ? <Button label="Cancel edit" onPress={resetForm} variant="secondary" /> : null}
      </View>

      {loading ? <LoadingState label="Loading events..." /> : null}
      {!loading && events.length === 0 ? (
        <EmptyState
          title="No events created yet"
          message="Create your first event to start assigning staff and inventory."
        />
      ) : null}

      <View style={{ gap: 12 }}>
        {events.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => router.push(`/(admin)/event/${event.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open event ${event.title}`}
            style={{ gap: 8, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: "#dcfce7", backgroundColor: "#fff" }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#052e16" }}>{event.title}</Text>
            <Text style={{ color: "#166534" }}>{event.location}</Text>
            <Text style={{ color: "#166534" }}>{new Date(event.starts_at).toLocaleString()}</Text>
            <Text style={{ color: "#14532d", textTransform: "capitalize" }}>Status: {event.status}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Edit" onPress={() => startEdit(event)} variant="secondary" accessibilityLabel={`Edit ${event.title}`} />
              <Button label="Manage allocations" onPress={() => router.push(`/(admin)/event/${event.id}`)} accessibilityLabel={`Manage allocations for ${event.title}`} />
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
