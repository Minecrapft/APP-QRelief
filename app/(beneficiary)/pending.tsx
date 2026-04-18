import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useAuth } from "@/providers/AuthProvider";

export default function PendingApprovalScreen() {
  const { beneficiaryRecord, signOut, refreshProfile } = useAuth();
  const isRejected = beneficiaryRecord?.status === "rejected";
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void (async () => {
        try {
          setRefreshing(true);
          await refreshProfile();
        } finally {
          if (isActive) {
            setRefreshing(false);
          }
        }
      })();

      return () => {
        isActive = false;
      };
    }, [refreshProfile])
  );

  return (
    <Screen
      title={isRejected ? "Registration needs updates" : "Approval pending"}
      subtitle={
        isRejected
          ? "Your registration was reviewed and needs changes before QR access can be issued."
          : "Your QRelief registration is waiting for review before QR access is issued."
      }
    >
      <View
        style={{
          gap: 12,
          padding: 18,
          borderRadius: 18,
          backgroundColor: isRejected ? "#fff1f2" : "#fff7ed"
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#9a3412" }}>
          Status: {beneficiaryRecord?.status ?? "pending"}
        </Text>
        <Text style={{ color: "#7c2d12" }}>
          {isRejected
            ? "Please review the note below, update your details with an administrator, and submit again when ready."
            : "An administrator will verify your details and issue your QR token once approved."}
        </Text>
        {beneficiaryRecord?.rejection_reason ? (
          <Text style={{ color: "#7c2d12" }}>
            Last review note: {beneficiaryRecord.rejection_reason}
          </Text>
        ) : null}
      </View>

      <Button
        label={refreshing ? "Refreshing status..." : "Refresh approval status"}
        onPress={refreshProfile}
      />
      <Button label="Sign out" onPress={signOut} variant="secondary" />
    </Screen>
  );
}
