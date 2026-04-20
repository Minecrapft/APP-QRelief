import Constants from "expo-constants";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WebViewMap } from "@/components/ui/WebViewMap";
import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import {
  assignStaffToEvent,
  fetchEventDetail,
  fetchWeatherEnrichedEventTurnoutPrediction,
  generateTurnoutExplanation,
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

type BeneficiaryLocation = {
  id: string;
  beneficiary_latitude: number;
  beneficiary_longitude: number;
  location_confidence: number;
};

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

let NativeMapModule:
  | {
      default: any;
      Marker: any;
      PROVIDER_GOOGLE?: string;
    }
  | null = null;

if (Constants.executionEnvironment !== "storeClient" && Platform.OS !== "web") {
  try {
    NativeMapModule = require("react-native-maps");
  } catch (e) {
    console.warn("Native Map Module not found:", e);
    NativeMapModule = null;
  }
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 6,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10
  },
  tabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b"
  },
  tabTextActive: {
    color: "#1e293b"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
    marginTop: 10
  },
  chip: {
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  chipActive: {
    backgroundColor: "#166534",
    borderColor: "#166534"
  },
  chipText: {
    color: "#64748b",
    fontWeight: "600"
  },
  chipTextActive: {
    color: "#fff"
  },
  recordCard: {
    gap: 8,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff"
  },
  recordName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a"
  },
  recordDetail: {
    color: "#64748b",
    fontSize: 13
  },
  statCard: {
    width: "47%",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)"
  },
  statLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  statValue: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "900"
  },
  statValueSmall: {
    fontSize: 22,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  statMeta: {
    color: "#64748b",
    fontSize: 12
  },
  aiBox: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#ccfbf1"
  }
});

