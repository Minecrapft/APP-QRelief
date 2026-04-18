import { Pressable, Text, View } from "react-native";

import { theme } from "@/constants/theme";

interface ButtonProps {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: "primary" | "secondary";
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = "primary", accessibilityLabel }: ButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={() => void onPress()}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({
        minHeight: 56,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radii.md,
        backgroundColor: isPrimary ? theme.colors.primary : theme.colors.surfaceMuted,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: isPrimary ? theme.colors.primaryStrong : theme.colors.cardBorder,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.995 : 1 }],
        ...theme.shadow
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {isPrimary ? <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#d8ecfb" }} /> : null}
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            color: isPrimary ? theme.colors.textOnDark : theme.colors.text
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
