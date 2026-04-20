import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View, FlatList } from "react-native";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";

type LocationSuggestion = {
  place_id: string;
  text: string;
  main_text: string;
  secondary_text: string;
};

interface AddressInputProps extends Omit<TextInputProps, "style"> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  locationBias?: {
    latitude: number;
    longitude: number;
  } | null;
}

export function AddressInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  locationBias,
  ...props
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const requestId = useRef(0);
  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    const query = value.trim();

    // If the query is exactly what we just picked, or too short, don't search.
    if (query.length < 3 || query === lastSelected.current) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const requestIdVal = ++requestId.current;
    setSuggestionsLoading(true);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { data, error: invokeError } = await supabase.functions.invoke(
            "osm-search",
            {
              body: {
                input: query,
                latitude: locationBias?.latitude ?? null,
                longitude: locationBias?.longitude ?? null
              }
            }
          );

          if (invokeError) {
            throw invokeError;
          }

          if (requestIdVal !== requestId.current) {
            return;
          }

          // Handle transparent errors from the function (returned as 200 with error property)
          if (data?.error) {
            setSuggestions([]);
            console.warn("Address Search Error:", data.error);
            return;
          }

          setSuggestions(Array.isArray(data?.suggestions) ? (data.suggestions as LocationSuggestion[]) : []);
          setSelectedIndex(null);
        } catch (suggestionError) {
          if (requestIdVal !== requestId.current) {
            return;
          }

          setSuggestions([]);
          console.warn("Unable to load address suggestions", suggestionError);
        } finally {
          if (requestIdVal === requestId.current) {
            setSuggestionsLoading(false);
          }
        }
      })();
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [value]);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    lastSelected.current = suggestion.text;
    onChangeText(suggestion.text);
    setSuggestions([]);
    setSelectedIndex(null);
  };

  const renderSuggestion = ({ item, index }: { item: LocationSuggestion; index: number }) => (
    <Pressable
      onPress={() => handleSelectSuggestion(item)}
      onPressIn={() => setSelectedIndex(index)}
      onPressOut={() => setSelectedIndex(null)}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: index === 0 ? 0 : 1,
        borderTopColor: theme.colors.cardBorder,
        backgroundColor: selectedIndex === index || pressed ? theme.colors.inputBg : theme.colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 10
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontWeight: "700", fontSize: 15, marginBottom: 2 }}>
          📍 {item.main_text}
        </Text>
        {item.secondary_text ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{item.secondary_text}</Text>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "800",
          color: theme.colors.textMuted,
          letterSpacing: 0.2,
          marginBottom: 8
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        placeholderTextColor="#8ba0b7"
        style={{
          minHeight: multiline ? 80 : 52,
          borderWidth: 1,
          borderColor: theme.colors.inputBorder,
          borderRadius: theme.radii.md,
          paddingHorizontal: 14,
          paddingTop: multiline ? 12 : 0,
          color: theme.colors.text,
          backgroundColor: theme.colors.inputBg,
          fontSize: 16
        }}
        {...props}
      />

      {suggestionsLoading ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontSize: 13,
            marginTop: 8,
            marginLeft: 2
          }}
        >
          ⏳ Looking up address suggestions...
        </Text>
      ) : null}

      {suggestions.length > 0 ? (
        <View
          style={{
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.cardBorder,
            backgroundColor: theme.colors.surface,
            overflow: "hidden",
            marginTop: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        >
          {suggestions.map((item, index) => (
            <View key={`${item.place_id}-${index}`}>
              {renderSuggestion({ item, index })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
