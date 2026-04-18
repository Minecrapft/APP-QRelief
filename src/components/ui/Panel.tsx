import { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { theme } from "@/constants/theme";

interface PanelProps extends PropsWithChildren {
  tone?: "default" | "strong" | "success" | "warning";
  style?: ViewStyle;
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  tone?: "default" | "accent";
}

export function Panel({ children, tone = "default", style }: PanelProps) {
  return <View style={[styles.panel, panelToneStyles[tone], style]}>{children}</View>;
}

export function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, gap: 6 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function MetricCard({ label, value, tone = "default" }: MetricCardProps) {
  const accent = tone === "accent";

  return (
    <View style={[styles.metricCard, accent ? styles.metricCardAccent : null]}>
      <Text style={[styles.metricValue, accent ? styles.metricValueAccent : null]}>{value}</Text>
      <Text style={[styles.metricLabel, accent ? styles.metricLabelAccent : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 14,
    padding: 18,
    borderRadius: theme.radii.md,
    borderWidth: 1
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: theme.colors.accent
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: theme.colors.text
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMuted
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    gap: 6,
    padding: 16,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surface
  },
  metricCardAccent: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: "#274a70"
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: theme.colors.text
  },
  metricValueAccent: {
    color: theme.colors.textOnDark
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted
  },
  metricLabelAccent: {
    color: "#bed4e7"
  }
});

const panelToneStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.cardBorder
  },
  strong: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: "#274a70"
  },
  success: {
    backgroundColor: theme.colors.successBg,
    borderColor: "#c3e3cc"
  },
  warning: {
    backgroundColor: theme.colors.warningBg,
    borderColor: "#eed4a1"
  }
});
