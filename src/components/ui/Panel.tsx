import { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
  return (
    <View style={[styles.panel, panelToneStyles[tone], style]}>
      <View style={[styles.dockAccent, dockAccentStyles[tone]]} />
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, gap: 6 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ?? (
        <View style={styles.sectionBadge}>
          <MaterialIcons name="chevron-right" size={18} color={theme.colors.primary} />
        </View>
      )}
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
    flexDirection: "row",
    borderRadius: theme.radii.md,
    borderWidth: 1
  },
  dockAccent: {
    width: 6
  },
  panelBody: {
    flex: 1,
    gap: 14,
    padding: 16
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  sectionBadge: {
    width: 28,
    height: 28,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.divider
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: theme.fonts.ui,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.colors.accent
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: theme.fonts.headingStrong,
    color: theme.colors.text
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.body,
    color: theme.colors.textMuted
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    gap: 6,
    padding: 16,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.panel
  },
  metricCardAccent: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: "#1c56a7"
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: theme.fonts.heading,
    color: theme.colors.text
  },
  metricValueAccent: {
    color: theme.colors.textOnDark
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.ui,
    color: theme.colors.textMuted
  },
  metricLabelAccent: {
    color: "#d2e1ff"
  }
});

const panelToneStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.cardBorder
  },
  strong: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: "#1c56a7"
  },
  success: {
    backgroundColor: "#edf4ff",
    borderColor: "#bad2fb"
  },
  warning: {
    backgroundColor: theme.colors.warningBg,
    borderColor: "#eed4a1"
  }
});

const dockAccentStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.primary
  },
  strong: {
    backgroundColor: theme.colors.accent
  },
  success: {
    backgroundColor: theme.colors.primary
  },
  warning: {
    backgroundColor: theme.colors.accent
  }
});
