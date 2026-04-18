import { Text, TextInput, TextInputProps, View } from "react-native";

import { theme } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, multiline, style, ...props }: InputProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, fontFamily: theme.fonts.ui, color: theme.colors.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.inputBorder,
          borderRadius: theme.radii.sm,
          backgroundColor: theme.colors.inputBg,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 6 : 0
        }}
      >
        <TextInput
          {...props}
          multiline={multiline}
          style={[
            {
              minHeight: multiline ? 96 : 54,
              color: theme.colors.text,
              fontSize: 15,
              fontFamily: theme.fonts.body
            },
            style
          ]}
          placeholderTextColor="#8ba0b7"
        />
      </View>
    </View>
  );
}
