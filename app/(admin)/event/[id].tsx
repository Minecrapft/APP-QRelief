import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import {
  assignStaffToEvent,
  fetchEventDetail,
  removeStaffAssignment,
  upsertEventAllocation
} from "@/features/admin/operations";
import { EventItemRecord, EventRecord, InventoryItemRecord, StaffAssignmentRecord, StaffRecord } from "@/types/domain";

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [allocations, setAllocations] = useState<EventItemRecord[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignmentRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [allocatedQuantity, setAllocatedQuantity] = useState("");
  const [perBeneficiaryQuantity, setPerBeneficiaryQuantity] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventDetail(eventId);
      setEvent(data.event);
      setAllocations(data.allocations);
      setAssignments(data.assignments);
      setInventoryItems(data.inventoryItems);
      setStaff(data.availableStaff);
      if (!selectedItemId && data.inventoryItems[0]) setSelectedItemId(data.inventoryItems[0].id);
      if (!selectedStaffId && data.availableStaff[0]) setSelectedStaffId(data.availableStaff[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load event.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [eventId]);

  const addAllocation = async () => {
    if (!eventId || !selectedItemId) return;
    try {
      await upsertEventAllocation({
        event_id: eventId,
        inventory_item_id: selectedItemId,
        allocated_quantity: Number(allocatedQuantity) || 0,
        per_beneficiary_quantity: Number(perBeneficiaryQuantity) || 0
      });
      setAllocatedQuantity("");
      setPerBeneficiaryQuantity("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save allocation.");
    }
  };

  const addStaffAssignment = async () => {
    if (!eventId || !selectedStaffId) return;
    try {
      await assignStaffToEvent(eventId, selectedStaffId);
      await load();
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Unable to assign staff.");
    }
  };

  if (loading) {
    return (
      <Screen title="Event operations" subtitle="Loading event details...">
        <Text style={{ color: "#166534" }}>Fetching allocations and staff assignments...</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title={event?.title ?? "Event operations"}
      subtitle="Allocate inventory per event and control which staff members can work this operation."
    >
      {error ? <Text style={{ color: "#9f1239" }}>{error}</Text> : null}

      <View style={{ gap: 8, padding: 18, borderRadius: 18, backgroundColor: "#ecfdf5" }}>
        <Text style={{ color: "#14532d", fontWeight: "700" }}>{event?.location}</Text>
        <Text style={{ color: "#166534" }}>Starts: {event?.starts_at ? new Date(event.starts_at).toLocaleString() : "-"}</Text>
        <Text style={{ color: "#166534", textTransform: "capitalize" }}>Status: {event?.status}</Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Item allocations</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {inventoryItems.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSelectedItemId(item.id)}
            style={{
              paddingHorizontal: 12,
              minHeight: 38,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selectedItemId === item.id ? "#166534" : "#f0fdf4",
              borderWidth: 1,
              borderColor: selectedItemId === item.id ? "#166534" : "#bbf7d0"
            }}
          >
            <Text style={{ color: selectedItemId === item.id ? "#f0fdf4" : "#14532d", fontWeight: "700" }}>
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input label="Allocated quantity" value={allocatedQuantity} onChangeText={setAllocatedQuantity} keyboardType="number-pad" placeholder="100" />
      <Input label="Per-beneficiary quantity" value={perBeneficiaryQuantity} onChangeText={setPerBeneficiaryQuantity} keyboardType="number-pad" placeholder="1" />
      <Button label="Save allocation" onPress={addAllocation} />

      <View style={{ gap: 10 }}>
        {allocations.map((allocation) => (
          <View key={allocation.id} style={{ gap: 6, padding: 16, borderRadius: 18, backgroundColor: "#fff" }}>
            <Text style={{ fontWeight: "700", color: "#052e16" }}>{allocation.inventory_item?.name ?? allocation.inventory_item_id}</Text>
            <Text style={{ color: "#166534" }}>Allocated: {allocation.allocated_quantity}</Text>
            <Text style={{ color: "#166534" }}>Per beneficiary: {allocation.per_beneficiary_quantity}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 16, fontWeight: "800", color: "#052e16" }}>Staff assignments</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {staff.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => setSelectedStaffId(entry.id)}
            style={{
              paddingHorizontal: 12,
              minHeight: 38,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selectedStaffId === entry.id ? "#166534" : "#f0fdf4",
              borderWidth: 1,
              borderColor: selectedStaffId === entry.id ? "#166534" : "#bbf7d0"
            }}
          >
            <Text style={{ color: selectedStaffId === entry.id ? "#f0fdf4" : "#14532d", fontWeight: "700" }}>
              {entry.profile?.full_name ?? entry.id}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button label="Assign selected staff" onPress={addStaffAssignment} />

      <View style={{ gap: 10 }}>
        {assignments.map((assignment) => (
          <View key={assignment.id} style={{ gap: 8, padding: 16, borderRadius: 18, backgroundColor: "#fff" }}>
            <Text style={{ fontWeight: "700", color: "#052e16" }}>{assignment.staff?.profile?.full_name ?? assignment.staff_id}</Text>
            <Text style={{ color: "#166534" }}>Assigned on {new Date(assignment.created_at).toLocaleString()}</Text>
            <Button label="Remove assignment" onPress={() => removeStaffAssignment(assignment.id).then(load)} variant="secondary" />
          </View>
        ))}
      </View>
    </Screen>
  );
}
