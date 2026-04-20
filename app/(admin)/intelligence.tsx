import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { WebViewMap } from "@/components/ui/WebViewMap";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/providers/ToastProvider";

type PriorityPin = {
  cityName: string;
  score: number;
  reason: string;
  coords: { lat: number; lng: number };
};

type AnalysisResult = {
  disasters: any[];
  priorities: PriorityPin[];
  criticalHub: string;
  buildPlan: string;
};

export default function IntelligenceScreen() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedPin, setSelectedPin] = useState<PriorityPin | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-disaster-priority", {
        body: {}
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error + (data.message ? `: ${data.message}` : ""));
      
      setResult(data);
      
      // Auto-select the critical hub
      const hub = data.priorities.find((p: PriorityPin) => p.cityName === data.criticalHub);
      if (hub) setSelectedPin(hub);

      showToast("Disaster intelligence synchronized.", "success");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to fetch disaster intelligence.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runAnalysis();
  }, []);

  const getPriorityColor = (score: number) => {
    if (score >= 8) return "#dc2626"; // Red
    if (score >= 5) return "#ea580c"; // Orange
    return "#eab308"; // Yellow
  };

  const mapMarkers = result?.priorities.map((p) => ({
    id: p.cityName,
    latitude: p.coords.lat,
    longitude: p.coords.lng,
    title: `${p.cityName} (Priority ${p.score})`,
    color: getPriorityColor(p.score)
  })) || [];

  return (
    <Screen 
      title="Disaster Intelligence" 
      subtitle="AI-driven relief prioritization based on real-time weather and hazard data."
    >
      <View style={{ gap: 20 }}>
        {/* Map Header */}
        <View style={styles.mapContainer}>
          {loading ? (
            <View style={styles.mapOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 12, color: theme.colors.textMuted, fontWeight: "600" }}>
                Analyzing weather patterns...
              </Text>
            </View>
          ) : (
            <WebViewMap 
              style={{ flex: 1 }} 
              center={selectedPin ? { latitude: selectedPin.coords.lat, longitude: selectedPin.coords.lng } : { latitude: 12.8797, longitude: 121.7740 }}
              markers={mapMarkers}
            />
          )}
        </View>

        {/* Selected Hub Details */}
        {selectedPin && (
          <View style={[styles.card, { borderColor: getPriorityColor(selectedPin.score) }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>STRATEGIC HUD</Text>
                <Text style={styles.title}>{selectedPin.cityName}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedPin.score) }]}>
                <Text style={styles.priorityText}>PRIORITY {selectedPin.score}</Text>
              </View>
            </View>
            <Text style={styles.reasonText}>{selectedPin.reason}</Text>
            <Button 
              label={loading ? "Creating..." : "Convert to Relief Event"} 
              onPress={async () => {
                if (!selectedPin || !result) return;
                setLoading(true);
                try {
                  const { data: newEvent, error } = await supabase
                    .from("events")
                    .insert({
                      title: `Relief: ${selectedPin.cityName} (AI Priority ${selectedPin.score})`,
                      location: selectedPin.cityName,
                      description: `${selectedPin.reason}\n\nAI BUILD PLAN:\n${result.buildPlan}`,
                      status: "draft",
                      starts_at: new Date(Date.now() + 86400000).toISOString() // Default to tomorrow
                    })
                    .select()
                    .single();

                  if (error) throw error;
                  
                  showToast("Draft event created from AI plan.", "success");
                  router.push("/(admin)/events");
                } catch (err) {
                  console.error(err);
                  showToast("Failed to create relief event.", "error");
                } finally {
                  setLoading(false);
                }
              }} 
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {/* AI Build Plan */}
        <View style={styles.buildPlanContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#0f172a" }}>AI Relief Build Plan</Text>
          </View>
          {loading ? (
            <View style={{ padding: 20, gap: 8 }}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: "80%" }]} />
              <View style={[styles.skeletonLine, { width: "90%" }]} />
            </View>
          ) : (
            <Text style={styles.planText}>{result?.buildPlan || "No active hazards detected for the Philippines."}</Text>
          )}
        </View>

        {/* Disasters Feed */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textMuted, letterSpacing: 1 }}>
            ACTIVE HAZARDS DETECTED
          </Text>
          {result?.disasters.length === 0 && !loading ? (
            <Text style={{ color: "#64748b", fontStyle: "italic" }}>No major typhoons or floods currently reported by GDACS.</Text>
          ) : (
            result?.disasters.map((d, i) => (
              <View key={i} style={styles.disasterPill}>
                <Ionicons 
                  name={d.properties?.eventtype === "TC" ? "thunderstorm" : "water"} 
                  size={18} 
                  color="#1e293b" 
                />
                <Text style={styles.disasterName}>{d.properties?.eventname}</Text>
                <View style={styles.severityTag}>
                  <Text style={styles.severityText}>{d.properties?.severitydata?.severity || "Active"}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Button 
          label="Refresh Intelligence" 
          onPress={runAnalysis} 
          variant="secondary" 
          disabled={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 300,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#fff",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a"
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  priorityText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900"
  },
  reasonText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    marginTop: 12
  },
  buildPlanContainer: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  planText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    fontStyle: "italic"
  },
  disasterPill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12
  },
  disasterName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a"
  },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 6
  },
  severityText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase"
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    marginBottom: 8
  }
});
