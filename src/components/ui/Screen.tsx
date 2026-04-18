import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { theme } from "@/constants/theme";

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.gridLinesVertical} />
      <View style={styles.gridLinesHorizontal} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.topBarBadge}>
            <MaterialIcons name="verified-user" size={16} color={theme.colors.primary} />
            <Text style={styles.topBarBadgeText}>QRELIEF SIGNAL</Text>
          </View>
        </View>
        <View style={styles.heroCard}>
          <View style={styles.heroEyebrow}>
            <Text style={styles.heroEyebrowText}>Mission-Critical Relief Operations</Text>
          </View>
          <View style={styles.hero}>
            <View style={styles.titleRow}>
              <View style={styles.titleIconWrap}>
                <MaterialIcons name="grid-view" size={20} color={theme.colors.textOnDark} />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <View style={styles.cardRail} />
          <View style={styles.cardInner}>
            {children}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  gridLinesVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 28,
    width: 1,
    backgroundColor: "#d9e6f7"
  },
  gridLinesHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 104,
    height: 1,
    backgroundColor: "#deebfa"
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14
  },
  topBar: {
    minHeight: 30,
    justifyContent: "center"
  },
  topBarBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    minHeight: 28,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: "#bad0ef",
    backgroundColor: "#f8fbff"
  },
  topBarBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.ui,
    letterSpacing: 0.9,
    color: theme.colors.primary
  },
  heroCard: {
    borderRadius: theme.radii.lg,
    padding: 18,
    backgroundColor: theme.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: "#15448b",
    ...theme.shadow
  },
  heroEyebrow: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    minHeight: 24,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  heroEyebrowText: {
    fontSize: 10,
    fontFamily: theme.fonts.ui,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#d4e4ff"
  },
  hero: {
    gap: 10,
    paddingTop: 14
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  titleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)"
  },
  title: {
    fontSize: 32,
    lineHeight: 34,
    fontFamily: theme.fonts.heading,
    color: theme.colors.textOnDark
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: theme.fonts.body,
    color: "#d3e2ff"
  },
  card: {
    flexDirection: "row",
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadow
  },
  cardRail: {
    width: 6,
    borderTopLeftRadius: theme.radii.lg,
    borderBottomLeftRadius: theme.radii.lg,
    backgroundColor: theme.colors.primary
  },
  cardInner: {
    flex: 1,
    gap: 16,
    padding: 18
  },
});
