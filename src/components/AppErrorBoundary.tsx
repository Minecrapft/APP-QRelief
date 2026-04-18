import { Component, ErrorInfo, PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    hasError: false
  };

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("QRelief application error", error, errorInfo);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Recovery Mode</Text>
          <Text style={styles.title}>Something went wrong in the app.</Text>
          <Text style={styles.body}>
            QRelief caught the failure instead of crashing completely. Try reloading this area and continue your work.
          </Text>
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: theme.colors.background
  },
  card: {
    width: "100%",
    gap: 12,
    padding: 22,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadow
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.accent
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: theme.colors.text
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textMuted
  },
  button: {
    marginTop: 6,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.textOnDark
  }
});
