import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";

import { EmptyState, InlineMessage, LoadingState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { theme } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { fetchEvents, saveEvent } from "@/features/admin/operations";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/providers/ToastProvider";
import { EventRecord, EventStatus } from "@/types/domain";

const EVENT_STATUSES: EventStatus[] = ["draft", "active", "cancelled", "archived"];
type DateField = "starts_at" | "ends_at";
type LocationSuggestion = {
  place_id: string;
  text: string;
  main_text: string;
  secondary_text: string;
};

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
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [pickerTarget, setPickerTarget] = useState<DateField | null>(null);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [pickerValue, setPickerValue] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [locationBias, setLocationBias] = useState<{ latitude: number; longitude: number } | null>(null);
  const locationRequestId = useRef(0);

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
    setLocationSuggestions([]);
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
    setLocationSuggestions([]);
  };

  useEffect(() => {
    const query = location.trim();

    if (query.length < 3) {
      setLocationSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const requestId = ++locationRequestId.current;
    setSuggestionsLoading(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { data, error: invokeError } = await supabase.functions.invoke("google-places-autocomplete", {
            body: {
              input: query,
              latitude: locationBias?.latitude ?? null,
              longitude: locationBias?.longitude ?? null
            }
          });

          if (invokeError) {
            throw invokeError;
          }

          if (requestId !== locationRequestId.current) {
            return;
          }

          setLocationSuggestions(Array.isArray(data?.suggestions) ? (data.suggestions as LocationSuggestion[]) : []);
        } catch (suggestionError) {
          if (requestId !== locationRequestId.current) {
            return;
          }

          setLocationSuggestions([]);
          console.warn("Unable to load Google Places suggestions", suggestionError);
        } finally {
          if (requestId === locationRequestId.current) {
            setSuggestionsLoading(false);
          }
        }
      })();
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [location, locationBias]);

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

  const handleOpenGoogleMaps = async () => {
    if (!location.trim()) {
      const message = "Enter or resolve a location first before opening Google Maps.";
      setError(message);
      showToast(message, "error");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;

    try {
      await Linking.openURL(url);
    } catch (linkError) {
      const message = linkError instanceof Error ? linkError.message : "Unable to open Google Maps.";
      setError(message);
      showToast(message, "error");
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
      resetForm();
      showToast(editing ? "Event updated." : "Event created.", "success");
      await load();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save event.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Events" subtitle="Create, update, and manage relief events before assigning items and staff.">
      <Input label="Event title" value={title} onChangeText={setTitle} placeholder="Flood response - Zone 4" />
      <Input label="Location" value={location} onChangeText={setLocation} placeholder="Covered court, Barangay 12" />
      {suggestionsLoading ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>Looking up Google Maps locations...</Text>
      ) : null}
      {locationSuggestions.length > 0 ? (
        <View
          style={{
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            backgroundColor: theme.colors.surface,
            overflow: "hidden"
          }}
        >
          {locationSuggestions.map((suggestion, index) => (
            <Pressable
              key={`${suggestion.place_id}-${index}`}
              onPress={() => {
                setLocation(suggestion.text);
                setLocationSuggestions([]);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.colors.cardBorder,
                gap: 4
              }}
            >
              <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{suggestion.main_text}</Text>
              {suggestion.secondary_text ? (
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{suggestion.secondary_text}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textMuted }}>
          Validate the venue in Google Maps or pull your current GPS location into the form.
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={resolvingLocation ? "Resolving location..." : "Use current location"}
              onPress={handleUseCurrentLocation}
              variant="secondary"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Open Google Maps" onPress={handleOpenGoogleMaps} variant="secondary" />
          </View>
        </View>
      </View>
      <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional notes" multiline />
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 0.2 }}>
          Starts at
        </Text>
        <Pressable
          onPress={() => openDatePicker("starts_at")}
          style={{
            minHeight: 56,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.inputBorder,
            backgroundColor: theme.colors.inputBg,
            paddingHorizontal: 16,
            justifyContent: "center"
          }}
        >
          <Text style={{ color: startsAt ? theme.colors.text : "#8ba0b7", fontSize: 15 }}>{formatDateTime(startsAt)}</Text>
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 0.2 }}>
          Ends at
        </Text>
        <Pressable
          onPress={() => openDatePicker("ends_at")}
          style={{
            minHeight: 56,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.inputBorder,
            backgroundColor: theme.colors.inputBg,
            paddingHorizontal: 16,
            justifyContent: "center"
          }}
        >
          <Text style={{ color: endsAt ? theme.colors.text : "#8ba0b7", fontSize: 15 }}>{formatDateTime(endsAt)}</Text>
        </Pressable>
      </View>

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

      {pickerTarget ? (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          is24Hour={false}
          onChange={handlePickerChange}
        />
      ) : null}
    </Screen>
  );
}
