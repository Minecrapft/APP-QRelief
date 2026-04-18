import { Pressable, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { AppRole } from "@/types/domain";

interface RoleOption {
  label: string;
  value: AppRole;
}

interface RoleSelectProps {
  label: string;
  value: AppRole;
  onChange: (role: AppRole) => void;
  options: RoleOption[];
}

export function RoleSelect({ label, value, onChange, options }: RoleSelectProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, fontFamily: theme.fonts.ui, color: theme.colors.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} role`}
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: theme.radii.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: selected ? theme.colors.primaryStrong : theme.colors.divider
              }}
            >
              <Text style={{ color: selected ? theme.colors.textOnDark : theme.colors.text, fontFamily: theme.fonts.ui }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
