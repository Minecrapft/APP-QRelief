import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { theme } from "@/constants/theme";
import { lookupBeneficiaryForEvent } from "@/features/staff/distribution";
import { useOperations } from "@/providers/OperationsProvider";
import { useToast } from "@/providers/ToastProvider";

export default function StaffScannerScreen() {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const initialEventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedEventId, setSelectedEventId] = useState(initialEventId ?? "");
  const [manualLookup, setManualLookup] = useState("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const { isOnline } = useOperations();
  const { showToast } = useToast();

  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId]);

  const hasPermission = useMemo(() => permission?.granted ?? false, [permission]);

  const handleLookup = async (lookupValue: string) => {
    if (!selectedEventId || !lookupValue.trim() || isBusy) {
      if (!selectedEventId) {
        setError("Open an assigned event first so the scan knows which operation to verify.");
      }
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const result = await lookupBeneficiaryForEvent(selectedEventId, lookupValue.trim());
      await Haptics.notificationAsync(
        result.already_claimed ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success,
      );

      if (soundEnabled) {
        console.info("QRelief scan feedback sound enabled");
      }

      router.push({
        pathname: "/(staff)/verify",
        params: {
          eventId: selectedEventId,
          lookup: lookupValue.trim(),
          beneficiaryId: result.beneficiary.id
        }
      });
    } catch (lookupError) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = lookupError instanceof Error ? lookupError.message : "Unable to verify this QR or manual lookup.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Screen
      title="Scan beneficiary QR"
      subtitle="Use the camera when possible, or fall back to manual lookup when a QR code is damaged or unreadable."
    >
      {!isOnline ? (
        <Panel tone="warning">
          <Text style={{ color: "#9a5b00", fontWeight: "700" }}>
            Offline mode is active. Cached beneficiary lookups can still work, and confirmed distributions will be queued for sync.
          </Text>
        </Panel>
      ) : null}

      <Input
        label="Selected event ID"
        value={selectedEventId}
        onChangeText={setSelectedEventId}
        placeholder="Paste the assigned event ID"
        autoCapitalize="none"
      />

      {!hasPermission ? (
        <View style={{ gap: 12, padding: 18, borderRadius: theme.radii.md, backgroundColor: theme.colors.warningBg, borderWidth: 1, borderColor: "#eed4a1" }}>
          <Text style={{ color: theme.colors.warningText, fontFamily: theme.fonts.body }}>
            Camera access is needed for live QR scanning. You can still use the manual lookup fallback below.
          </Text>
          <Button label="Allow camera" onPress={() => requestPermission().then(() => undefined)} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={{ overflow: "hidden", borderRadius: theme.radii.md, borderWidth: 2, borderColor: theme.colors.primary, backgroundColor: theme.colors.scannerFrame }}>
            <CameraView
              style={{ height: 320 }}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => void handleLookup(data)}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: theme.radii.sm, backgroundColor: theme.colors.panel }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="flashlight-on" size={18} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.ui }}>Torch</Text>
            </View>
            <Switch value={torchEnabled} onValueChange={setTorchEnabled} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, borderWidth: 1, borderColor: theme.colors.divider, borderRadius: theme.radii.sm, backgroundColor: theme.colors.panel }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="volume-up" size={18} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.ui }}>Success beep logging</Text>
            </View>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
          </View>
        </View>
      )}

      <Input
        label="Manual lookup"
        value={manualLookup}
        onChangeText={setManualLookup}
        placeholder="QR token, beneficiary ID, name, or contact number"
      />
      {error ? <Text style={{ color: theme.colors.dangerText, fontFamily: theme.fonts.ui }}>{error}</Text> : null}
      <Button
        label={isBusy ? "Looking up..." : "Lookup manually"}
        onPress={() => handleLookup(manualLookup)}
      />

      <Pressable
        onPress={() => router.push("/(staff)")}
        style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.ui }}>Back to assigned events</Text>
      </Pressable>
    </Screen>
  );
}
