import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold
} from "@expo-google-fonts/inter";
import {
  PublicSans_700Bold,
  PublicSans_800ExtraBold
} from "@expo-google-fonts/public-sans";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { ConnectionBanner } from "@/components/ui/ConnectionBanner";
import { AuthProvider } from "@/providers/AuthProvider";
import { OperationsProvider } from "@/providers/OperationsProvider";
import { RootNavigation } from "@/providers/RootNavigation";
import { ToastProvider } from "@/providers/ToastProvider";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    PublicSans_700Bold,
    PublicSans_800ExtraBold
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <OperationsProvider>
            <RootNavigation>
              <StatusBar style="dark" />
              <ConnectionBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(beneficiary)" />
                <Stack.Screen name="(staff)" />
                <Stack.Screen name="(admin)" />
              </Stack>
            </RootNavigation>
          </OperationsProvider>
        </ToastProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
