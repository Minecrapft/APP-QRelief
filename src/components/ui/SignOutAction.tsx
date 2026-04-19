import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { theme } from "@/constants/theme";

interface SignOutActionProps {
  onConfirm: () => void | Promise<void>;
}

export function SignOutAction({ onConfirm }: SignOutActionProps) {
  const confirmSignOut = () => {
    Alert.alert(
      "Log out?",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: () => void onConfirm()
        }
      ]
    );
  };

  return (
    <Pressable
      onPress={confirmSignOut}
      accessibilityRole="button"
      accessibilityLabel="Log out"
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Text style={styles.label}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: "rgba(255,255,255,0.96)",
    shadowColor: "#0f2742",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  pressed: {
    opacity: 0.88
  },
  label: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  }
});
