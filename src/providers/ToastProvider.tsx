import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      dismissToast(id);
    }, 3200);
  }, [dismissToast]);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.viewport}>
        {toasts.map((toast) => (
          <Pressable
            key={toast.id}
            onPress={() => dismissToast(toast.id)}
            style={[styles.toast, toneStyles[toast.tone]]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </Pressable>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    gap: 10
  },
  toast: {
    borderRadius: theme.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    ...theme.shadow
  },
  toastText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: theme.colors.text
  }
});

const toneStyles = StyleSheet.create({
  success: {
    backgroundColor: theme.colors.successBg,
    borderColor: "#c3e3cc"
  },
  error: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: "#e9bec7"
  },
  info: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.cardBorder
  }
});
