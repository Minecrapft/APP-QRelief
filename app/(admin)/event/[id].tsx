import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import {
  assignStaffToEvent,
  fetchEventDetail,
  fetchWeatherEnrichedEventTurnoutPrediction,
  removeStaffAssignment,
  upsertEventAllocation
} from "@/features/admin/operations";
import { theme } from "@/constants/theme";
import {
  EventItemRecord,
  EventRecord,
  InventoryItemRecord,
  StaffAssignmentRecord,
  StaffRecord,
  WeatherEnrichedEventTurnoutPrediction
} from "@/types/domain";

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [allocations, setAllocations] = useState<EventItemRecord[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignmentRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [prediction, setPrediction] = useState<WeatherEnrichedEventTurnoutPrediction | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [allocatedQuantity, setAllocatedQuantity] = useState("");
  const [perBeneficiaryQuantity, setPerBeneficiaryQuantity] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingPrediction, setRefreshingPrediction] = useState(false);

  const confidenceTone =
    prediction?.confidence_label === "high"
      ? "#166534"
      : prediction?.confidence_label === "medium"
        ? "#9a5b00"
        : "#9f1239";

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

      try {
        const nextPrediction = await fetchWeatherEnrichedEventTurnoutPrediction(data.event);
        setPrediction(nextPrediction);
        setPredictionError(null);
      } catch (nextPredictionError) {
        setPrediction(null);
        setPredictionError(
          nextPredictionError instanceof Error ? nextPredictionError.message : "Unable to load turnout prediction."
        );
      }

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

  const refreshPrediction = async () => {
    if (!eventId) return;

    setRefreshingPrediction(true);
    setPredictionError(null);

    try {
      if (!event) {
        throw new Error("Event context is not ready yet.");
      }

      const nextPrediction = await fetchWeatherEnrichedEventTurnoutPrediction(event);
      setPrediction(nextPrediction);
    } catch (refreshError) {
      setPredictionError(refreshError instanceof Error ? refreshError.message : "Unable to refresh turnout prediction.");
    } finally {
      setRefreshingPrediction(false);
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

      <Panel tone="strong">
        <SectionHeader
          eyebrow="Forecast"
          title="Event turnout prediction"
          subtitle="Uses QRelief attendance history, schedule patterns, and allocation readiness to estimate turnout."
        />
        {prediction ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <View
                style={{
                  width: "47%",
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.68)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.5)"
                }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" }}>Predicted turnout</Text>
                <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900" }}>
                  {prediction.weather_adjusted_turnout}
                </Text>
              </View>
              <View
                style={{
                  width: "47%",
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.68)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.5)"
                }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" }}>Confidence</Text>
                <Text style={{ color: confidenceTone, fontSize: 24, fontWeight: "900", textTransform: "capitalize" }}>
                  {prediction.confidence_label}
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  Score {(prediction.confidence_score * 100).toFixed(0)}%
                </Text>
              </View>
              <View
                style={{
                  width: "47%",
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.68)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.5)"
                }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" }}>Prep target</Text>
                <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "900" }}>
                  {prediction.recommended_prep_target}
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  Includes +{prediction.recommended_buffer} buffer
                </Text>
              </View>
              <View
                style={{
                  width: "47%",
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.68)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.5)"
                }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" }}>Weather impact</Text>
                <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "900" }}>
                  {prediction.weather_adjustment_delta >= 0 ? "+" : ""}
                  {prediction.weather_adjustment_delta}
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  Base {prediction.base_predicted_turnout}
                </Text>
              </View>
              <View
                style={{
                  width: "47%",
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.68)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.5)"
                }}
              >
                <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "700" }}>Allocation capacity</Text>
                <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "900" }}>
                  {prediction.allocation_capacity ?? "-"}
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  Across {prediction.allocation_item_count} configured item{prediction.allocation_item_count === 1 ? "" : "s"}
                </Text>
              </View>
            </View>

            <View
              style={{
                gap: 8,
                padding: 16,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.68)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.5)"
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Why this forecast</Text>
              {prediction.explanation_factors.map((factor) => (
                <View key={factor.label} style={{ gap: 2 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                    {factor.label}: <Text style={{ color: theme.colors.primary }}>{String(factor.value ?? "-")}</Text>
                  </Text>
                  <Text style={{ color: theme.colors.textMuted }}>{factor.detail}</Text>
                </View>
              ))}
            </View>

            {prediction.weather_forecast ? (
              <View
                style={{
                  gap: 6,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.68)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.5)"
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Weather signal</Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  {prediction.weather_forecast.location_name} on {prediction.weather_forecast.forecast_date}
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  Max temp: {prediction.weather_forecast.temperature_max ?? "-"}°C | Rain chance: {prediction.weather_forecast.precipitation_probability_max ?? "-"}%
                </Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  Rain sum: {prediction.weather_forecast.precipitation_sum ?? "-"} mm | Wind max: {prediction.weather_forecast.wind_speed_10m_max ?? "-"} km/h
                </Text>
              </View>
            ) : (
              <View
                style={{
                  gap: 4,
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.68)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.5)"
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>Weather signal</Text>
                <Text style={{ color: theme.colors.textMuted }}>
                  No weather forecast was available for this event date yet, so the turnout estimate is based on QRelief data only.
                </Text>
              </View>
            )}

            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              Forecast generated {new Date(prediction.generated_at).toLocaleString()}
            </Text>
          </View>
        ) : (
          <EmptyState
            title="No turnout forecast yet"
            message="This event does not have enough structured data for a turnout prediction right now."
          />
        )}
        {predictionError ? <Text style={{ color: theme.colors.dangerText, fontWeight: "700" }}>{predictionError}</Text> : null}
        <Button
          label={refreshingPrediction ? "Refreshing forecast..." : "Refresh turnout forecast"}
          onPress={refreshPrediction}
          variant="secondary"
        />
      </Panel>

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
