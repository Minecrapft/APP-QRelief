import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

interface LoadingStateProps {
  label?: string;
}

interface EmptyStateProps {
  title: string;
  message: string;
}

interface InlineMessageProps {
  tone?: "error" | "success" | "info";
  message: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonLineLarge} />
      <View style={styles.skeletonLineMedium} />
      <View style={styles.skeletonLineSmall} />
      <Text style={styles.helpText}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.helpText}>{message}</Text>
    </View>
  );
}

export function InlineMessage({ tone = "info", message }: InlineMessageProps) {
  return (
    <View style={[styles.card, toneStyles[tone]]}>
      <Text style={[styles.helpText, toneTextStyles[tone]]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surface
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    color: theme.colors.text
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMuted
  },
  skeletonLineLarge: {
    height: 14,
    width: "72%",
    borderRadius: 999,
    backgroundColor: "#dfe8f1"
  },
  skeletonLineMedium: {
    height: 14,
    width: "54%",
    borderRadius: 999,
    backgroundColor: "#e7eef6"
  },
  skeletonLineSmall: {
    height: 14,
    width: "36%",
    borderRadius: 999,
    backgroundColor: "#eef3f9"
  }
});

const toneStyles = StyleSheet.create({
  error: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: "#e9bec7"
  },
  success: {
    backgroundColor: theme.colors.successBg,
    borderColor: "#c3e3cc"
  },
  info: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.cardBorder
  }
});

const toneTextStyles = StyleSheet.create({
  error: {
    color: theme.colors.dangerText
  },
  success: {
    color: theme.colors.successText
  },
  info: {
    color: theme.colors.textMuted
  }
});
