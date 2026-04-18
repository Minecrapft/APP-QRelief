import * as Brightness from "expo-brightness";
import { useEffect, useRef, useState } from "react";
import { Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
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
      <View style={{ alignItems: "center", gap: 16, padding: 20, borderRadius: 24, backgroundColor: "#ffffff" }}>
        {beneficiaryRecord?.qr_token ? (
          <>
            <QRCode value={beneficiaryRecord.qr_token} size={220} />
            <Text style={{ color: "#166534", textAlign: "center" }}>{beneficiaryRecord.qr_token}</Text>
          </>
        ) : (
          <Text style={{ color: "#92400e", textAlign: "center" }}>
            Your QR token will appear here after admin approval.
          </Text>
        )}
      </View>

      {message ? <Text style={{ color: "#166534" }}>{message}</Text> : null}
      <Button label="Share QR access" onPress={shareQrToken} />
    </Screen>
  );
}
