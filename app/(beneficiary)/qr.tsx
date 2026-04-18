import * as Brightness from "expo-brightness";
import { useEffect, useRef, useState } from "react";
import { Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { Panel, SectionHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { theme } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

export default function BeneficiaryQrScreen() {
  const { beneficiaryRecord } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const previousBrightness = useRef<number | null>(null);

  useEffect(() => {
    const enableBrightness = async () => {
      try {
        previousBrightness.current = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch {
        setMessage("Brightness boost is unavailable on this device.");
      }
    };

    void enableBrightness();

    return () => {
      if (previousBrightness.current !== null) {
        void Brightness.setBrightnessAsync(previousBrightness.current);
      }
    };
  }, []);

  const shareQrToken = async () => {
    if (!beneficiaryRecord?.qr_token) {
      return;
    }

    try {
      await Share.share({
        message: `QRelief beneficiary QR token: ${beneficiaryRecord.qr_token}`
      });
      setMessage("QR token shared.");
    } catch {
      setMessage("Unable to open the share sheet right now.");
    }
  };

  return (
    <Screen
      title="My QR code"
      subtitle="Show this full-screen code during distribution. Screen brightness is boosted while this page is open."
    >
      <Panel tone="strong">
        <SectionHeader
          eyebrow="Tactical QR"
          title="Present this code at the distribution point"
          subtitle="Brightness is boosted automatically to improve outdoor scanning."
        />
      </Panel>

      <View style={{ alignItems: "center", gap: 16, padding: 20, borderRadius: theme.radii.md, backgroundColor: "#ffffff", borderWidth: 1, borderColor: theme.colors.divider }}>
        {beneficiaryRecord?.qr_token ? (
          <>
            <View style={{ padding: 16, borderRadius: theme.radii.sm, borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: "#fff" }}>
              <QRCode value={beneficiaryRecord.qr_token} size={220} />
            </View>
            <Text style={{ color: theme.colors.text, textAlign: "center", fontFamily: theme.fonts.mono }}>{beneficiaryRecord.qr_token}</Text>
          </>
        ) : (
          <Text style={{ color: theme.colors.warningText, textAlign: "center", fontFamily: theme.fonts.body }}>
            Your QR token will appear here after admin approval.
          </Text>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: theme.radii.sm, backgroundColor: theme.colors.accentMuted, borderWidth: 1, borderColor: "#ffd4ad" }}>
        <MaterialIcons name="wb-sunny" size={18} color={theme.colors.accent} />
        <Text style={{ color: theme.colors.warningText, flex: 1, fontFamily: theme.fonts.body }}>
          Brightness boost tip: face the screen directly toward the scanner in bright outdoor light.
        </Text>
      </View>

      {message ? <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.ui }}>{message}</Text> : null}
      <Button label="Share QR access" onPress={shareQrToken} />
    </Screen>
  );
}
