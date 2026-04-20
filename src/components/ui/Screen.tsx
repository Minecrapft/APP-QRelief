import { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Screen({ title, subtitle, action, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }} />
          {action ? <View>{action}</View> : null}
        </View>
        <View style={styles.heroCard}>
          <View style={styles.heroEyebrow}>
            <Text style={styles.heroEyebrowText}>QRelief Operations Suite</Text>
          </View>
          <View style={styles.hero}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.card}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  backgroundOrbPrimary: {
    position: "absolute",
    top: -120,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#d8e7f6"
  },
  backgroundOrbSecondary: {
    position: "absolute",
    top: 90,
    left: -90,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "#f8e8d2"
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 18
  },
  topRow: {
    minHeight: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  heroCard: {
    borderRadius: theme.radii.lg,
    padding: 22,
    backgroundColor: theme.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: "#274a70",
    ...theme.shadow
  },
  heroEyebrow: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    minHeight: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)"
  },
  heroEyebrowText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#bcd5ea"
  },
  hero: {
    gap: 10,
    paddingTop: 16
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "800",
    color: theme.colors.textOnDark
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#c6d9eb"
  },
  card: {
    gap: 16,
    padding: 18,
    borderRadius: theme.radii.lg,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadow
  }
});
