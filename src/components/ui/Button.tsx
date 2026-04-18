import { Pressable, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
        borderRadius: theme.radii.sm,
        backgroundColor: isPrimary ? theme.colors.primary : theme.colors.surface,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: isPrimary ? theme.colors.primaryStrong : theme.colors.divider,
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        ...theme.shadow
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <MaterialIcons
          name={isPrimary ? "east" : "arrow-forward-ios"}
          size={isPrimary ? 18 : 14}
          color={isPrimary ? theme.colors.textOnDark : theme.colors.primary}
        />
        <Text
          style={{
            fontSize: 15,
            fontFamily: theme.fonts.ui,
            letterSpacing: 0.2,
            color: isPrimary ? theme.colors.textOnDark : theme.colors.text
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