function EventDetailScreen() {
  const MapView = NativeMapModule?.default;
  const MapMarker = NativeMapModule?.Marker;
  const UrlTile = NativeMapModule?.UrlTile;
  const canRenderNativeMap = Boolean(MapView && MapMarker && UrlTile);

  const params = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [allocations, setAllocations] = useState<EventItemRecord[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignmentRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRecord[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryLocation[]>([]);
  const [prediction, setPrediction] = useState<WeatherEnrichedEventTurnoutPrediction | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [allocatedQuantity, setAllocatedQuantity] = useState("");
  const [perBeneficiaryQuantity, setPerBeneficiaryQuantity] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingPrediction, setRefreshingPrediction] = useState(false);
  const [explanationNarrative, setExplanationNarrative] = useState<string | null>(null);
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "supplies" | "team">("overview");

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
      setBeneficiaries(data.beneficiaries);

      // Set map region if event has coordinates
      if (data.event.event_latitude && data.event.event_longitude) {
        setMapRegion({
          latitude: data.event.event_latitude,
          longitude: data.event.event_longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        });
      }

      try {
        const nextPrediction = await fetchWeatherEnrichedEventTurnoutPrediction(data.event);
        setPrediction(nextPrediction);
        setPredictionError(null);

        // Call Groq AI for narrative explanation
        setGeneratingExplanation(true);
        try {
          const narrative = await generateTurnoutExplanation(nextPrediction);
          setExplanationNarrative(narrative);
        } finally {
          setGeneratingExplanation(false);
        }
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

      // Refresh Groq AI explanation
      setGeneratingExplanation(true);
      try {
        const narrative = await generateTurnoutExplanation(nextPrediction);
        setExplanationNarrative(narrative);
      } finally {
        setGeneratingExplanation(false);
      }
    } catch (refreshError) {
      setPredictionError(refreshError instanceof Error ? refreshError.message : "Unable to refresh turnout prediction.");
    } finally {
      setRefreshingPrediction(false);
    }
  };

  const renderOverviewTab = () => (
    <View style={{ gap: 20 }}>
      {/* Quick Stats Panel */}
      <View style={{ gap: 8, padding: 18, borderRadius: 18, backgroundColor: "#ecfdf5" }}>
        <Text style={{ color: "#14532d", fontWeight: "700" }}>{event?.location}</Text>
        <Text style={{ color: "#166534" }}>Starts: {event?.starts_at ? new Date(event.starts_at).toLocaleString() : "-"}</Text>
        <Text style={{ color: "#166534", textTransform: "capitalize" }}>Status: {event?.status}</Text>
      </View>

      {/* Event Location + Beneficiary Map */}
      {event?.event_latitude && event?.event_longitude ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 0.2 }}>
            Location & Proximity
          </Text>
          <View
            style={{
              minHeight: 280,
              borderRadius: theme.radii.lg,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
              backgroundColor: theme.colors.surfaceMuted
            }}
          >
            {mapRegion && canRenderNativeMap ? (
              <MapView
                style={{ flex: 1 }}
                mapType="none"
                region={mapRegion}
              >
                <UrlTile
                  urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  maximumZ={19}
                  flipY={false}
                />
                <MapMarker
                  coordinate={{
                    latitude: event.event_latitude,
                    longitude: event.event_longitude
                  }}
                  title={event.title}
                  description={`Event: ${event.location}`}
                  pinColor="#166534"
                />
                {beneficiaries.map((beneficiary) => (
                  <MapMarker
                    key={beneficiary.id}
                    coordinate={{
                      latitude: beneficiary.beneficiary_latitude,
                      longitude: beneficiary.beneficiary_longitude
                    }}
                    title="Beneficiary"
                    pinColor="#9a5b00"
                  />
                ))}
              </MapView>
            ) : mapRegion && !canRenderNativeMap ? (
              <WebViewMap
                style={{ flex: 1 }}
                center={{
                  latitude: event.event_latitude,
                  longitude: event.event_longitude
                }}
                markers={[
                  {
                    id: "event-location",
                    latitude: event.event_latitude,
                    longitude: event.event_longitude,
                    title: event.title,
                    description: event.location,
                    color: "#166534"
                  },
                  ...beneficiaries.map(b => ({
                    id: b.id,
                    latitude: b.beneficiary_latitude,
                    longitude: b.beneficiary_longitude,
                    title: "Beneficiary",
                    color: "#9a5b00"
                  }))
                ]}
              />
            ) : null}
          </View>
          <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
            Green marker: Event location • Orange markers: Nearby beneficiaries ({beneficiaries.length})
          </Text>
        </View>
      ) : null}

      {/* Forecast Panel */}
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Forecast"
          title="Event turnout prediction"
          subtitle="AI-driven analysis using QRelief attendance history and weather signals."
        />
        {prediction ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Predicted turnout</Text>
                <Text style={styles.statValue}>{prediction.weather_adjusted_turnout}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Confidence</Text>
                <Text style={[styles.statValueSmall, { color: confidenceTone }]}>{prediction.confidence_label}</Text>
                <Text style={styles.statMeta}>{(prediction.confidence_score * 100).toFixed(0)}% score</Text>
              </View>
            </View>

            {explanationNarrative || generatingExplanation ? (
              <View style={styles.aiBox}>
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>🤖 AI Turnout Analysis</Text>
                {generatingExplanation ? (
                  <Text style={{ color: theme.colors.textMuted, fontStyle: "italic" }}>Groq AI is analyzing turnout factors...</Text>
                ) : (
                  <Text style={{ color: theme.colors.text, lineHeight: 20 }}>{explanationNarrative}</Text>
                )}
              </View>
            ) : null}
            
            <Button
              label={refreshingPrediction ? "Refreshing forecast..." : "Refresh turnout forecast"}
              onPress={refreshPrediction}
              variant="secondary"
            />
          </View>
        ) : (
          <EmptyState title="No turnout forecast" message="Insufficient data for a prediction right now." />
        )}
      </Panel>
    </View>
  );

  const renderSuppliesTab = () => (
    <View style={{ gap: 20 }}>
      {/* Allocation Form */}
      <Panel>
        <SectionHeader title="Allocate items" subtitle="Select inventory and set quantities per operation." />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {inventoryItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setSelectedItemId(item.id)}
              style={[styles.chip, selectedItemId === item.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedItemId === item.id && styles.chipTextActive]}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        <Input label="Allocated quantity" value={allocatedQuantity} onChangeText={setAllocatedQuantity} keyboardType="number-pad" placeholder="100" />
        <Input label="Per-beneficiary quantity" value={perBeneficiaryQuantity} onChangeText={setPerBeneficiaryQuantity} keyboardType="number-pad" placeholder="1" />
        <Button label="Save allocation" onPress={addAllocation} />
      </Panel>

      {/* Allocation List */}
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionTitle}>Current allocations</Text>
        {allocations.map((allocation) => (
          <View key={allocation.id} style={styles.recordCard}>
            <Text style={styles.recordName}>{allocation.inventory_item?.name ?? "Unknown item"}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.recordDetail}>Allocated: {allocation.allocated_quantity}</Text>
              <Text style={styles.recordDetail}>Ratio: {allocation.per_beneficiary_quantity}</Text>
            </View>
          </View>
        ))}
        {allocations.length === 0 && <EmptyState title="No items allocated" message="Start by adding inventory items to this event." />}
      </View>
    </View>
  );

  const renderTeamTab = () => (
    <View style={{ gap: 20 }}>
      {/* Assignment Form */}
      <Panel>
        <SectionHeader title="Assign team" subtitle="Select available staff to work this relief operation." />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {staff.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => setSelectedStaffId(entry.id)}
              style={[styles.chip, selectedStaffId === entry.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedStaffId === entry.id && styles.chipTextActive]}>
                {entry.profile?.full_name ?? entry.id}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button label="Assign selected staff" onPress={addStaffAssignment} />
      </Panel>

      {/* Assignment List */}
      <View style={{ gap: 10 }}>
        <Text style={styles.sectionTitle}>Working team</Text>
        {assignments.map((assignment) => (
          <View key={assignment.id} style={styles.recordCard}>
            <Text style={styles.recordName}>{assignment.staff?.profile?.full_name ?? "Unknown Staff"}</Text>
            <Text style={styles.recordDetail}>Assigned: {new Date(assignment.created_at).toLocaleDateString()}</Text>
            <Button
              label="Remove"
              onPress={() => removeStaffAssignment(assignment.id).then(load)}
              variant="secondary"
              style={{ marginTop: 8 }}
            />
          </View>
        ))}
        {assignments.length === 0 && <EmptyState title="No staff assigned" message="Invite team members to this operation." />}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen title="Event operations" subtitle="Synchronizing detailed event context...">
        <Text style={{ color: "#166534" }}>Accessing inventory and team data...</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title={event?.title ?? "Event operations"}
      subtitle={event?.description || "Manage the distribution and staffing for this specific relief effort."}
    >
      {error ? <Text style={{ color: "#9f1239", marginBottom: 10 }}>{error}</Text> : null}

      {/* Custom Tab Switcher */}
      <View style={styles.tabBar}>
        <Pressable onPress={() => setActiveTab("overview")} style={[styles.tab, activeTab === "overview" && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>Dashboard</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab("supplies")} style={[styles.tab, activeTab === "supplies" && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === "supplies" && styles.tabTextActive]}>Supplies</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab("team")} style={[styles.tab, activeTab === "team" && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === "team" && styles.tabTextActive]}>Team</Text>
        </Pressable>
      </View>

      {/* Conditional Rendering based on Tab */}
      <View style={{ marginTop: 2 }}>
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "supplies" && renderSuppliesTab()}
        {activeTab === "team" && renderTeamTab()}
      </View>
    </Screen>
  );
}

export default EventDetailScreen;
