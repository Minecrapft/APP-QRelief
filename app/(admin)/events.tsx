import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { AddressInput } from "@/components/ui/AddressInput";
import { WebViewMap } from "@/components/ui/WebViewMap";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { theme } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { fetchEvents, saveEvent } from "@/features/admin/operations";
import { useToast } from "@/providers/ToastProvider";
import { EventRecord, EventStatus } from "@/types/domain";

const EVENT_STATUSES: EventStatus[] = ["draft", "active", "cancelled", "archived"];
type DateField = "starts_at" | "ends_at";
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

let NativeMapModule:
  | {
      default: any;
      Marker: any;
      UrlTile: any;
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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "Tap to choose date and time";
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function formatGeocodedAddress(address: Location.LocationGeocodedAddress | null | undefined) {
  if (!address) {
    return "";
  }

  return (
    address.formattedAddress ??
    [address.name, address.street, address.district, address.city, address.region, address.country]
      .filter(Boolean)
      .join(", ")
  );
}

export default function EventsScreen() {
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const MapView = NativeMapModule?.default;
  const MapMarker = NativeMapModule?.Marker;
  const UrlTile = NativeMapModule?.UrlTile;
  const canRenderNativeMap = Boolean(MapView && MapMarker && UrlTile);
  
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<EventStatus>("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [resolvingMapPreview, setResolvingMapPreview] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<DateField | null>(null);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [pickerValue, setPickerValue] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [locationBias, setLocationBias] = useState<{ latitude: number; longitude: number } | null>(null);
  const geocodeRequestId = useRef(0);
  const [viewMode, setViewMode] = useState<"list" | "form">("list");

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
    setStartsAt(null);
    setEndsAt(null);
    setStatus("draft");
    setMapRegion(null);
    setViewMode("list");
  };

  const startEdit = (event: EventRecord) => {
    setEditing(event);
    setTitle(event.title);
    setLocation(event.location);
    setDescription(event.description ?? "");
    setStartsAt(new Date(event.starts_at));
    setEndsAt(event.ends_at ? new Date(event.ends_at) : null);
    setStatus(event.status);
    setError(null);
    setViewMode("form");
  };

  useEffect(() => {
    const query = location.trim();

    if (!query) {
      setMapRegion(null);
      setResolvingMapPreview(false);
      return;
    }

    const requestId = ++geocodeRequestId.current;
    setResolvingMapPreview(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const matches = await Location.geocodeAsync(query);

          if (requestId !== geocodeRequestId.current) {
            return;
          }

          const firstMatch = matches[0];

          if (!firstMatch) {
            setMapRegion(null);
            return;
          }

          setMapRegion({
            latitude: firstMatch.latitude,
            longitude: firstMatch.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012
          });
        } catch {
          if (requestId === geocodeRequestId.current) {
            setMapRegion(null);
          }
        } finally {
          if (requestId === geocodeRequestId.current) {
            setResolvingMapPreview(false);
          }
        }
      })();
    }, 450);

    return () => {
      clearTimeout(timer);
    };
  }, [location]);

  const openDatePicker = (target: DateField) => {
    const seedDate = target === "starts_at" ? startsAt ?? new Date() : endsAt ?? startsAt ?? new Date();
    setPickerTarget(target);
    setPickerMode("date");
    setPickerValue(seedDate);
  };

  const commitPickedDate = (target: DateField, value: Date) => {
    if (target === "starts_at") {
      setStartsAt(value);
      if (endsAt && endsAt < value) {
        setEndsAt(value);
      }
      return;
    }

    setEndsAt(value);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!pickerTarget) {
      return;
    }

    if (event.type === "dismissed") {
      setPickerTarget(null);
      setPickerMode("date");
      return;
    }

    const incoming = selectedDate ?? pickerValue;
    const nextValue = new Date(pickerValue);

    if (pickerMode === "date") {
      nextValue.setFullYear(incoming.getFullYear(), incoming.getMonth(), incoming.getDate());
      setPickerValue(nextValue);

      if (Platform.OS === "android") {
        setPickerMode("time");
        return;
      }

      commitPickedDate(pickerTarget, nextValue);
      setPickerTarget(null);
      return;
    }

    nextValue.setHours(incoming.getHours(), incoming.getMinutes(), 0, 0);
    commitPickedDate(pickerTarget, nextValue);
    setPickerTarget(null);
    setPickerMode("date");
  };

  const handleUseCurrentLocation = async () => {
    setResolvingLocation(true);
    setError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        throw new Error("Location permission is required to use current location.");
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const results = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      });
      const resolvedAddress =
        formatGeocodedAddress(results[0]) ||
        `${current.coords.latitude.toFixed(6)}, ${current.coords.longitude.toFixed(6)}`;

      setLocation(resolvedAddress);
      setLocationBias({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      });
      setMapRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008
      });
      showToast("Current location added to the event form.", "success");
    } catch (locationError) {
      const message =
        locationError instanceof Error ? locationError.message : "Unable to resolve current location.";
      setError(message);
      showToast(message, "error");
    } finally {
      setResolvingLocation(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!title.trim()) {
        throw new Error("Event title is required.");
      }

      if (!location.trim()) {
        throw new Error("Location is required.");
      }

      if (!startsAt) {
        throw new Error("Start date and time are required.");
      }

      if (endsAt && endsAt < startsAt) {
        throw new Error("End date must be the same as or later than the start date.");
      }

      await saveEvent({
        id: editing?.id,
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        status
      });
      
      showToast(editing ? "Event updated." : "Event created.", "success");
      await load();
      setViewMode("list");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save event.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const renderForm = () => (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a" }}>
          {editing ? "Update operation" : "New relief operation"}
        </Text>
        <Pressable onPress={() => setViewMode("list")} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color="#64748b" />
        </Pressable>
      </View>
      
      <Input label="Event title" value={title} onChangeText={setTitle} placeholder="Flood response - Zone 4" />
      <AddressInput
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="Covered court, Barangay 12"
        locationBias={locationBias}
      />
      
      <View style={{ gap: 10 }}>
        <Button
          label={resolvingLocation ? "Resolving location..." : "Use current location"}
          onPress={handleUseCurrentLocation}
          variant="secondary"
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.fieldLabel}>Location preview</Text>
        <View style={styles.mapContainer}>
          {mapRegion ? (
            canRenderNativeMap ? (
              <MapView style={{ flex: 1 }} mapType="none" region={mapRegion}>
                <UrlTile urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maximumZ={19} flipY={false} />
                <MapMarker coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} title={title.trim() || "Relief event"} description={location.trim()} />
              </MapView>
            ) : (
              <WebViewMap style={{ flex: 1 }} center={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }} markers={[{ id: "preview", latitude: mapRegion.latitude, longitude: mapRegion.longitude, title: title || "Relief event", color: "#166534" }]} />
            )
          ) : (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 18 }}>
              <Text style={{ color: theme.colors.textMuted, textAlign: "center" }}>
                {resolvingMapPreview ? "Resolving map preview..." : "Search for a venue to see the map preview."}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional notes" multiline />
      
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.fieldLabel}>Starts at</Text>
          <Pressable onPress={() => openDatePicker("starts_at")} style={styles.datePickerButton}>
            <Text style={{ color: startsAt ? theme.colors.text : "#8ba0b7", fontSize: 14 }}>{formatDateTime(startsAt)}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.fieldLabel}>Ends at</Text>
          <Pressable onPress={() => openDatePicker("ends_at")} style={styles.datePickerButton}>
            <Text style={{ color: endsAt ? theme.colors.text : "#8ba0b7", fontSize: 14 }}>{formatDateTime(endsAt)}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.fieldLabel}>Operation status</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {([
            { id: "draft", icon: "pencil", label: "Draft", color: "#64748b", bg: "#f1f5f9" },
            { id: "active", icon: "play-circle", label: "Active", color: "#166534", bg: "#f0fdf4" },
            { id: "cancelled", icon: "close-circle", label: "Cancelled", color: "#9f1239", bg: "#fff1f2" },
            { id: "archived", icon: "archive", label: "Archived", color: "#1e40af", bg: "#eff6ff" }
          ] as const).map((opt) => {
            const isSelected = status === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setStatus(opt.id)}
                style={[styles.statusOption, { borderColor: isSelected ? opt.color : "transparent", backgroundColor: opt.bg, opacity: isSelected ? 1 : 0.7 }]}
              >
                <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                <Text style={{ color: opt.color, fontWeight: "700", fontSize: 13 }}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <InlineMessage tone="error" message={error} /> : null}
      <Button label={saving ? "Saving..." : editing ? "Update operation" : "Create operation"} onPress={submit} />
    </View>
  );

  const renderList = () => (
    <View style={{ gap: 16 }}>
      {loading ? <LoadingState label="Synchronizing operations..." /> : null}
      {!loading && events.length === 0 ? (
        <EmptyState title="No active operations" message="Your operations dashboard is currently empty. Tap the (+) button below to start a new relief event." />
      ) : null}

      <View style={{ gap: 14 }}>
        {events.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => router.push(`/(admin)/event/${event.id}`)}
            style={styles.eventCard}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>{event.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="location" size={14} color="#64748b" />
                  <Text style={{ color: "#64748b", fontSize: 13, flexShrink: 1 }}>{event.location}</Text>
                </View>
              </View>
              
              {/* Status Badge */}
              {(() => {
                const config = {
                  draft: { icon: "pencil", color: "#64748b", bg: "#f1f5f9" },
                  active: { icon: "play-circle", color: "#166534", bg: "#f0fdf4" },
                  cancelled: { icon: "close-circle", color: "#9f1239", bg: "#fff1f2" },
                  archived: { icon: "archive", color: "#1e40af", bg: "#eff6ff" }
                }[event.status] || { icon: "help-circle", color: "#64748b", bg: "#f1f5f9" };
                
                return (
                  <View style={[styles.badge, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={12} color={config.color} />
                    <Text style={{ color: config.color, fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>{event.status}</Text>
                  </View>
                );
              })()}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={{ color: "#64748b", fontSize: 13, fontWeight: "500" }}>
                {new Date(event.starts_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
              <Button label="Edit" onPress={() => startEdit(event)} variant="secondary" style={{ flex: 1, minHeight: 44 }} />
              <Button label="Manage Operation" onPress={() => router.push(`/(admin)/event/${event.id}`)} style={{ flex: 2, minHeight: 44 }} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Screen 
        title="Operations" 
        subtitle={viewMode === "list" ? "Monitor and manage live relief efforts across all mapped zones." : "Configure parameters and location for a new relief event."}
      >
        {viewMode === "list" ? renderList() : renderForm()}

        {pickerTarget ? (
          <DateTimePicker value={pickerValue} mode={pickerMode} is24Hour={false} onChange={handlePickerChange} />
        ) : null}
      </Screen>

      {viewMode === "list" && (
        <Pressable 
          onPress={() => {
            resetForm();
            setViewMode("form");
          }}
          style={[styles.fab, { bottom: insets.bottom + 15, left: 20 }]}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10
  },
  eventCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    gap: 12
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  mapContainer: {
    minHeight: 220,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc"
  },
  datePickerButton: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    justifyContent: "center"
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.2
  },
  statusOption: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  }
});
