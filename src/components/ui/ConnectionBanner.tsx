import { StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { theme } from "@/constants/theme";
import { useOperations } from "@/providers/OperationsProvider";

export function ConnectionBanner() {
  const { isOnline, pendingQueueCount, syncStatus } = useOperations();

  if (isOnline && pendingQueueCount === 0 && syncStatus !== "failed") {
    return null;
  }

  const tone = !isOnline || syncStatus === "failed" ? styles.warning : styles.info;
  const message = !isOnline
    ? `Offline mode active. ${pendingQueueCount} queued distribution${pendingQueueCount === 1 ? "" : "s"} waiting to sync.`
    : syncStatus === "syncing"
      ? `Syncing ${pendingQueueCount} queued distribution${pendingQueueCount === 1 ? "" : "s"}...`
      : pendingQueueCount > 0
        ? `${pendingQueueCount} queued distribution${pendingQueueCount === 1 ? "" : "s"} ready to sync.`
        : "Some queued work still needs attention.";

  return (
    <View style={[styles.banner, tone]}>
      <View style={styles.row}>
        <MaterialIcons
          name={!isOnline ? "cloud-off" : syncStatus === "failed" ? "warning-amber" : "sync"}
          size={16}
          color={theme.colors.primary}
        />
        <Text style={styles.label}>{!isOnline ? "Offline" : syncStatus === "failed" ? "Sync Attention" : "Queue Status"}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 18,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1
  },
  info: {
    backgroundColor: "#edf5ff",
    borderColor: "#c8d7ec"
  },
  warning: {
    backgroundColor: theme.colors.warningBg,
    borderColor: "#eed4a1"
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.ui,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.text
  },
  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.body,
    color: theme.colors.textMuted
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  }
});
